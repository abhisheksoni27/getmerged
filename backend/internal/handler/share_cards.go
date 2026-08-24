package handler

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

// Share-card constants: unguessable 128-bit IDs, 90-day eval lifecycle,
// 24h CDN cache with purge-on-revoke.
const (
	cardIDBytes       = 16 // 128-bit => 32 hex chars (>= 28 char AC requirement)
	cardTTL           = 90 * 24 * time.Hour
	cardCacheTTL      = int64(86400) // 86400s (24h)
	refTokenPrefix    = "cd."
	refTokenSecretKDF = "card-ref:"
)

var cardIDPattern = regexp.MustCompile(`^[0-9a-f]{32}$`)

func generateCardID() (string, error) {
	buf := make([]byte, cardIDBytes)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

// SignReferralToken builds a signed, expiring referral token ("cd.<payload>.<sig>")
// crediting the card creator on signup. Tokens stay under the 64-char ref cap so
// they flow through the existing ?ref= capture -> OAuth cookie pipeline.
func SignReferralToken(secret string, creatorID int64, expiresAt time.Time) string {
	payload := fmt.Sprintf("%d:%d", creatorID, expiresAt.Unix())
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(refTokenSecretKDF + payload))
	sig := hex.EncodeToString(mac.Sum(nil))[:20]
	return refTokenPrefix + base64.RawURLEncoding.EncodeToString([]byte(payload)) + "." + sig
}

// VerifyReferralToken validates a signed card referral token and returns the creator user ID.
func VerifyReferralToken(secret, token string) (int64, bool) {
	if !strings.HasPrefix(token, refTokenPrefix) {
		return 0, false
	}
	parts := strings.SplitN(strings.TrimPrefix(token, refTokenPrefix), ".", 2)
	if len(parts) != 2 {
		return 0, false
	}
	payloadRaw, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return 0, false
	}
	payload := string(payloadRaw)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(refTokenSecretKDF + payload))
	expected := hex.EncodeToString(mac.Sum(nil))[:20]
	if !hmac.Equal([]byte(expected), []byte(parts[1])) {
		return 0, false
	}
	idx := strings.LastIndex(payload, ":")
	if idx <= 0 {
		return 0, false
	}
	creatorID, err1 := strconv.ParseInt(payload[:idx], 10, 64)
	expUnix, err2 := strconv.ParseInt(payload[idx+1:], 10, 64)
	if err1 != nil || err2 != nil || creatorID <= 0 || time.Now().Unix() > expUnix {
		return 0, false
	}
	return creatorID, true
}

// ResolveReferralAttribution resolves an opendoor_ref cookie value to a referrer:
// either a plain high-entropy referral code or a signed share-card token.
func ResolveReferralAttribution(ctx context.Context, entRepo repository.EntitlementRepository, secret, ref string) (int64, bool, error) {
	if strings.HasPrefix(ref, refTokenPrefix) {
		uid, ok := VerifyReferralToken(secret, ref)
		return uid, ok, nil
	}
	if entRepo == nil {
		return 0, false, nil
	}
	return entRepo.FindUserIDByReferralCode(ctx, ref)
}

type createShareCardRequest struct {
	RepoFullName string  `json:"repo_full_name" binding:"required"`
	PRTitle      string  `json:"pr_title"`
	Summary      string  `json:"summary"`
	OverallScore float64 `json:"overall_score"`
	ReadyToMerge bool    `json:"ready_to_merge"`
	Consent      bool    `json:"consent"`
}

