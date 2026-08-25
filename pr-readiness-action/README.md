# opendoor/pr-readiness-action

Plug-and-play GitHub Action that posts a **PR Readiness & C-Rank™ pre-flight
report** on every pull request: merge-odds score (0–100 + grade A–F) from the
OpenDoor telemetry engine, plus an automated submission-guidelines compliance
audit. Every report links to the repo's full Opendoor telemetry page.

Advisory by default — never blocks contributor CI.

## Quick start

`.github/workflows/pr-readiness.yml`:

```yaml
name: PR Readiness Check

on:
  pull_request:

permissions:
  pull-requests: write
  contents: read

concurrency:
  group: pr-readiness-${{ github.event.pull_request.number }}
  cancel-in-progress: true

jobs:
  readiness:
    runs-on: ubuntu-latest
    steps:
      - uses: opendoor/pr-readiness-action@v1
        with:
          api-key: ${{ secrets.OPENDOOR_API_KEY }}   # optional
          # score-threshold: '70'                    # default 70
          # gate: 'false'                            # default: advisory only
```

> The `permissions` block is required for posting comments; `concurrency` keeps
> one run per PR so comment updates stay last-writer-wins and idempotent.
> Running multiple instances on one PR? Give each a distinct `instance-id`.

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `api-key` | no | – | OpenDoor API key (PREFLIGHT_TOKEN). Without it, guidelines still run locally and C-Rank renders as **N/A — API key unavailable**. |
| `score-threshold` | no | `70` | Minimum C-Rank to pass when gating. Only applies when `api-key` is provided. |
| `gate` | no | `false` | `true` → exit 1 when C-Rank < threshold. Default advisory: always exit 0 after posting. |
| `instance-id` | no | `default` | Marker namespace for multi-instance runs on one PR. |
| `api-url` | no | `https://getmerged.abhishekco.de` | OpenDoor forecast API base URL. |
| `app-url` | no | `https://opendoor.abhishekco.de` | OpenDoor app base URL for telemetry links. |
| `github-token` | no | `${{ github.token }}` | Token for reading PR metadata and posting the comment. |

## Outputs

`c-rank`, `grade`, `verdict` (`pass` / `fail` / `advisory`), `comment-url`.

## Behavior & failure semantics

- **Comment strategy:** lists existing issue comments via REST (paginated,
  single pass), then creates or updates the one comment carrying the marker
  `<!-- opendoor-pr-readiness:v1:<instance-id> -->`. No Search API.
- **Fork PRs / read-only token:** if the comment write is denied (403), the
  full report is written to `$GITHUB_STEP_SUMMARY` and the run exits 0.
- **PR closed/deleted mid-run:** 404/422 on comment POST/PATCH → info log,
  exit 0.
- **Bad OpenDoor credentials:** 401/403 from the telemetry API → loud failure
  with an actionable message.
- **Size cap:** comment body is hard-capped at 60 KB with a "…view full
  report" link retained in every posted comment.
