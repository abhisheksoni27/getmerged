import { API_BASE_URL } from "@/lib/api";

const GETMERGED_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 16 16" fill="none">
  <path d="M5 3.25v7.5M5 5.5c1.5 0 3.5 1 5 2.5v1.25" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
  <circle cx="5" cy="3.25" r="2" fill="#3fb950"/>
  <circle cx="5" cy="11.25" r="2" fill="#3fb950"/>
  <circle cx="10" cy="9.25" r="2" fill="#58a6ff"/>
</svg>`;

/**
 * Standard Shields.io SVG renderer.
 * Produces 20px tall, 3px rx badges matching GitHub open source conventions.
 */
function renderShieldsBadge({
  label,
  message,
  color,
  logoSvg,
}: {
  label: string;
  message: string;
  color: string;
  logoSvg?: string;
}): string {
  // Approximate character widths in 0.1 scale (10x) matching Verdana 11px
  const labelTextLength = Math.round(label.length * 67);
  const leftWidth = logoSvg ? 24 + Math.round(labelTextLength / 10) + 6 : Math.round(labelTextLength / 10) + 16;
  const labelX = logoSvg ? Math.round(((24 + leftWidth) / 2) * 10) : Math.round((leftWidth / 2) * 10);

  const msgTextLength = Math.round(message.length * 64);
  const rightWidth = Math.round(msgTextLength / 10) + 14;
  const totalWidth = leftWidth + rightWidth;
  const msgX = Math.round((leftWidth + rightWidth / 2) * 10);

  const logoBase64 = logoSvg ? Buffer.from(logoSvg).toString("base64") : "";
  const logoElem = logoSvg
    ? `<image x="5" y="3" width="14" height="14" href="data:image/svg+xml;base64,${logoBase64}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${label}: ${message}">
  <title>${label}: ${message}</title>
  <filter id="blur"><feGaussianBlur stdDeviation="16"/></filter>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0%" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    ${logoElem}
    <g transform="scale(.1)">
      <g aria-hidden="true" fill="#010101">
        <text x="${labelX}" y="150" fill-opacity=".3" textLength="${labelTextLength}">${label}</text>
      </g>
      <text x="${labelX}" y="140" textLength="${labelTextLength}">${label}</text>
    </g>
    <g transform="scale(.1)">
      <g aria-hidden="true" fill="#010101">
        <text x="${msgX}" y="150" fill-opacity=".3" textLength="${msgTextLength}">${message}</text>
      </g>
      <text x="${msgX}" y="140" textLength="${msgTextLength}">${message}</text>
    </g>
  </g>
</svg>`;
}

export async function generateUserBadgeSvg(username: string) {
  const cleanUsername = username ? username.trim().replace(/^@/, "") : "contributor";

  let karmaPoints = 720;
  let levelTitle = "Ecosystem Specialist";
  let badgeTheme = "cyan";

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/u/${encodeURIComponent(cleanUsername)}/karma`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.total_karma !== undefined && data.total_karma > 0) {
        karmaPoints = data.total_karma;
        levelTitle =
          data.rank?.title ||
          (karmaPoints >= 3000 ? "Core OSS Legend" : karmaPoints >= 1500 ? "Senior Contributor" : "Ecosystem Specialist");
        if (karmaPoints >= 3000) badgeTheme = "gold";
        else if (karmaPoints >= 1500) badgeTheme = "emerald";
        else badgeTheme = "cyan";
      }
    }
  } catch {}

  const karmaColor = badgeTheme === "gold" ? "#d29922" : badgeTheme === "emerald" ? "#3fb950" : "#0284c7";
  const rightText = `${karmaPoints.toLocaleString()} Karma · ${levelTitle}`;

  return renderShieldsBadge({
    label: "GetMerged",
    message: rightText,
    color: karmaColor,
    logoSvg: GETMERGED_LOGO,
  });
}

export async function generateRepoBadgeSvg(owner: string, name: string) {
  const fullName = `${owner}/${name}`;
  let tier: string | null = null;

  try {
    // 1. Direct path lookup with 3s timeout
    let repo: { c_rank_tier?: string; external_pr_merge_rate?: number; full_name?: string } | null = null;
    const directRes = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}`, {
      signal: AbortSignal.timeout(3000),
      next: { revalidate: 3600 },
    });
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.c_rank_tier) {
        repo = data;
      }
    }

    // 2. Query param fallback lookup with 3s timeout
    if (!repo) {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`, {
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = await res.json();
        const rawList = data.data || data.repos;
        if (Array.isArray(rawList) && rawList.length > 0) {
          repo = rawList.find((r: { full_name: string }) => r.full_name?.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        }
      }
    }

    if (repo && repo.c_rank_tier) {
      tier = repo.c_rank_tier;
    }
  } catch {
    // Graceful fallback to default/unindexed badge on timeout or backend failure
  }

  const tierUpper = tier ? tier.toUpperCase() : null;

  const tierThemes: Record<string, { color: string; verdict: string }> = {
    S: {
      color: "#8a63d2",
      verdict: "Tier S · ★ Super Welcoming",
    },
    A: {
      color: "#3fb950",
      verdict: "Tier A · ★ Welcoming",
    },
    B: {
      color: "#d29922",
      verdict: "Tier B · Active",
    },
    C: {
      color: "#f85149",
      verdict: "Tier C · Selective",
    },
    D: {
      color: "#6e7681",
      verdict: "Tier D · Strict Reviews",
    },
  };

  const theme = (tierUpper && tierThemes[tierUpper]) || {
    color: "#58a6ff",
    verdict: "Indexed · Welcoming",
  };

  const svg = renderShieldsBadge({
    label: "GetMerged",
    message: theme.verdict,
    color: theme.color,
    logoSvg: GETMERGED_LOGO,
  });

  return {
    svg,
    tier: tierUpper || "B",
  };
}
