import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const cleanUsername = username ? username.trim().replace(/^@/, "") : "contributor";

  let karmaPoints = 2450;
  let levelTitle = "Senior Contributor";
  let badgeColor = "#3b82f6";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/u/${encodeURIComponent(cleanUsername)}/karma`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.total_karma !== undefined) {
        karmaPoints = data.total_karma;
        levelTitle = data.level_title || levelTitle;
        badgeColor = data.badge_color || badgeColor;
      }
    }
  } catch {}

  const leftText = "GetMerged Karma";
  const rightText = `⚡ ${karmaPoints.toLocaleString()} · ${levelTitle}`;

  // Approximate character widths
  const leftWidth = Math.max(110, leftText.length * 7.5 + 24);
  const rightWidth = Math.max(140, rightText.length * 6.8 + 24);
  const totalWidth = leftWidth + rightWidth;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="28" viewBox="0 0 ${totalWidth} 28" fill="none" role="img" aria-label="${leftText}: ${rightText}">
  <title>${leftText}: ${rightText}</title>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".15"/>
      <stop offset="1" stop-color="#000" stop-opacity=".25"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${badgeColor}"/>
      <stop offset="1" stop-color="#10b981"/>
    </linearGradient>
    <clipPath id="r">
      <rect width="${totalWidth}" height="28" rx="6" fill="#fff"/>
    </clipPath>
  </defs>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="28" fill="#121214"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="28" fill="#1c1c20"/>
    <rect width="${totalWidth}" height="28" fill="url(#g)"/>
    <line x1="${leftWidth}" y1="0" x2="${leftWidth}" y2="28" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <rect x="0" y="26" width="${totalWidth}" height="2" fill="url(#accent)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" text-rendering="geometricPrecision" font-size="11" font-weight="600">
    <text x="${leftWidth / 2}" y="17.5" fill="#a1a1aa">${leftText}</text>
    <text x="${leftWidth + rightWidth / 2}" y="17.5" fill="#f4f4f5">${rightText}</text>
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