// CreateShareCardHandler handles POST /api/v1/preflight/share (authenticated).
// Publishing requires the explicit consent flag from the "Share result" click (AC4).
func CreateShareCardHandler(cardRepo repository.ShareCardRepository, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		userID := userIDVal.(int64)

		var req createShareCardRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid share request payload"})
			return
		}
		if !req.Consent {
			c.JSON(http.StatusBadRequest, gin.H{"error": "explicit consent is required to publish a public result card"})
			return
		}
		repoName := truncateRunes(strings.TrimSpace(req.RepoFullName), 255)
		if repoName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "repo_full_name is required"})
			return
		}

		id, err := generateCardID()
		if err != nil {
			slog.Error("share card: id generation failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create share card"})
			return
		}

		score := req.OverallScore
		if score < 0 {
			score = 0
		} else if score > 100 {
			score = 100
		}
		expiresAt := time.Now().UTC().Add(cardTTL)

		card := &repository.ShareCard{
			ID:           id,
			UserID:       userID,
			RepoFullName: repoName,
			PRTitle:      strPtr(truncateRunes(strings.TrimSpace(req.PRTitle), 200)),
			Summary:      strPtr(truncateRunes(strings.TrimSpace(req.Summary), 300)),
			OverallScore: score,
			ReadyToMerge: req.ReadyToMerge,
			RefToken:     SignReferralToken(jwtSecret, userID, expiresAt),
			ConsentGiven: true,
			CreatedAt:    time.Now().UTC(),
			ExpiresAt:    expiresAt,
		}
		// Eval rerun lifecycle: supersede any live card for the same user+repo (AC2).
		if err := cardRepo.Create(c.Request.Context(), card, true); err != nil {
			slog.Error("share card: persist failed", "user_id", userID, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create share card"})
			return
		}

		c.JSON(http.StatusCreated, gin.H{
			"card_id":       card.ID,
			"share_url":     "/c/" + card.ID,
			"og_image_url":  "/api/v1/cards/" + card.ID + "/og.png",
			"expires_at":    card.ExpiresAt,
		})
	}
}

// lookupShareCard resolves a card ID enforcing eval lifecycle semantics:
// unknown => nil/404, revoked or expired => revoked/expired flag (410).
func lookupShareCard(c *gin.Context, cardRepo repository.ShareCardRepository) (*repository.ShareCard, bool) {
	id := strings.ToLower(c.Param("id"))
	if !cardIDPattern.MatchString(id) {
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return nil, false
	}
	card, err := cardRepo.GetByID(c.Request.Context(), id)
	if err != nil {
		slog.Error("share card: lookup failed", "id", id, "err", err)
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load card"})
		return nil, false
	}
	if card == nil {
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
		return nil, false
	}
	if card.RevokedAt != nil {
		purgeCardCache(c, id)
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusGone, gin.H{"error": "this result card has been revoked"})
		return nil, false
	}
	if time.Now().After(card.ExpiresAt) {
		c.Header("Cache-Control", "no-store")
		c.JSON(http.StatusGone, gin.H{"error": "this result card has expired"})
		return nil, false
	}
	return card, true
}

// GetShareCardHandler handles GET /api/v1/cards/:id — public, no auth required (AC1).
// Rate limited 60 req/min/IP; cached 24h in Valkey and purged on revoke (AC2).
func GetShareCardHandler(cardRepo repository.ShareCardRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		cacheKey := "apicache:card:" + c.Param("id")
		vk := middleware.MustCache(c)
		if vk != nil {
			if cached, err := vk.Do(c.Request.Context(), vk.B().Get().Key(cacheKey).Build()).ToString(); err == nil && cached != "" {
				c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", cardCacheTTL, cardCacheTTL))
				c.Data(http.StatusOK, "application/json", []byte(cached))
				return
			}
		}

		card, ok := lookupShareCard(c, cardRepo)
		if !ok {
			return
		}

		c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", cardCacheTTL, cardCacheTTL))
		body, err := json.Marshal(cardPublicPayload(card))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to encode card"})
			return
		}

		if vk != nil {
			_ = vk.Do(c.Request.Context(), vk.B().Setex().Key(cacheKey).Seconds(cardCacheTTL).Value(string(body)).Build())
		}
		c.Data(http.StatusOK, "application/json", body)
	}
}

