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
	Permanent bool
	Err       error
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

// smtpCodeRe extracts "550-" / "550 " style reply codes from net/smtp errors.
var smtpCodeRe = regexp.MustCompile(`(?:^|\s)(\d{3})(?:\s|-)`)

// classifySendError maps raw transport/SMTP failures to SendError. 5xx codes
// other than transient 552 (storage) are permanent; everything else retries.
func classifySendError(err error) error {
	if err == nil {
		return nil
	}
	for _, m := range smtpCodeRe.FindAllStringSubmatch(err.Error(), -1) {
		switch m[1] {
		case "552", "554":
			// Mailbox full / greylisting-style: retryable.
			continue
		default:
			if strings.HasPrefix(m[1], "5") {
				return &SendError{Permanent: true, Err: fmt.Errorf("%w: %s", ErrHardBounce, err)}
			}
		}
	}
	return &SendError{Permanent: false, Err: err}
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
func (m *SMTPMailer) Send(_ context.Context, to, subject, textBody, htmlBody string) error {
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
		"",
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
