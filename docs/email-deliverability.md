# Email Deliverability: DKIM / SPF / DMARC & Warm-up Schedule

Applies to all outbound mail from the GFI alert pipeline (`gfi-alerts/*`,
`/internal/jobs/gfi-digest`) and watchlist digests. Sending domain:
`abhishekco.de` (envelope-from + From header, `SMTP_FROM`).

## Gate before first production send (AC6)

Do not enable production sends until every check below passes:

1. **SPF** — DNS TXT record on `abhishekco.de` authorizing the sending
   provider's IPs/envelope domain. Verify: `dig TXT abhishekco.de`.
   Keep a single SPF record, `~all` soft-fail during warm-up.
2. **DKIM** — 2048-bit selector published per provider instructions
   (e.g. `smtp._domainkey.abhishekco.de` TXT). Verify the signature by
   sending to a seed mailbox and checking `Authentication-Results`, or use
   the provider's "verified" badge in its dashboard.
3. **DMARC** — DNS TXT `_dmarc.abhishekco.de`:
   `v=DMARC1; p=none; rua=mailto:dmarc@abhishekco.de; adkim=s; aspf=s`
   for warm-up; tighten to `p=quarantine` after 30 clean days,
   `p=reject` after 60.
4. **Verification record** — append the verified date + selector to this
   file (table below) before flipping `SMTP_HOST` into production config.

| Check | Record location | Verified on |
|-------|-----------------|-------------|
| SPF   | `abhishekco.de` TXT | _(pending)_ |
| DKIM  | `smtp._domainkey.abhishekco.de` | _(pending)_ |
| DMARC | `_dmarc.abhishekco.de` | _(pending)_ |

## Domain / IP warm-up schedule

New (or long-idle) sending identity — ramp volume gradually so provider
reputation builds without throttling:

| Phase | Days | Max emails/day | Notes |
|-------|------|----------------|-------|
| 0 | day 0 | 50 | Seed addresses only; confirm inbox placement (not spam) |
| 1 | 1–5   | 200 | Real subscribers, monitor bounce rate < 2% |
| 2 | 6–14  | 1,000 | Watch complaint rate < 0.1% |
| 3 | 15–29 | 5,000 | Tighten DMARC to `p=quarantine` at day 30 if clean |
| 4 | 30+   | provider limit | Steady state |

Rules enforced automatically by the pipeline:

- Hard bounces feed `email_suppressions` immediately; 3 hard bounces
  auto-disable the subscription (`MaxHardBounces`).
- Every send attempt re-checks suppression (mid-fan-out safe).
- Fan-out is throttled (`MinSendInterval`, default 100 ms ≈ 10 msg/s);
  raise gradually within the provider rate limit rather than bursting.
- Failures retry with exponential backoff (15m→4h), max 5 attempts, then
  dead-letter (`status='dead_letter'`) for manual review.

Weekly digest fires Mondays 09:00 UTC via `scripts/cron-gfi-digest.sh`
(registered by `scripts/install-crontab.sh`).