func cardPublicPayload(card *repository.ShareCard) gin.H {
	return gin.H{
		"id":             card.ID,
		"repo_full_name": card.RepoFullName,
		"pr_title":       card.PRTitle,
		"summary":        card.Summary,
		"overall_score":  card.OverallScore,
		"ready_to_merge": card.ReadyToMerge,
		"ref_token":      card.RefToken,
		"created_at":     card.CreatedAt,
		"expires_at":     card.ExpiresAt,
	}
}

// GetShareCardOGHandler handles GET /api/v1/cards/:id/og.png — public 1200x630 PNG (<5MB).
func GetShareCardOGHandler(cardRepo repository.ShareCardRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		cacheKey := "apicache:cardog:" + c.Param("id")
		vk := middleware.MustCache(c)
		if vk != nil {
			if b64, err := vk.Do(c.Request.Context(), vk.B().Get().Key(cacheKey).Build()).ToString(); err == nil && b64 != "" {
				if png, derr := base64.StdEncoding.DecodeString(b64); derr == nil {
					c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", cardCacheTTL, cardCacheTTL))
					c.Data(http.StatusOK, "image/png", png)
					return
				}
			}
		}

		card, ok := lookupShareCard(c, cardRepo)
		if !ok {
			return
		}

		png := renderShareCardPNG(card)
		c.Header("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", cardCacheTTL, cardCacheTTL))
		if vk != nil {
			_ = vk.Do(c.Request.Context(), vk.B().Setex().Key(cacheKey).Seconds(cardCacheTTL).Value(base64.StdEncoding.EncodeToString(png)).Build())
		}
		c.Data(http.StatusOK, "image/png", png)
	}
}

// ListShareCardsHandler handles GET /api/v1/user/share-cards (settings view).
func ListShareCardsHandler(cardRepo repository.ShareCardRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		cards, err := cardRepo.ListByUser(c.Request.Context(), userIDVal.(int64))
		if err != nil {
			slog.Error("share card: list failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load share cards"})
			return
		}
		items := make([]gin.H, 0, len(cards))
		for i := range cards {
			card := &cards[i]
			items = append(items, gin.H{
				"card_id":        card.ID,
				"share_url":      "/c/" + card.ID,
				"repo_full_name": card.RepoFullName,
				"pr_title":       card.PRTitle,
				"overall_score":  card.OverallScore,
				"ready_to_merge": card.ReadyToMerge,
				"created_at":     card.CreatedAt,
				"expires_at":     card.ExpiresAt,
			})
		}
		c.JSON(http.StatusOK, gin.H{"cards": items})
	}
}

// RevokeShareCardHandler handles DELETE /api/v1/user/share-cards/:id — creator
// revocation from settings; purges the 24h cache immediately (AC2/AC3).
func RevokeShareCardHandler(cardRepo repository.ShareCardRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userIDVal, exists := c.Get(middleware.UserIDKey)
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthenticated"})
			return
		}
		id := strings.ToLower(c.Param("id"))
		if !cardIDPattern.MatchString(id) {
			c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
			return
		}
		revoked, err := cardRepo.Revoke(c.Request.Context(), userIDVal.(int64), id)
		if err != nil {
			slog.Error("share card: revoke failed", "id", id, "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke share card"})
			return
		}
		if !revoked {
			c.JSON(http.StatusNotFound, gin.H{"error": "card not found"})
			return
		}
		purgeCardCache(c, id)
		c.Status(http.StatusNoContent)
	}
}

// purgeCardCache best-effort deletes the Valkey entries backing a card.
func purgeCardCache(c *gin.Context, id string) {
	vk := middleware.MustCache(c)
	if vk == nil {
		return
	}
	ctx := c.Request.Context()
	_ = vk.Do(ctx, vk.B().Del().Key("apicache:card:"+id).Build())
	_ = vk.Do(ctx, vk.B().Del().Key("apicache:cardog:"+id).Build())
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func truncateRunes(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n])
}
