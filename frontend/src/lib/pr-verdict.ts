// Shared verdict formatting for verified PR evaluation outcomes (AC1).
// All surfaces (/share/pr-eval page, dashboard cards, OG image) render from
// this one field set so wording can never diverge.

export interface PREvalAccuracy {
  rate: number;
  n: number;
  correct?: number;
}

export interface PREvalOutcome {
  eval_id?: string;
  state: "hit" | "miss" | "pending" | "unverifiable";
  predicted_score?: number;
  days_to_merge?: number | null;
  resolved_at?: string | null;
  merged_at?: string | null;
  outcome_hash?: string;
  pr_number?: number | null;
  creator_login?: string;
  resolved_n?: number;
  accuracy?: PREvalAccuracy | null;
}

export interface VerdictView {
  text: string;
  tone: "good" | "bad" | "muted";
}

const pctOf = (outcome: PREvalOutcome): number =>
  Math.round(outcome.predicted_score ?? 0);

// AC1 state mapping: merged/closed -> final verdict, open -> Pending,
// deleted/not-found/stale sync -> Unknown. No crash, no guessed data.
export function formatVerdict(outcome: PREvalOutcome | null): VerdictView | null {
  if (!outcome) return null;
  if (outcome.state === "hit") {
    const pct = pctOf(outcome);
    if (!outcome.merged_at) {
      return { text: `Predicted ${pct}% → Closed unmerged ✓`, tone: "good" };
    }
    const days = Math.max(0, Math.round(outcome.days_to_merge ?? 0));
    return {
      text: `Predicted ${pct}% → Merged in ${days} ${days === 1 ? "day" : "days"} ✓`,
      tone: "good",
    };
  }
  if (outcome.state === "miss") {
    const pct = pctOf(outcome);
    return {
      text: outcome.merged_at
        ? `Predicted ${pct}% → Merged ✗`
        : `Predicted ${pct}% → Closed unmerged ✗`,
      tone: "bad",
    };
  }
  if (outcome.state === "unverifiable") {
    return { text: "Unknown", tone: "muted" };
  }
  return { text: "Pending", tone: "muted" };
}

// AC3: 'X/Y verified' over settled (merged-or-closed) evals only; open and
// stale/unverifiable PRs are excluded. Null when nothing has settled yet so
// callers render '—'.
export function formatAccuracy(outcome: PREvalOutcome | null): { label: string } | null {
  if (!outcome?.accuracy || !outcome.accuracy.n) return null;
  const correct =
    outcome.accuracy.correct ?? Math.round(outcome.accuracy.rate * outcome.accuracy.n);
  return { label: `${correct}/${outcome.accuracy.n} verified` };
}
