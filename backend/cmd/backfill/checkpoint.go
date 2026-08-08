package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"time"
)

type Checkpoint struct {
	LastRepoID       string    `json:"last_repo_id"`
	LastRepoFullName string    `json:"last_repo_full_name"`
	ReposProcessed   int       `json:"repos_processed"`
	PRsInserted      int       `json:"prs_inserted"`
	CommentsInserted int       `json:"comments_inserted"`
	RequestsUsed     int       `json:"requests_used"`
	StartedAt        time.Time `json:"started_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

func LoadCheckpoint(path string) (*Checkpoint, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Checkpoint{StartedAt: time.Now().UTC()}, nil
		}
		return nil, err
	}
	var cp Checkpoint
	if err := json.Unmarshal(data, &cp); err != nil {
		return nil, err
	}
	return &cp, nil
}

func (c *Checkpoint) Save(path string) error {
	c.UpdatedAt = time.Now().UTC()
	dir := filepath.Dir(path)
	if dir != "" && dir != "." {
		_ = os.MkdirAll(dir, 0755)
	}
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, data, 0644)
}
