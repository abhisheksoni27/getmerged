package handler

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/prtracker"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
)

const (
	staleThreshold    = 30 * time.Minute // AC2: data older than 30min flagged stale
	dashboardPageSize = prtracker.MaxTrackedPRs
)

// BenchmarkLine mirrors the repo's published pr-likelihood medians (AC3).
// Nil pointers render as '—' on the frontend; the whole field is nil when the
// repo has insufficient telemetry.
type BenchmarkLine struct {
	ResponseP50Hours       *float64 `json:"response_p50_hours"`
	ResponseP90Hours       *float64 `json:"response_p90_hours"`
	MedianTimeToMergeHours *float64 `json:"median_time_to_merge_hours"`
}

type prItem struct {
	*prtracker.TrackedPR
	AgeHours       float64              `json:"age_hours"`
	Stale          bool                 `json:"stale"`
	Benchmark      *BenchmarkLine       `json:"benchmark"`
	Forecast       *prtracker.Forecast  `json:"forecast,omitempty"`
	ForecastLocked bool                 `json:"forecast_locked"`
	Outcome        *prtracker.EvalOutcome `json:"outcome,omitempty"` // verified verdict (AC1/AC2)
}

// GetUserPRsHandler handles GET /api/v1/user/prs.
// Optional ?refresh=1 triggers a live GitHub sync subject to the 5-minute
// per-user throttle; otherwise newest stored snapshots are served (AC2).
// Lists open PRs to C+-ranked repos only, newest 50 (AC1). Acceptance forecasts
// are included only for Pro users; free users get forecast_locked=true for the
// existing Dodo checkout upsell (AC4).
func GetUserPRsHandler(svc *prtracker.Service, entRepo repository.EntitlementRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		ctx := c.Request.Context()

		conn, err := svc.Store.GetConnection(ctx, userID)
		if err != nil {
			slog.Error("user/prs: load connection failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load PR tracker state"})
			return
		}
		if conn == nil {
			username := c.GetString(middleware.UsernameKey)
			if err := svc.Store.SetConnection(ctx, userID, username, prtracker.ConnectionActive, false, ""); err != nil {
				slog.Error("user/prs: enroll failed", "err", err)
			}
			if _, serr := svc.SyncUserThrottled(ctx, userID, username); serr != nil {
				slog.Warn("user/prs: initial sync failed", "user_id", userID, "err", serr)
			}
		} else if c.Query("refresh") == "1" {
			if _, serr := svc.SyncUserThrottled(ctx, userID, conn.GithubLogin); serr != nil {
				slog.Warn("user/prs: refresh sync failed", "user_id", userID, "err", serr)
			}
		}

		prs, err := svc.Store.ListLatestForUser(ctx, userID, dashboardPageSize)
		if err != nil {
			slog.Error("user/prs: list failed", "err", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list tracked pull requests"})
			return
		}

		// Reload connection: sync may have flipped status to reconnect_required (AC6).
		conn, _ = svc.Store.GetConnection(ctx, userID)
		reconnect := conn != nil && conn.Status == prtracker.ConnectionReconnectRequired
		limited := conn != nil && conn.LastLimited

		isPro := false
		if entRepo != nil {
			if ent, err := entRepo.GetEntitlement(ctx, userID); err == nil && ent != nil {
				isPro = ent.IsPro
			}
		}

		now := time.Now().UTC()
		// Verified verdicts for saved evaluations (AC1/AC2): keyed "repo#number",
		// rendered by dashboard cards from the same field set as share pages/OG.
		outcomes, oerr := svc.Store.OutcomesForUserPRs(ctx, userID)
		if oerr != nil {
			slog.Warn("user/prs: load eval outcomes failed", "err", oerr)
			outcomes = nil
		}
		items := make([]prItem, 0, len(prs))
		for i := range prs {
			p := &prs[i]
			item := prItem{TrackedPR: p, Stale: now.Sub(p.FetchedAt) > staleThreshold}
			if p.PRCreatedAt != nil {
				item.AgeHours = now.Sub(*p.PRCreatedAt).Hours()
			}
			if p.ResponseP50H != nil || p.ResponseP90H != nil || p.MergeMedianH != nil {
				item.Benchmark = &BenchmarkLine{
					ResponseP50Hours:       p.ResponseP50H,
					ResponseP90Hours:       p.ResponseP90H,
					MedianTimeToMergeHours: p.MergeMedianH,
				}
			} // else stays nil -> frontend renders '—' without error (AC3)
			if isPro {
				item.Forecast = prtracker.ComputeForecast(item.AgeHours, p.State, p.ResponseP50H, p.ResponseP90H)
			} else {
				item.ForecastLocked = true
			}
			if outcomes != nil {
				if o, ok := outcomes[p.PRID]; ok {
					oc := o
					item.Outcome = &oc
				}
			}
			items = append(items, item)
		}

		c.JSON(http.StatusOK, gin.H{
			"prs":             items,
			"generated_at":    now,
			"stale_after_min": int(staleThreshold.Minutes()),
			"connection": gin.H{
				"status":         map[bool]string{true: prtracker.ConnectionReconnectRequired, false: prtracker.ConnectionActive}[reconnect],
				"github_login":   loginOf(conn),
				"last_synced_at": syncedAt(conn),
				"limited":        limited,
			},
			"is_pro": isPro,
		})
	}
}

// GetPRConnectionHandler handles GET /api/v1/user/prs/connection (AC6 banner state).
func GetPRConnectionHandler(svc *prtracker.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		conn, err := svc.Store.GetConnection(c.Request.Context(), userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load connection"})
			return
		}
		status, login := prtracker.ConnectionActive, ""
		var lastSynced *time.Time
		if conn != nil {
			status, login, lastSynced = conn.Status, conn.GithubLogin, conn.LastSyncedAt
		}
		c.JSON(http.StatusOK, gin.H{
			"status":         status,
			"github_login":   login,
			"last_synced_at": lastSynced,
			"limited":        conn != nil && conn.LastLimited,
		})
	}
}

// ReconnectPRConnectionHandler handles POST /api/v1/user/prs/reconnect.
// Validates the stored token; success flips the connection back to active (AC6).
func ReconnectPRConnectionHandler(svc *prtracker.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetInt64(middleware.UserIDKey)
		conn, _ := svc.Store.GetConnection(c.Request.Context(), userID)
		login := ""
		if conn != nil {
			login = conn.GithubLogin
		}
		token, err := svc.Tokens.GetValidGithubToken(c.Request.Context(), userID)
		if err != nil || token == "" {
			_ = svc.Store.SetConnection(c.Request.Context(), userID, login, prtracker.ConnectionReconnectRequired, false, "token refresh failed")
			c.JSON(http.StatusConflict, gin.H{
				"error":  "github reconnect required",
				"action": "re-authenticate via /api/v1/auth/github",
			})
			return
		}
		_ = svc.Store.SetConnection(c.Request.Context(), userID, login, prtracker.ConnectionActive, false, "")
		c.JSON(http.StatusOK, gin.H{"status": prtracker.ConnectionActive})
	}
}

func loginOf(conn *prtracker.Connection) string {
	if conn == nil {
		return ""
	}
	return conn.GithubLogin
}

func syncedAt(conn *prtracker.Connection) *time.Time {
	if conn == nil {
		return nil
	}
	return conn.LastSyncedAt
}
