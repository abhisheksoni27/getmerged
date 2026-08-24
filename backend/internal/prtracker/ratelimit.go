package prtracker

import (
	"context"
	"sync"

	"golang.org/x/time/rate"
)

const (
	// HourlyBudgetPerUser caps every authenticated user well under GitHub's
	// documented 5000 req/hr REST ceiling (AC2): 4500/hr leaves headroom.
	HourlyBudgetPerUser = 4500
	// burstPerUser allows a single page-load/cron sync to proceed promptly
	// while the sustained refill rate enforces the hourly budget.
	burstPerUser = 50
)

// UserBuckets is an in-process per-user token bucket enforcing the
// ≤4500 requests/hour GitHub REST budget (AC2). Tokens refill continuously
// at HourlyBudgetPerUser/hour.
type UserBuckets struct {
	mu      sync.Mutex
	buckets map[int64]*rate.Limiter
}

func NewUserBuckets() *UserBuckets {
	return &UserBuckets{buckets: map[int64]*rate.Limiter{}}
}

func (u *UserBuckets) limiter(userID int64) *rate.Limiter {
	u.mu.Lock()
	defer u.mu.Unlock()
	l, ok := u.buckets[userID]
	if !ok {
		l = rate.NewLimiter(rate.Limit(float64(HourlyBudgetPerUser)/3600.0), burstPerUser)
		u.buckets[userID] = l
	}
	return l
}

// Wait blocks until a request token is available for this user or ctx is done.
func (u *UserBuckets) Wait(ctx context.Context, userID int64) error {
	if u == nil {
		return nil
	}
	return u.limiter(userID).Wait(ctx)
}
