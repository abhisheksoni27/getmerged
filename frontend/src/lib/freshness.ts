const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function formatFreshness(createdAt?: string | null): string {
  if (!createdAt) return "";
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return "";
  const diffMs = Date.now() - created;
  if (diffMs < MS_PER_DAY) return "Opened today";
  const days = Math.floor(diffMs / MS_PER_DAY);
  if (days < 30) return `Opened ${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `Opened ${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `Opened ${years} year${years === 1 ? "" : "s"} ago`;
}