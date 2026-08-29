export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";

export function getRepoApiUrl(identifier: string | number): string {
  return `${API_BASE_URL}/api/v1/repos/${encodeURIComponent(String(identifier))}`;
}

export function getRepoQueryUrl(fullName: string): string {
  return `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`;
}

export function getRepoAuditUrl(owner: string, name: string): string {
  return `${API_BASE_URL}/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/audit`;
}

export function getRepoAuditCheckoutUrl(owner: string, name: string): string {
  return `${API_BASE_URL}/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/audit/checkout`;
}

export function getRepoAuditRegenUrl(owner: string, name: string): string {
  return `${API_BASE_URL}/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/audit/regen`;
}

export function getRepoAuditStatusUrl(repoKey: string): string {
  return `${API_BASE_URL}/api/audit/status?repo_key=${encodeURIComponent(repoKey)}`;
}

