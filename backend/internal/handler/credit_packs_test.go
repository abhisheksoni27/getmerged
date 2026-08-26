package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/config"
	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/handler"
	"github.com/abhisheksoni27/opendoor/internal/middleware"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/gin-gonic/gin"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func newPackStatusRouter(t *testing.T) (*gin.Engine, repository.EntitlementRepository) {
	t.Helper()
	database, err := sqlx.Open("sqlite", "file:packstatus?mode=memory&cache=shared")
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
	entRepo := repository.NewEntitlementRepository(database)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	stubAuth := func(id int64) gin.HandlerFunc {
		return func(c *gin.Context) { c.Set(middleware.UserIDKey, id); c.Next() }
	}
	cfg := &config.Config{} // no DodoPayments key: checkout falls back to hosted URL
	r.POST("/credits/pack-checkout", stubAuth(42), handler.CreatePackCheckoutHandler(cfg, entRepo))
	r.GET("/credits/pack-status", stubAuth(42), handler.PackStatusHandler(cfg, entRepo))
	return r, entRepo
}

func TestCreatePackCheckoutFallsBackAndStoresOrder(t *testing.T) {
	r, _ := newPackStatusRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/credits/pack-checkout", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d: %s", w.Code, w.Body.String())
	}
	var resp struct {
		OrderID     string `json:"order_id"`
		CheckoutURL string `json:"checkout_url"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid response json: %v", err)
	}
	if resp.OrderID == "" || resp.CheckoutURL == "" {
		t.Fatalf("expected order_id and checkout_url, got %+v", resp)
	}
}

func TestPackStatusRequiresOwnership(t *testing.T) {
	r, _ := newPackStatusRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/credits/pack-checkout", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	var created struct {
		OrderID string `json:"order_id"`
	}
	_ = json.Unmarshal(w.Body.Bytes(), &created)

	// Unknown order -> 404.
	req = httptest.NewRequest(http.MethodGet, "/credits/pack-status?orderId=nope", nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for unknown order, got %d", w.Code)
	}

	// Owner sees pending before payment settles.
	req = httptest.NewRequest(http.MethodGet, "/credits/pack-status?orderId="+created.OrderID, nil)
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	if w.Code != http.StatusOK || w.Body.String() == "" || !contains(w.Body.String(), `"pending"`) {
		t.Fatalf("expected pending for owner pre-payment, got %d %s", w.Code, w.Body.String())
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && (haystack == needle || len(needle) == 0 ||
		indexOf(haystack, needle) >= 0)
}

func indexOf(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}
