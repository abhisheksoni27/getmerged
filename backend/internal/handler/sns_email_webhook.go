package handler

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/notification"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
)

// snsEnvelope is the Amazon SNS message JSON body delivered to the webhook
// endpoint (AC5). Bounce/complaint notifications are only trusted after the
// x-amz-sns Signature verifies against the SigningCertURL certificate.
type snsEnvelope struct {
	Type             string `json:"Type"`
	MessageId        string `json:"MessageId"`
	TopicArn         string `json:"TopicArn"`
	Subject          string `json:"Subject"`
	Message          string `json:"Message"`
	Timestamp        string `json:"Timestamp"`
	Token            string `json:"Token"`
	SubscribeURL     string `json:"SubscribeURL"`
	SignatureVersion string `json:"SignatureVersion"`
	Signature        string `json:"Signature"`
	SigningCertURL   string `json:"SigningCertURL"`
}

// sesEvent is the SES bounce/complaint payload carried inside Message.
type sesEvent struct {
	NotificationType string `json:"notificationType"`
	Mail             struct {
		Destination []string `json:"destination"`
	} `json:"mail"`
	Bounce *struct {
		BounceType        string `json:"bounceType"`
		BouncedRecipients []struct {
			EmailAddress string `json:"emailAddress"`
		} `json:"bouncedRecipients"`
	} `json:"bounce"`
	Complaint *struct {
		ComplaintRecipients []struct {
			EmailAddress string `json:"emailAddress"`
		} `json:"complaintRecipients"`
	} `json:"complaint"`
}

var (
	snsCertMu    sync.Mutex
	snsCertCache = map[string]snsCachedCert{}
)

const snsCertCacheTTL = 24 * time.Hour

type snsCachedCert struct {
	cert      x509.Certificate
	fetchedAt time.Time
}

// SNSEmailWebhookHandler handles POST /api/v1/webhooks/sns-email-events (AC5):
// SES bounces/complaints forwarded via SNS. The x-amz-sns SignatureVersion 1
// signature is verified (cert fetch + RSA-SHA256 over the canonical string)
// BEFORE anything touches the suppression list; subscription confirmation
// URLs are visited to activate the topic.
func SNSEmailWebhookHandler(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		db := middleware.MustDB(c)
		if db == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "db unavailable"})
			return
		}
		raw, err := io.ReadAll(io.LimitReader(c.Request.Body, 1<<20))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "unreadable body"})
			return
		}
		var env snsEnvelope
		if err := json.Unmarshal(raw, &env); err != nil || env.Type == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
			return
		}
		if env.SignatureVersion != "1" || env.Signature == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unsupported signature version"})
			return
		}
		canonical, ok := snsCanonicalString(&env)
		if !ok {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message type"})
			return
		}
		cert, err := fetchSNSSigningCert(env.SigningCertURL)
		if err != nil {
			slog.Warn("sns-webhook: cert fetch failed", "err", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "signature verification failed"})
			return
		}
		sig, err := base64.StdEncoding.DecodeString(env.Signature)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature encoding"})
			return
		}
		digest := sha256.Sum256([]byte(canonical))
		pub, pubOK := cert.PublicKey.(*rsa.PublicKey)
		if !pubOK || rsa.VerifyPKCS1v15(pub, crypto.SHA256, digest[:], sig) != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
			return
		}

		switch env.Type {
		case "SubscriptionConfirmation", "UnsubscribeConfirmation":
			if env.SubscribeURL != "" && strings.HasPrefix(env.SubscribeURL, "https://") {
				go func(u string) {
					ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
					defer cancel()
					req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
					if err != nil {
						return
					}
					resp, err := http.DefaultClient.Do(req)
					if err == nil {
						_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 4096))
						_ = resp.Body.Close()
					}
				}(env.SubscribeURL)
			}
			c.JSON(http.StatusOK, gin.H{"status": "confirmed"})
			return
		case "Notification":
			var ev sesEvent
			if err := json.Unmarshal([]byte(env.Message), &ev); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid message"})
				return
			}
			applySESEvent(c.Request.Context(), db, &ev)
			c.JSON(http.StatusOK, gin.H{"status": "ok"})
			return
		default:
			c.JSON(http.StatusOK, gin.H{"status": "ignored"})
		}
	}
}

