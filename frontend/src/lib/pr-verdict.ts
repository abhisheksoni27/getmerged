// Shared verdict formatting for verified PR evaluation outcomes (AC1).
// All surfaces (/share/pr-eval page, dashboard cards, OG image) render from
// this one field set so wording can never diverge.

export interface PREvalAccuracy {
  rate: number;
  n: number;
}

export interface PREvalOutcome {
  state: "hit" | "miss" | "pending";
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

export function formatVerdict(outcome: PREvalOutcome | null): VerdictView | null {
  if (!outcome) return null;
  if (outcome.state === "hit") {
    const days = Math.max(0, Math.round(outcome.days_to_merge ?? 0));
    const pct = Math.round(outcome.predicted_score ?? 0);
    return {
      text: `Predicted ${pct}% → Merged in ${days} ${days === 1 ? "day" : "days"} ✓`,
      tone: "good",
    };
  }
  if (outcome.state === "miss") {
    return { text: "✗ Missed", tone: "bad" };
  }
  return { text: "Pending", tone: "muted" };
}

// AC3: rate only when >= 5 resolved evals; otherwise the caller renders
// 'Not enough data' instead of a number.
export function formatAccuracy(outcome: PREvalOutcome | null): { label: string } | null {
  if (!outcome?.accuracy) return null;
  const pct = Math.round(outcome.accuracy.rate * 100);
  return { label: `${pct}% forecast accuracy (${outcome.accuracy.n} resolved)` };
}
