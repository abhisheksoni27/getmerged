package notification

import (
	"context"
	"fmt"
	"net"
	"net/smtp"
	"strings"
	"time"
)

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
	return smtp.SendMail(addr, auth, m.From, []string{to}, []byte(msg))
}
