export interface LatencyCandidate {
  response_p50_hours?: number;
  time_to_first_response_hours?: number;
}

/**
 * Extracts positive response hours prioritizing median p50 over first-response average.
 * Returns undefined if latency is unrecorded (0, negative, or undefined).
 */
export function getPositiveResponseHours(
  repo?: LatencyCandidate | null
): number | undefined {
  if (!repo) return undefined;
  if (repo.response_p50_hours !== undefined && repo.response_p50_hours > 0) {
    return repo.response_p50_hours;
  }
  if (repo.time_to_first_response_hours !== undefined && repo.time_to_first_response_hours > 0) {
    return repo.time_to_first_response_hours;
  }
  return undefined;
}

/**
 * Formats response latency for narrative sentences (e.g. "Outside contributors observe a median review response in <10 minutes").
 * Returns null if unrecorded.
 */
export function formatNarrativeLatency(hours: number | undefined): string | null {
  if (hours === undefined || hours <= 0) return null;
  if (hours < 0.1) return "<10 minutes";
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  return `${hours.toFixed(1)} hours`;
}

/**
 * Formats response latency for compact UI badges/chips (e.g. "<10m Review", "2.5h Review").
 * Returns null if unrecorded.
 */
export function formatBadgeLatency(hours: number | undefined): string | null {
  if (hours === undefined || hours <= 0) return null;
  if (hours < 0.1) return "<10m Review";
  if (hours < 1) return `${Math.round(hours * 60)}m Review`;
  return `${hours.toFixed(1)}h Review`;
}

/**
 * Formats response latency for search/meta tags (e.g. "<10m", "~25m", "~2h").
 * Returns null if unrecorded.
 */
export function formatMetaLatency(hours: number | undefined): string | null {
  if (hours === undefined || hours <= 0) return null;
  if (hours < 0.1) return "<10m";
  if (hours < 0.5) return `~${Math.round(hours * 60)}m`;
  return `~${hours.toFixed(0)}h`;
}
