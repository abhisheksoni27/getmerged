# Plan: Contributor Identity Card (revised, post-discovery)

## Discovery findings

- `/u/[username]` already exists, public-by-is_public flag, has OG image, share buttons, achievement SVG.
- `contributor_profiles` table + `ContributorProfileRepository` exist with `dna_json` TEXT column.
- `pipeline/contributor_dna.go` worker exists, fetches 50 merged PRs in **strictly 1 GraphQL query** (test-enforced).
- `[owner]/[name]` page exists, shows DNA only to the owner.
- `auth.JWT`, `ghapp`, `lang_snapshot`, C-Rank tier all reusable.

## What I am NOT doing

- New page route. `/u/[username]` is the product.
- New auth flow. JWT + consent already wired.
- New GraphQL queries. The 1-query budget is test-enforced and a real rate-limit hedge.
- New DB table. Extending `dna_json` payload + 3 derived columns on `contributor_profiles`.

## 4 commits on `main`

**Commit 1 — DNA engine: archetype + stars + top-repos + temporal signature.**
- `pipeline/contributor_dna.go`:
  - Extend `ContributorDNAResult` with `Persona`, `PersonaVerdict`, `PersonaSignals []string`, `TemporalSignature` (peak hour + label), `StarsPulledIn int`, `TopRepos []TopRepo` (non-fork, dedup, ranked by stargazerCount, top 6).
  - New `computePersona(data) → (persona, verdict, signals, temporal)`. Pure function. TDD first.
  - `computeContributorDNA` synthesises everything from the existing 50-PR window. No new GraphQL.
  - `stars_pulled_in` = sum over distinct repos of (repo.stargazerCount × share_of_user_PRs_in_repo). Document this in a tooltip on the page.
- `pipeline/contributor_dna_test.go`:
  - Existing test still asserts `queryCount == 1` and `'completed'`. Keep that.
  - Add: persona test (Night Owl inputs → "Night Owl Maintainer"), stars test, top-repos test, temporal test.
- Migration `019_dna_persona_columns.sql`:
  - `ALTER TABLE contributor_profiles ADD COLUMN persona VARCHAR(64) NULL;`
  - `ALTER TABLE contributor_profiles ADD COLUMN stars_pulled_in INT NULL;`
  - `ALTER TABLE contributor_profiles ADD COLUMN updated_persona_at DATETIME NULL;`
  - Indexed on persona for "list all Night Owls" later (future viral loop).

**Commit 2 — Wire DNA into the public profile.**
- `repository/user_repository.go`:
  - `PublicContributorProfile` gets a new field `DNA *pipeline.ContributorDNAResult` (pointer, omitempty).
  - `GetPublicContributorProfileBySlug` looks up `contributor_profiles` by `user_id`, unmarshals `dna_json` into the struct. Same for `GetUserProfileBySlug` (the `[owner]` payload).
- Backward-safe: existing FE ignores unknown JSON fields.

**Commit 3 — Public page revamp + new components.**
- `frontend/src/app/u/[username]/page.tsx`:
  - Persona banner is the hero: archetype in display type, 1-line verdict, "why" chips, `StarsPulledIn` as a loud number.
  - Top 6 non-fork repos grid with star counts.
  - Language breakdown bar (from `LanguageBreakdown` map; fall back to `user.lang_snapshot` if empty).
  - Temporal signature chip.
  - Evidence list kept (PRs + C-Rank tier).
- New `components/contributor/PersonaBanner.tsx`, `StarsPulledIn.tsx`, `PinnedRepos.tsx`, `LangBar.tsx`, `TemporalChip.tsx`.
- Reuse existing share buttons; prepend persona to the share text.
- Keep `og-image` route, extend it to render the persona in the OG image.
- Type updates in `types/opendoor.ts`.

**Commit 4 — Achievement SVG + viral loop.**
- `handler/achievements.go`:
  - Add the archetype as a line in the badge SVG.
- `frontend/src/app/[owner]/page.tsx`:
  - If logged-in maintainer views a repo page (already the case on `[owner]`), soft-prompt to generate DNA if `dna == null` and `profiling_consent` is unset. One click.
- Deploy: rules 18 says both BE + FE changed → both deploy.

## Risks I'm taking on

- **Persona feels mean** — floor is "Emerging Contributor"; never produce a negative archetype.
- **Stars pulled in is a proxy** — based on the 50-PR sample, not the full commit history. Document in tooltip.
- **Public-by-default is wrong** — keep the existing `is_public` gate; persona only renders when the user opts in.
- **Existing FE types** — I extend the `ContributorDNA` interface, don't break it.

## Verification

- `cd backend && go build ./... && go test ./internal/pipeline/...` (pass)
- `cd frontend && npm run lint` (pass)
- Deploy via Makefile.
- Post-deploy: `curl -s https://getmerged.abhishekco.de/u/<abhishek27-slug> | grep -i persona`.
- Check OG image: `curl -sI https://getmerged.abhishekco.de/api/og/u/<slug> | head -5`.
