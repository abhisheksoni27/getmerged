import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ owner: string; name: string }> }
) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  let tier = "A";
  let mergeRate = "";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/repos?name=${encodeURIComponent(fullName)}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = data.data || data.repos;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const repo = rawList.find((r: { full_name: string }) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        if (repo) {
          tier = repo.c_rank_tier || tier;
          if (repo.external_pr_merge_rate !== undefined) {
            mergeRate = `${Math.round(repo.external_pr_merge_rate)}%`;
          }
        }
      }
    }
  } catch {}

  const getTierColor = (t: string) => {
    switch (t.toUpperCase()) {
      case "S": return "#10b981";
      case "A": return "#38bdf8";
      case "B": return "#c084fc";
      case "C": return "#fbbf24";
      case "D": return "#f87171";
      default: return "#71717a";
    }
  };

  const color = getTierColor(tier);
  const valueText = mergeRate ? `Tier ${tier} • ${mergeRate}` : `Tier ${tier}`;
  const labelWidth = 62;
  const valueWidth = Math.max(60, valueText.length * 7.5 + 16);
  const totalWidth = labelWidth + valueWidth;

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="C-Rank: ${valueText}">
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#18181b"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelWidth * 5}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">C-Rank</text>
    <text x="${labelWidth * 5}" y="140" transform="scale(.1)" fill="#fff">C-Rank</text>
    <text aria-hidden="true" x="${(labelWidth + valueWidth / 2) * 10}" y="150" fill="#010101" fill-opacity=".3" transform="scale(.1)">${valueText}</text>
    <text x="${(labelWidth + valueWidth / 2) * 10}" y="140" transform="scale(.1)" fill="#fff" font-weight="bold">${valueText}</text>
  </g>
</svg>
  `.trim();

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml;charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
