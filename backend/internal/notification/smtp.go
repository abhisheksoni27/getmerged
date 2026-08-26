package notification

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/mail"
	"net/smtp"
	"regexp"
	"strings"
	"time"
)

// ErrHardBounce marks a permanent delivery failure: hard bounce or invalid
// recipient address (AC8). Watchers flagged this way are suppressed until
// they re-verify through the unsubscribe/resubscribe flow.
var ErrHardBounce = errors.New("hard bounce")

// SendError carries SMTP failure classification.
type SendError struct {
	Permanent   bool
	RateLimited bool
	// RetryAfter is the provider-advised pause (AC5: a 429 honors it for
	// scheduling while still counting the attempt).
	RetryAfter time.Duration
	Err        error
}

func (e *SendError) Error() string { return e.Err.Error() }
func (e *SendError) Unwrap() error { return e.Err }

// NewHardBounceError builds a permanent send failure.
func NewHardBounceError(msg string) error {
	return &SendError{Permanent: true, Err: fmt.Errorf("%w: %s", ErrHardBounce, msg)}
}

// IsHardBounce reports whether err is a permanent provider rejection.
func IsHardBounce(err error) bool {
	if err == nil {
		return false
	}
	var se *SendError
	if errors.As(err, &se) {
		return se.Permanent
	}
	return false
}

// IsRateLimited reports whether err is a provider throttle (AC6): the queue
// pauses and resumes with backoff instead of burning send attempts.
func IsRateLimited(err error) bool {
	if err == nil {
		return false
	}
	var se *SendError
	return errors.As(err, &se) && se.RateLimited
}

// retryAfterRe extracts "retry-after: 30" style hints from provider errors.
var retryAfterRe = regexp.MustCompile(`(?i)retry[-_ ]?after\D{0,4}(\d+)`)

// RetryAfterFrom returns the provider-advised retry pause carried by err,
// or 0 when absent.
func RetryAfterFrom(err error) time.Duration {
	var se *SendError
	if !errors.As(err, &se) {
		return 0
	}
	if se.RetryAfter > 0 || se.Err == nil {
		return se.RetryAfter
	}
	if m := retryAfterRe.FindStringSubmatch(se.Err.Error()); m != nil {
		var secs int
		if _, perr := fmt.Sscanf(m[1], "%d", &secs); perr == nil && secs > 0 {
			return time.Duration(secs) * time.Second
		}
	}
	return 0
}

// smtpRateLimitCodes are transient throttle replies that pause the queue.
var smtpRateLimitCodes = map[string]bool{"421": true, "429": true, "450": true, "451": true, "452": true}

// smtpCodeRe extracts "550-" / "550 " style reply codes from net/smtp errors.
var smtpCodeRe = regexp.MustCompile(`(?:^|\s)(\d{3})(?:\s|-)`)

// classifySendError maps raw transport/SMTP failures to SendError. 5xx codes
// other than transient 552 (storage) are permanent; 421/429/45x throttles set
// RateLimited; everything else retries as a soft failure.
func classifySendError(err error) error {
	if err == nil {
		return nil
	}
	rateLimited := false
	retryAfter := time.Duration(0)
	for _, m := range smtpCodeRe.FindAllStringSubmatch(err.Error(), -1) {
		switch m[1] {
		case "552", "554":
			// Mailbox full / greylisting-style: retryable.
			continue
		default:
			if smtpRateLimitCodes[m[1]] {
				rateLimited = true
				continue
			}
			if strings.HasPrefix(m[1], "5") {
				return &SendError{Permanent: true, Err: fmt.Errorf("%w: %s", ErrHardBounce, err)}
			}
		}
	}
	if rateLimited {
		if m := retryAfterRe.FindStringSubmatch(err.Error()); m != nil {
			var secs int
			if _, perr := fmt.Sscanf(m[1], "%d", &secs); perr == nil && secs > 0 {
				retryAfter = time.Duration(secs) * time.Second
			}
		}
	}
	return &SendError{RateLimited: rateLimited, RetryAfter: retryAfter, Permanent: false, Err: err}
}

// SMTPMailer delivers email via SMTP (email-only channel for digests).
type SMTPMailer struct {
	Host     string
	Port     string
	User     string
	Password string
	From     string
}

// NewSMTPMailer initializes an SMTPMailer instance.
func NewSMTPMailer(host, port, user, password, from string) *SMTPMailer {
	return &SMTPMailer{Host: host, Port: port, User: user, Password: password, From: from}
}

// IsConfigured reports whether SMTP delivery can be attempted.
func (m *SMTPMailer) IsConfigured() bool {
	return m != nil && m.Host != "" && m.From != ""
}

// Send delivers a multipart/alternative (text + HTML) email message.
func (m *SMTPMailer) Send(ctx context.Context, to, subject, textBody, htmlBody string) error {
	return m.SendWithHeaders(ctx, to, subject, textBody, htmlBody, nil)
}

// SendWithHeaders delivers like Send but injects extra RFC 5322 headers
// (AC1: List-Unsubscribe + List-Unsubscribe-Post for one-click opt-out).
func (m *SMTPMailer) SendWithHeaders(_ context.Context, to, subject, textBody, htmlBody string, headers map[string]string) error {
	if !m.IsConfigured() {
		return fmt.Errorf("smtp not configured")
	}
	// Invalid recipient address syntax is a permanent failure (AC8).
	if _, err := mail.ParseAddress(to); err != nil {
		return NewHardBounceError(fmt.Sprintf("invalid recipient address %q", to))
	}

	boundary := fmt.Sprintf("opendoor-%d", time.Now().UnixNano())
	msg := strings.Join([]string{
		"From: " + m.From,
		"To: " + to,
		"Subject: " + subject,
		"MIME-Version: 1.0",
		fmt.Sprintf(`Content-Type: multipart/alternative; boundary="%s"`, boundary),
	}, "\r\n")
	for k, v := range headers {
		k = strings.TrimSpace(k)
		v = strings.TrimSpace(v)
		if k == "" || v == "" || strings.ContainsAny(k, ": \r\n") || strings.ContainsAny(v, "\r\n") {
			continue // never inject header-splitting content
		}
		msg += "\r\n" + k + ": " + v
	}
	msg += "\r\n\r\n" + strings.Join([]string{
		"--" + boundary,
		"Content-Type: text/plain; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		textBody,
		"--" + boundary,
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
		"",
		htmlBody,
		"--" + boundary + "--",
		"",
	}, "\r\n")

	addr := net.JoinHostPort(m.Host, m.Port)
	var auth smtp.Auth
	if m.User != "" {
		auth = smtp.PlainAuth("", m.User, m.Password, m.Host)
	}
	return classifySendError(smtp.SendMail(addr, auth, m.From, []string{to}, []byte(msg)))
}
