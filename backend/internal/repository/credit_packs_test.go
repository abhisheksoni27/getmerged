package repository_test

import (
	"context"
	"sync"
	"testing"

	"github.com/abhisheksoni27/opendoor/internal/db"
	"github.com/abhisheksoni27/opendoor/internal/repository"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func openPackTestDB(t *testing.T, dsn string) *sqlx.DB {
	t.Helper()
	database, err := sqlx.Open("sqlite", dsn)
	if err != nil {
		t.Fatalf("failed to open memory db: %v", err)
	}
	t.Cleanup(func() { database.Close() })
	if err := db.AutoMigrate(database); err != nil {
		t.Fatalf("failed to auto migrate: %v", err)
	}
	return database
}

// AC6 race: parallel grant attempts for the SAME purchase ID must produce
// exactly one credit (DB-level dedupe via credit_packs unique purchase_id).
func TestGrantCreditPackParallelDuplicates(t *testing.T) {
	database := openPackTestDB(t, "file:packrace?mode=memory&cache=shared")
	database.SetMaxOpenConns(1) // serialize writers; still exercises SQL-level dedupe
	repo := repository.NewEntitlementRepository(database)
	ctx := context.Background()

	var wg sync.WaitGroup
	for i := 0; i < 16; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if err := repo.GrantCreditPack(ctx, 7, "pay_race_1", repository.CreditPackSKU, repository.CreditPackCredits); err != nil {
				t.Errorf("grant failed: %v", err)
			}
		}()
	}
	wg.Wait()

	ent, err := repo.GetEntitlement(ctx, 7)
	if err != nil {
		t.Fatalf("failed to load entitlement: %v", err)
	}
	if ent.BonusEvals != repository.CreditPackCredits {
		t.Fatalf("expected exactly %d bonus evals after parallel duplicate grants, got %d",
			repository.CreditPackCredits, ent.BonusEvals)
	}
}

// AC5 sanity cap: packs stack but grants stop at MaxCreditPacksPerUser.
func TestGrantCreditPackSanityCap(t *testing.T) {
	repo := repository.NewEntitlementRepository(openPackTestDB(t, "file:packcap?mode=memory&cache=shared"))
	ctx := context.Background()

	for i := 0; i < repository.MaxCreditPacksPerUser+2; i++ {
		purchaseID := "pay_cap_" + string(rune('a'+i))
		if err := repo.GrantCreditPack(ctx, 8, purchaseID, repository.CreditPackSKU, repository.CreditPackCredits); err != nil {
			t.Fatalf("grant %d failed: %v", i, err)
		}
	}

	ent, err := repo.GetEntitlement(ctx, 8)
	if err != nil {
		t.Fatalf("failed to load entitlement: %v", err)
	}
	want := repository.MaxCreditPacksPerUser * repository.CreditPackCredits
	if ent.BonusEvals != want {
		t.Fatalf("expected capped %d bonus evals, got %d", want, ent.BonusEvals)
	}
}

// AC5 consumption order: monthly free quota is exhausted first; pack credits
// extend the allowance only afterwards and never expire within the month.
func TestCreditPackConsumptionOrder(t *testing.T) {
	repo := repository.NewEntitlementRepository(openPackTestDB(t, "file:porder?mode=memory&cache=shared"))
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		ok, err := repo.DeductQuota(ctx, 9)
		if err != nil || !ok {
			t.Fatalf("free eval %d should succeed before packs, ok=%v err=%v", i+1, ok, err)
		}
	}

	// Free quota gone and no pack yet -> blocked.
	if ok, _ := repo.DeductQuota(ctx, 9); ok {
		t.Fatalf("4th eval must be blocked before pack purchase")
	}

	if err := repo.GrantCreditPack(ctx, 9, "pay_order_1", repository.CreditPackSKU, repository.CreditPackCredits); err != nil {
		t.Fatalf("pack grant failed: %v", err)
	}

	// Pack extends allowance by exactly its credits.
	for i := 0; i < repository.CreditPackCredits; i++ {
		ok, err := repo.DeductQuota(ctx, 9)
		if err != nil || !ok {
			t.Fatalf("pack eval %d should succeed, ok=%v err=%v", i+1, ok, err)
		}
	}
	if ok, _ := repo.DeductQuota(ctx, 9); ok {
		t.Fatalf("eval beyond free quota + pack must be blocked")
	}

	ent, err := repo.GetEntitlement(ctx, 9)
	if err != nil {
		t.Fatalf("failed to load entitlement: %v", err)
	}
	if ent.MonthlyEvalCount != 3+repository.CreditPackCredits || ent.BonusEvals != repository.CreditPackCredits {
		t.Fatalf("unexpected state: count=%d bonus=%d", ent.MonthlyEvalCount, ent.BonusEvals)
	}
}
