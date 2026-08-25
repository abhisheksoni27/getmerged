import { Repo } from "@/types/opendoor";

export type VsWinner = "a" | "b" | "tie";

export interface VsMetric {
  key: string;
  label: string;
  valueA: number | null;
  valueB: number | null;
  higherWins: boolean;
  format: "pct" | "hours" | "count";
}

export interface VsVerdict {
  winner: VsWinner;
  /** Display name of winning repo, or null when Too Close to Call. */
  winnerName: string | null;
  /** Human-readable verdict label. Always defined. */
  label: string;
  isTie: boolean;
  scores: [number, number, number];
  metrics: VsMetric[];
}

function num(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Scores one metric: 1 (A), -1 (B), 0 (equal or incomparable). Total by design. */
export function scoreMetric(
  a: number | null,
  b: number | null,
  higherWins: boolean
): -1 | 0 | 1 {
  if (a === null || b === null || a === b) return 0;
  const aBetter = higherWins ? a > b : a < b;
  return aBetter ? 1 : -1;
}

export function extractMetrics(repoA: Repo | null, repoB: Repo | null): VsMetric[] {
  const pick = (r: Repo | null, keys: Array<keyof Repo>): number | null => {
    if (!r) return null;
    for (const k of keys) {
      const v = num(r[k] as number | undefined);
      if (v !== null) return v;
    }
    return null;
  };
  return [
    {
      key: "merge_rate",
      label: "External PR Merge Rate",
      valueA: pick(repoA, ["external_pr_merge_rate"]),
      valueB: pick(repoB, ["external_pr_merge_rate"]),
      higherWins: true,
      format: "pct",
    },
    {
      key: "review_latency",
      label: "Median Review Latency",
      valueA: pick(repoA, ["response_p50_hours", "time_to_first_response_hours"]),
      valueB: pick(repoB, ["response_p50_hours", "time_to_first_response_hours"]),
      higherWins: false,
      format: "hours",
    },
    {
      key: "bus_factor",
      label: "90-Day Bus Factor",
      valueA: pick(repoA, ["bus_factor", "distinct_maintainer_count"]),
      valueB: pick(repoB, ["bus_factor", "distinct_maintainer_count"]),
      higherWins: true,
      format: "count",
    },
  ];
}

/**
 * Maintainer Responsiveness & Merge Velocity Verdict.
 * Winner = majority metric score with commit-velocity (recent PR throughput)
 * tiebreak. All-equal or unresolvable repos -> "Too Close to Call".
 * Never returns undefined.
 */
export function computeVsVerdict(
  nameA: string,
  nameB: string,
  repoA: Repo | null,
  repoB: Repo | null
): VsVerdict {
  const metrics = extractMetrics(repoA, repoB);
  // Any repo unresolvable -> Too Close to Call.
  if (!repoA || !repoB || !nameA || !nameB) {
    return {
      winner: "tie",
      winnerName: null,
      label: "Too Close to Call",
      isTie: true,
      scores: [0, 0, 0],
      metrics,
    };
  }

  const scores = metrics.map((m) => scoreMetric(m.valueA, m.valueB, m.higherWins));
  const total: number = scores.reduce<number>((acc, s) => acc + s, 0);

  let winner: VsWinner;
  if (total > 0) {
    winner = "a";
  } else if (total < 0) {
    winner = "b";
  } else {
    // Commit-velocity tiebreak: recent PR throughput over 6 months.
    const velA = num(repoA.pr_count_6m);
    const velB = num(repoB.pr_count_6m);
    if (velA !== null && velB !== null && velA !== velB) {
      winner = velA > velB ? "a" : "b";
    } else {
      winner = "tie";
    }
  }

  return {
    winner,
    winnerName: winner === "a" ? nameA : winner === "b" ? nameB : null,
    label:
      winner === "a"
        ? `${nameA} Wins`
        : winner === "b"
          ? `${nameB} Wins`
          : "Too Close to Call",
    isTie: winner === "tie",
    scores: [scores[0], scores[1], scores[2]],
    metrics,
  };
}

export function formatMetricValue(value: number | null, format: VsMetric["format"]): string {
  if (value === null) return "—";
  switch (format) {
    case "pct":
      return `${value.toFixed(1)}%`;
    case "hours":
      return value >= 100 ? `${Math.round(value)}h` : `${value.toFixed(1)}h`;
    default:
      return `${Math.round(value)}`;
  }
}
