import { API_BASE_URL } from "@/lib/api";

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
        levelTitle = data.rank?.title || (karmaPoints >= 3000 ? "Core OSS Legend" : karmaPoints >= 1500 ? "Senior Contributor" : "Ecosystem Specialist");
        if (karmaPoints >= 3000) badgeTheme = "gold";
        else if (karmaPoints >= 1500) badgeTheme = "emerald";
        else badgeTheme = "cyan";
      }
    }
  } catch {}

  const rightText = `⚡ ${karmaPoints.toLocaleString()} Karma · ${levelTitle}`;

  // Color schemes
  const themes: Record<string, { bg1: string; bg2: string; text: string; accent: string }> = {
    gold: {
      bg1: "#451a03",
      bg2: "#270e02",
      text: "#fde68a",
      accent: "#f59e0b",
    },
    emerald: {
      bg1: "#064e3b",
      bg2: "#022c22",
      text: "#a7f3d0",
      accent: "#10b981",
    },
    cyan: {
      bg1: "#0c4a6e",
      bg2: "#082f49",
      text: "#bae6fd",
      accent: "#38bdf8",
    },
  };

  const theme = themes[badgeTheme] || themes.cyan;

  // Exact width calculation with authentic logo
  const leftWidth = 104;
  const rightWidth = Math.max(160, rightText.length * 7.2 + 24);
  const totalWidth = leftWidth + rightWidth;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" fill="none" role="img" aria-label="GetMerged: ${rightText}">
  <title>GetMerged Contributor: ${rightText}</title>
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.25"/>
    </linearGradient>
    <linearGradient id="rightBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
    <clipPath id="squircle">
      <rect width="${totalWidth}" height="24" rx="6" fill="#ffffff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#squircle)">
    <!-- Left brand segment -->
    <rect width="${leftWidth}" height="24" fill="#09090b"/>
    <!-- Right value segment -->
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#rightBg)"/>
    <!-- Specular gloss overlay -->
    <rect width="${totalWidth}" height="24" fill="url(#gloss)"/>
    <!-- Divider -->
    <line x1="${leftWidth}" y1="0" x2="${leftWidth}" y2="24" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <!-- Outer border -->
    <rect width="${totalWidth}" height="24" rx="6" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <!-- Bottom glow line -->
    <rect x="${leftWidth}" y="23" width="${rightWidth}" height="1" fill="${theme.accent}"/>
  </g>
  <!-- Real GetMerged Git Convergence Brand Logo (16x16) -->
  <g transform="translate(6, 4)">
    <rect width="16" height="16" rx="4" fill="#0a0f0d" stroke="rgba(16,185,129,0.3)" stroke-width="0.75" />
    <rect x="2.5" y="4.5" width="3" height="1.5" rx="0.25" fill="#10b981" />
    <rect x="6" y="5.5" width="2" height="1.5" rx="0.25" fill="#34d399" />
    <rect x="2.5" y="10" width="3" height="1.5" rx="0.25" fill="#ef4444" />
    <rect x="6" y="9" width="2" height="1.5" rx="0.25" fill="#f59e0b" />
    <rect x="8.5" y="6.75" width="3.5" height="2.5" rx="0.4" fill="#10b981" />
    <circle cx="12.5" cy="7.5" r="0.75" fill="#ffffff" />
    <circle cx="9.5" cy="4.8" r="0.6" fill="#38bdf8" />
    <circle cx="9.5" cy="10.8" r="0.6" fill="#f59e0b" />
  </g>
  <!-- Typography with ample breathing room (no overlap!) -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif" font-size="11" font-weight="700" text-rendering="geometricPrecision">
    <text x="28" y="16" fill="#f4f4f5" letter-spacing="-0.2px">Get<tspan fill="#10b981">Merged</tspan></text>
    <text x="${leftWidth + rightWidth / 2}" y="16" fill="${theme.text}" text-anchor="middle" font-weight="600" letter-spacing="-0.1px">${rightText}</text>
  </g>
