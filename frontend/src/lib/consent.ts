export type ConsentChoice = "accepted" | "rejected" | null;

const CONSENT_COOKIE = "opendoor_consent";

export function getConsent(): ConsentChoice {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return null;
  const value = match.split("=")[1];
  return value === "accepted" || value === "rejected" ? value : null;
}

export function setConsent(choice: "accepted" | "rejected") {
  const maxAge = choice === "accepted" ? 60 * 60 * 24 * 365 : 60 * 60 * 24 * 90;
  document.cookie = `${CONSENT_COOKIE}=${choice}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
