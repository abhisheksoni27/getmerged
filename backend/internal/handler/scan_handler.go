package handler

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"io"
	"log/slog"
	"net/http"
	"strings"

	"github.com/abhisheksoni27/opendoor/internal/scan"
	"github.com/gin-gonic/gin"
)

// StartScanBody is the POST /api/v1/scan request body.
type StartScanBody struct {
	URL   string `json:"url"`
	Repo  string `json:"repo"`
	Force bool   `json:"force"`
}

// StartScanHandler validates a pasted GitHub URL (SSRF-guarded, AC1) and
// starts/joins an on-demand C-Rank scoring job (AC2, AC3, AC4).
//
//	@Summary      Start an on-demand C-Rank scan for any public GitHub repo
//	@Tags         scan
//	@Accept       json
//	@Produce      json
//	@Param        body  body      StartScanBody  true  "Repository URL or owner/repo"
//	@Success      200   {object}  map[string]any
//	@Failure      400   {object}  map[string]string
//	@Router       /scan [post]
func StartScanHandler(svc *scan.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if svc == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "on-demand scanning is unavailable"})
			return
		}
		var body StartScanBody
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": scan.ErrInvalidInput.Error()})
			return
		}
		input := body.URL
		if strings.TrimSpace(input) == "" {
			input = body.Repo
		}
		owner, name, err := scan.ParseRepoInput(input)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": scan.ErrInvalidInput.Error()})
			return
		}

		st, err := svc.Start(c.Request.Context(), owner, name, body.Force)
		if err != nil {
			if errors.Is(err, scan.ErrInvalidInput) {
				c.JSON(http.StatusBadRequest, gin.H{"error": scan.ErrInvalidInput.Error()})
				return
			}
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, st)
	}
}

// GetScanStatusHandler is the polling endpoint used by the progress UI (AC6).
//
//	@Summary      Poll on-demand scan progress
//	@Tags         scan
//	@Produce      json
//	@Param        owner  path      string  true  "Repository owner"
//	@Param        name   path      string  true  "Repository name"
//	@Success      200    {object}  map[string]any
//	@Router       /scan/status/{owner}/{name} [get]
func GetScanStatusHandler(svc *scan.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		if svc == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "on-demand scanning is unavailable"})
			return
		}
		owner, name, err := scan.ParseRepoInput(c.Param("owner") + "/" + c.Param("name"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": scan.ErrInvalidInput.Error()})
			return
		}
		c.JSON(http.StatusOK, svc.Status(c.Request.Context(), owner, name))
	}
}

// GithubPushWebhookHandler invalidates the cached verdict and triggers an async
// re-score on a signature-verified push event (AC5).
func GithubPushWebhookHandler(svc *scan.Service, secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if svc == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "on-demand scanning is unavailable"})
			return
		}
		if secret == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "webhook secret not configured"})
			return
		}
		payload, err := io.ReadAll(io.LimitReader(c.Request.Body, 2<<20))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "failed to read payload"})
			return
		}
		if !validScanWebhookSignature(payload, c.GetHeader("X-Hub-Signature-256"), secret) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid webhook signature"})
			return
		}
		event := c.GetHeader("X-GitHub-Event")
		if event != "push" {
			c.JSON(http.StatusOK, gin.H{"status": "ignored", "event": event})
			return
		}
		var body struct {
			Repository struct {
				FullName string `json:"full_name"`
			} `json:"repository"`
		}
		if err := json.Unmarshal(payload, &body); err != nil || body.Repository.FullName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "missing repository.full_name"})
			return
		}
		owner, name, err := scan.ParseRepoInput(body.Repository.FullName)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": scan.ErrInvalidInput.Error()})
			return
		}
		svc.Invalidate(c.Request.Context(), owner, name)
		slog.Info("scan: push webhook invalidated verdict", "repo", owner+"/"+name)
		c.JSON(http.StatusOK, gin.H{"status": "rescoring", "repo": owner + "/" + name})
	}
}