</svg>`;
}

export async function generateRepoBadgeSvg(owner: string, name: string) {
  const fullName = `${owner}/${name}`;
  let tier = "A";

  try {
    // 1. Direct path lookup
    let repo: { c_rank_tier?: string; external_pr_merge_rate?: number; full_name?: string } | null = null;
    const directRes = await fetch(`${API_BASE_URL}/api/v1/repos/${encodeURIComponent(fullName)}`);
    if (directRes.ok) {
      const data = await directRes.json();
      if (data?.c_rank_tier) {
        repo = data;
      }
    }

    // 2. Query param fallback lookup
    if (!repo) {
      const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`);
      if (res.ok) {
        const data = await res.json();
        const rawList = data.data || data.repos;
        if (Array.isArray(rawList) && rawList.length > 0) {
          repo = rawList.find((r: { full_name: string }) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        }
      }
    }

    if (repo && repo.c_rank_tier) {
      tier = repo.c_rank_tier;
    }
  } catch {}

  const tierUpper = (tier || "A").toUpperCase();

  const tierThemes: Record<string, { bg1: string; bg2: string; text: string; accent: string; chipFill: string; verdict: string }> = {
    S: {
      bg1: "#2e1065",
      bg2: "#160438",
      text: "#e9d5ff",
      accent: "#A371F7",
      chipFill: "rgba(163,113,247,0.25)",
      verdict: "★ Welcoming",
    },
    A: {
      bg1: "#064e3b",
      bg2: "#02241b",
      text: "#a7f3d0",
      accent: "#3FB950",
      chipFill: "rgba(63,185,80,0.25)",
      verdict: "★ Welcoming",
    },
    B: {
      bg1: "#451a03",
      bg2: "#240d02",
      text: "#fde68a",
      accent: "#D29922",
      chipFill: "rgba(210,153,34,0.25)",
      verdict: "★ Welcoming",
    },
    C: {
      bg1: "#4c0519",
      bg2: "#24020b",
      text: "#fecdd3",
      accent: "#F85149",
      chipFill: "rgba(248,81,73,0.25)",
      verdict: "★ Selective",
    },
    D: {
      bg1: "#27272a",
      bg2: "#18181b",
      text: "#e4e4e7",
      accent: "#8B949E",
      chipFill: "rgba(139,148,158,0.25)",
      verdict: "Strict Reviews",
    },
  };

  const theme = tierThemes[tierUpper] || {
    bg1: "#0c4a6e",
    bg2: "#082f49",
    text: "#bae6fd",
    accent: "#58A6FF",
    chipFill: "rgba(88,166,255,0.25)",
    verdict: "Indexed",
  };

  const leftWidth = 104;
  const rightWidth = 136;
  const totalWidth = leftWidth + rightWidth;

  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" fill="none" role="img" aria-label="GetMerged: Tier ${tierUpper} · ${theme.verdict}">
  <title>GetMerged: Tier ${tierUpper} · ${theme.verdict}</title>
  <defs>
    <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.22"/>
    </linearGradient>
    <linearGradient id="rightBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg1}"/>
      <stop offset="100%" stop-color="${theme.bg2}"/>
    </linearGradient>
    <clipPath id="squircle">
      <rect width="${totalWidth}" height="24" rx="6" fill="#ffffff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#squircle)">
    <rect width="${leftWidth}" height="24" fill="#0B0F17"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="24" fill="url(#rightBg)"/>
    <rect width="${totalWidth}" height="24" fill="url(#gloss)"/>
    <line x1="${leftWidth}" y1="0" x2="${leftWidth}" y2="24" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    <rect width="${totalWidth}" height="24" rx="6" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
    <rect x="${leftWidth}" y="23" width="${rightWidth}" height="1" fill="${theme.accent}"/>
  </g>
  <!-- Real GetMerged Git Convergence Brand Logo (16x16) -->
  <g transform="translate(6, 4)">
    <rect width="16" height="16" rx="4" fill="#04060A" stroke="rgba(63,185,80,0.3)" stroke-width="0.75" />
    <rect x="2.5" y="4.5" width="3" height="1.5" rx="0.25" fill="#3FB950" />
    <rect x="6" y="5.5" width="2" height="1.5" rx="0.25" fill="#56D364" />
    <rect x="2.5" y="10" width="3" height="1.5" rx="0.25" fill="#F85149" />
    <rect x="6" y="9" width="2" height="1.5" rx="0.25" fill="#E3B341" />
    <rect x="8.5" y="6.75" width="3.5" height="2.5" rx="0.4" fill="#3FB950" />
    <circle cx="12.5" cy="7.5" r="0.75" fill="#ffffff" />
    <circle cx="9.5" cy="4.8" r="0.6" fill="#58A6FF" />
    <circle cx="9.5" cy="10.8" r="0.6" fill="#E3B341" />
  </g>
  <!-- Typography -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="700" text-rendering="geometricPrecision">
    <text x="27" y="16" fill="#F0F6FC" letter-spacing="-0.2px">Get<tspan fill="#3FB950">Merged</tspan></text>
  </g>
  <!-- Tier Letter Chip -->
  <rect x="112" y="4" width="16" height="16" rx="3.5" fill="${theme.chipFill}" stroke="${theme.accent}" stroke-width="0.75"/>
  <text x="120" y="15.5" fill="#ffffff" font-family='ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, monospace' font-size="10.5" font-weight="800" text-anchor="middle">${tierUpper}</text>
  <!-- Star + Verdict Text -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11" font-weight="600" text-rendering="geometricPrecision">
    <text x="180" y="16" fill="${theme.text}" text-anchor="middle" letter-spacing="-0.1px">${theme.verdict}</text>
  </g>
</svg>`,
    tier: tierUpper,
  };
}
