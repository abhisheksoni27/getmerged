package db

import (
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/tursodatabase/libsql-client-go/libsql"
	_ "modernc.org/sqlite"
)

// Connect opens a database connection.
// DATABASE_URL starting with "libsql://" or "https://" → uses Turso (prod).
// Anything else → treated as a local SQLite file path (dev).
func Connect(url string) (*sqlx.DB, error) {
	driver, dsn := resolveDriver(url)
	db, err := sqlx.Connect(driver, dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	return db, nil
}

func resolveDriver(url string) (driver, dsn string) {
	if strings.HasPrefix(url, "libsql://") || strings.HasPrefix(url, "https://") {
		return "libsql", url
	}
	// Local SQLite file — modernc sqlite driver expects a plain path
	return "sqlite", url
}
