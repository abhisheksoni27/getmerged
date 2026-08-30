import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const cleanUsername = username ? username.trim().replace(/^@/, "") : "contributor";

  let karmaPoints = 1450;
  let levelTitle = "Verified Contributor";
  let badgeTheme = "emerald";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/u/${encodeURIComponent(cleanUsername)}/karma`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.total_karma !== undefined && data.total_karma > 0) {
        karmaPoints = data.total_karma;
        levelTitle = data.rank?.title || (karmaPoints >= 2000 ? "Senior Contributor" : "Active Contributor");
        if (karmaPoints >= 3000) badgeTheme = "gold";
        else if (karmaPoints >= 1000) badgeTheme = "emerald";
        else badgeTheme = "cyan";
      }
    }
  } catch {}

  // Format display text
  const rightText = `⚡ ${karmaPoints.toLocaleString()} Karma · ${levelTitle}`;

  // Theme palettes: background gradients and accents
  const themes: Record<string, { bg1: string; bg2: string; stroke: string; text: string; accent: string }> = {
    gold: {
      bg1: "#451a03",
      bg2: "#270e02",
      stroke: "rgba(245, 158, 11, 0.4)",
      text: "#fde68a",
      accent: "#f59e0b",
    },
    emerald: {
      bg1: "#064e3b",
      bg2: "#022c22",
      stroke: "rgba(16, 185, 129, 0.4)",
      text: "#a7f3d0",
      accent: "#10b981",
    },
    cyan: {
      bg1: "#0c4a6e",
      bg2: "#082f49",
      stroke: "rgba(56, 189, 248, 0.4)",
      text: "#bae6fd",
      accent: "#38bdf8",
    },
  };

  const theme = themes[badgeTheme] || themes.emerald;

  // Exact pixel measurement calculation for 24px height modern badge
  const leftWidth = 98;
  const rightWidth = Math.max(160, rightText.length * 7.2 + 20);
  const totalWidth = leftWidth + rightWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="24" viewBox="0 0 ${totalWidth} 24" fill="none" role="img" aria-label="GetMerged: ${rightText}">
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
  <!-- Brand logo: Emerald Lightning Bolt -->
  <g transform="translate(8, 5)">
    <path d="M7 1L1 8H6L5 13L11 6H6L7 1Z" fill="#10b981" stroke="#059669" stroke-width="0.5" stroke-linejoin="round"/>
  </g>
  <!-- Typography -->
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, system-ui, sans-serif" font-size="11" font-weight="700" text-rendering="geometricPrecision">
    <text x="24" y="16" fill="#f4f4f5" letter-spacing="-0.2px">GetMerged</text>
    <text x="${leftWidth + rightWidth / 2}" y="16" fill="${theme.text}" text-anchor="middle" font-weight="600" letter-spacing="-0.1px">${rightText}</text>
  </g>
</svg>`;

  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml;charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
