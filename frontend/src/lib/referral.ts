export const REF_COOKIE = "opendoor_ref";
const REF_MAX_AGE = 30 * 24 * 3600; // 30 days

export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;
  const ref = new URLSearchParams(window.location.search).get("ref");
  if (!ref || ref.length > 64) return;
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(ref)}; max-age=${REF_MAX_AGE}; path=/; samesite=lax`;
}

export function getReferralCode(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${REF_COOKIE}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}