func validScanWebhookSignature(payload []byte, headerSig, secret string) bool {
	const prefix = "sha256="
	if headerSig == "" || secret == "" || !strings.HasPrefix(headerSig, prefix) {
		return false
	}
	received, err := hex.DecodeString(strings.TrimPrefix(headerSig, prefix))
	if err != nil {
		return false
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	return hmac.Equal(received, mac.Sum(nil))
}

// GetScanOGCardHandler renders the auto-generated 1200x630 verdict share card
// (AC7). Unscored/never-scanned repos get a neutral "scan running" card rather
// than a 404 so social unfurls never break.
func GetScanOGCardHandler(svc *scan.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		owner, name, err := scan.ParseRepoInput(c.Param("owner") + "/" + c.Param("name"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": scan.ErrInvalidInput.Error()})
			return
		}
		var v *scan.Verdict
		if svc != nil {
			if st := svc.Status(c.Request.Context(), owner, name); st != nil {
				v = st.Verdict
			}
		}
		c.Header("Cache-Control", "public, max-age=3600")
		c.Data(http.StatusOK, "image/png", renderScanCardPNG(owner+"/"+name, v))
	}
}

func renderScanCardPNG(fullName string, v *scan.Verdict) []byte {
	const w, h = 1200, 630
	bg := color.RGBA{0x22, 0x28, 0x31, 0xff}
	panel := color.RGBA{0x2c, 0x33, 0x3e, 0xff}
	white := color.RGBA{0xfd, 0xfb, 0xf7, 0xff}
	grey := color.RGBA{0x9c, 0xa3, 0xaf, 0xff}
	lightGrey := color.RGBA{0xd4, 0xd4, 0xd8, 0xff}
	emerald := color.RGBA{0x10, 0xb9, 0x81, 0xff}
	amber := color.RGBA{0xf5, 0x9e, 0x0b, 0xff}

	img := image.NewRGBA(image.Rect(0, 0, w, h))
	draw.Draw(img, img.Bounds(), &image.Uniform{bg}, image.Point{}, draw.Src)
	draw.Draw(img, image.Rect(0, 0, w, 10), &image.Uniform{emerald}, image.Point{}, draw.Src)

	drawScaledText(img, "GETMERGED - INSTANT C-RANK VERDICT", 64, 60, 2, emerald)
	drawScaledText(img, truncateRunes(fullName, 34), 64, 112, 7, white)

	tier := "?"
	headline := "Scan in progress - full C-Rank verdict in seconds"
	tierColor := amber
	if v != nil && v.Tier != "" {
		tier = v.Tier
		headline = v.Headline
		if tier == "S" || tier == "A" {
			tierColor = emerald
		}
	}

	badgeX, badgeY := 64, 250
	draw.Draw(img, image.Rect(badgeX, badgeY, badgeX+200, badgeY+200), &image.Uniform{panel}, image.Point{}, draw.Src)
	drawScaledText(img, tier, badgeX+64, badgeY+40, 14, tierColor)
	drawScaledText(img, "C-RANK TIER", badgeX+30, badgeY+165, 2, grey)

	drawScaledText(img, truncateRunes(headline, 46), 300, badgeY+40, 3, white)
	if v != nil {
		drawScaledText(img, truncateRunes(scanCardStat(v), 52), 300, badgeY+120, 2, lightGrey)
	}

	drawScaledText(img, "Verify any repo before you PR -> getmerged.abhishekco.de", 64, 552, 2, grey)

	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return buf.Bytes()
}

func scanCardStat(v *scan.Verdict) string {
	stat := fmt.Sprintf("C-Rank %d/100", int(v.Score+0.5))
	if v.PRsAnalyzed > 0 {
		stat += fmt.Sprintf(" - %d PRs analysed (180d)", v.PRsAnalyzed)
	}
	if v.Language != "" {
		stat += " - " + v.Language
	}
	return stat
}
