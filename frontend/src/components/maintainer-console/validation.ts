export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function tierBadgeClass(tier: string): string {
  if (tier === "S") return "bg-[#8ce99a] border-emerald-500";
  if (tier === "A") return "bg-[#bfdbff] border-blue-400";
  if (tier === "B") return "bg-[#ffd93d] border-amber-400";
  if (tier === "C") return "bg-[#e5dbff] border-purple-400";
  return "bg-[#ffb3c7] border-rose-400";
}

export function rescoreOutcomeLabel(outcome: string): string {
  return outcome.replace(/_/g, " ");
}

export function rescoreCardHref(cardUrl: string | undefined, fullName: string, baseUrl: string): string {
  if (cardUrl) return `${baseUrl}${cardUrl}`;
  return `${baseUrl}/og/playbook/${fullName}`;
}

export function formatResponseHours(value: number | null | undefined): string {
  return value ? `${value.toFixed(1)}h` : "N/A";
}

export function formatPercent(value: number | null | undefined, fallback = "0%"): string {
  return value ? `${value.toFixed(0)}%` : fallback;
}

export function formatCooldownDate(value: string | undefined): string {
  if (!value) return "later";
  return new Date(value).toLocaleString();
}
