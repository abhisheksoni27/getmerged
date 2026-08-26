package prsim

import (
	"context"
	"time"

	"github.com/valkey-io/valkey-go"
)

// TryDedupLock takes the SETNX lock on a payload hash (AC8). A nil error
// means this caller owns the lock; ErrLocked means another submission with
// the identical payload is computing right now.
var ErrLocked = context.Canceled

func TryDedupLock(ctx context.Context, vk valkey.Client, payloadHash string) error {
	if vk == nil {
		return nil
	}
	resp := vk.Do(ctx, vk.B().Set().Key("prsim:lock:"+payloadHash).Value("1").Nx().Ex(DedupLockTTL).Build())
	if resp.Error() != nil {
		return ErrLocked
	}
	return nil
}

// AwaitDuplicate polls for a completed duplicate result until DedupWait
// (AC8); ok=false means the caller should compute its own.
func AwaitDuplicate(ctx context.Context, store *Store, payloadHash string) (*submissionRow, bool) {
	deadline := time.Now().Add(DedupWait)
	for {
		row, err := store.CompletedByHash(ctx, payloadHash)
		if err == nil && row != nil {
			return row, true
		}
		if time.Now().After(deadline) || ctx.Err() != nil {
			return nil, false
		}
		select {
		case <-ctx.Done():
			return nil, false
		case <-time.After(250 * time.Millisecond):
		}
	}
}