// applySESEvent records every affected recipient on the suppression list and
// updates bounce counters. Hard = Permanent bounce or any complaint.
func applySESEvent(ctx context.Context, db *sqlx.DB, ev *sesEvent) {
	switch {
	case ev.Bounce != nil:
		hard := strings.EqualFold(ev.Bounce.BounceType, "Permanent")
		for _, r := range ev.Bounce.BouncedRecipients {
			email := strings.TrimSpace(r.EmailAddress)
			if email == "" {
				continue
			}
			if _, err := notification.ApplyGFIEmailBounce(ctx, db, email, hard); err != nil {
				slog.Error("sns-webhook: bounce apply failed", "email", email, "err", err)
				continue
			}
			if hard {
				if err := notification.RecordEmailSuppression(ctx, db, email, "hard_bounce", "ses_sns"); err != nil {
					slog.Error("sns-webhook: suppression write failed", "email", email, "err", err)
				}
			}
		}
	case ev.Complaint != nil:
		for _, r := range ev.Complaint.ComplaintRecipients {
			email := strings.TrimSpace(r.EmailAddress)
			if email == "" {
				continue
			}
			if _, err := notification.ApplyGFIEmailBounce(ctx, db, email, true); err != nil {
				slog.Error("sns-webhook: complaint apply failed", "email", email, "err", err)
				continue
			}
			if err := notification.RecordEmailSuppression(ctx, db, email, "complaint", "ses_sns"); err != nil {
				slog.Error("sns-webhook: suppression write failed", "email", email, "err", err)
			}
		}
	}
}

// snsCanonicalString builds the SNS SignatureVersion 1 string-to-sign per the
// AWS docs field ordering for each message type.
func snsCanonicalString(env *snsEnvelope) (string, bool) {
	var b strings.Builder
	b.WriteString("Message\n")
	b.WriteString(env.Message)
	b.WriteString("\nMessageId\n")
	b.WriteString(env.MessageId)
	b.WriteString("\n")
	switch env.Type {
	case "Notification":
		if env.Subject != "" {
			b.WriteString("Subject\n")
			b.WriteString(env.Subject)
			b.WriteString("\n")
		}
	case "SubscriptionConfirmation", "UnsubscribeConfirmation":
		b.WriteString("SubscribeURL\n")
		b.WriteString(env.SubscribeURL)
		b.WriteString("\nTimestamp\n")
		b.WriteString(env.Timestamp)
		b.WriteString("\nToken\n")
		b.WriteString(env.Token)
		b.WriteString("\n")
	default:
		return "", false
	}
	b.WriteString("TopicArn\n")
	b.WriteString(env.TopicArn)
	b.WriteString("\nType\n")
	b.WriteString(env.Type)
	b.WriteString("\n")
	return b.String(), true
}

func fetchSNSSigningCert(certURL string) (*x509.Certificate, error) {
	u, err := url.Parse(certURL)
	if err != nil || u.Scheme != "https" || !strings.HasSuffix(strings.ToLower(u.Host), ".amazonaws.com") {
		return nil, err
	}

	snsCertMu.Lock()
	if hit, ok := snsCerts()[certURL]; ok && time.Since(hit.fetchedAt) < snsCertCacheTTL {
		snsCertMu.Unlock()
		cert := hit.cert
		return &cert, nil
	}
	snsCertMu.Unlock()

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(certURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, err
	}
	pemBytes, err := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	if err != nil {
		return nil, err
	}
	block, _ := pem.Decode(pemBytes)
	if block == nil {
		return nil, err
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, err
	}

	snsCertMu.Lock()
	snsCertCache[certURL] = snsCachedCert{cert: *cert, fetchedAt: time.Now().UTC()}
	snsCertMu.Unlock()
	return cert, nil
}

func snsCerts() map[string]snsCachedCert { return snsCertCache }
