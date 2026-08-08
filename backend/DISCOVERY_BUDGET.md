# DISCOVERY BUDGET

How repo discovery spends GitHub GraphQL points, and why it stays far under the 5,000 pts/hr ceiling.

## Mechanism

`processDiscoveryBatch` (worker.go) runs on its own ticker — separate from the 1s queue crawl. Each run:

1. Picks one `(language, star bucket)` pair round-robin from `SeedLanguages` × `DiscoveryStarBuckets` (20 × 6).
2. Runs `DiscoverNewRepos` (discovery.go 72) against GitHub search:

   ```
   language:{lang} stars:{min}..{max} pushed:>={window} sort:updated-desc
   ```

3. Pages through results (`FetchCustomQueryReposPage`, `first:100`) using a persisted cursor in `discovery_cursors`, up to `maxPages=2`.
4. Drops repos already in `repositories` (idempotent), keeps up to `DISCOVERY_MAX_NEW_PER_RUN` (default 10).
5. Persists `after` cursor so the next sweep resumes deep in the result set instead of replaying the trending top.

## Cost per sweep

GitHub GraphQL charges points ≈ `unique connections / 100`, minimum 1. A search call is a single top-level connection with `first:100`:

| Call | Points |
|---|---|
| search page (1st) | 1 |
| search page (2nd, resume) | 1 |
| **total per sweep** | **≤ 2** |

Run cadence is `DISCOVERY_INTERVAL_MINUTES` (default 15, so 4 sweeps/hr):

```
4 sweeps/hr × 2 points  = 8 points/hr  for search
```

That is ~0.2% of the 5,000 pt/hr budget — the search itself is a rounding error.

## The real consumer: scoring new repos

Discovery's real cost is what it *triggers*. Every newly discovered repo gets scored via the same `scoreAndSaveRepo` path as the main crawl (full repo + PRs + issues queries). At the defaults:

```
DISCOVERY_MAX_NEW_PER_RUN = 10  → 10 new repos/sweep
4 sweeps/hr                    → 40 newly scored projects/hr
```

Each score is a handful of GraphQL points, and it runs under the *same* shared 14-worker rate limiter the interactive crawl uses — so it self-throttles, never bursts.

## Budget guardrails already in effect

- `maxPages=2` caps search spend per sweep.
- Dedup against `repositories` stops re-scoring known repos.
- Persisted cursor advances the sweep point; only a rollover of the 3-day push window restarts from the top.
- The existing client-level rate limiter and `RATE_LIMIT` handling (client.go 683) pause all workers, discovery included, until `resetAt`.

## Keep-under assumptions

| Setting | Default | Cost impact |
|---|---|---|
| `DISCOVERY_INTERVAL_MINUTES` | 15 | sweep frequency |
| `DISCOVERY_MAX_NEW_PER_RUN` | 10 | repos scored per sweep |
| star buckets | 50 → 1,000,000 | result-set breadth per query |

Raise interval or lower `MAX_NEW_PER_RUN` to cut spend; neither will break the 5,000-pt ceiling at these defaults.