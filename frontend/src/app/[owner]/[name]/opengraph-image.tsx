import { ImageResponse } from "next/og";
import { gemojiToUnicode } from "@/lib/gemoji";

export const runtime = "edge";
export const alt = "C-Rank Contributor Readiness Score Card";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ owner: string; name: string }>;
}) {
  const { owner, name } = await params;
  const fullName = `${owner}/${name}`;

  let description = "Open-source repository C-Rank™ Index";
  let tier = "A";
  let score = "75.0";

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "https://getmerged.abhishekco.de";
    const res = await fetch(`${baseUrl}/api/v1/repos?name=${encodeURIComponent(fullName)}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = data.data || data.repos;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const repo = rawList.find((r: { full_name: string }) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        if (repo) {
          description = gemojiToUnicode(repo.description) || description;
          tier = repo.c_rank_tier || tier;
          score = repo.c_rank_score ? repo.c_rank_score.toFixed(1) : score;
        }
      }
    }
  } catch (e) {
    console.error("OG image fetch failed:", e);
  }

  const getTierBg = (t: string) => {
    switch (t.toUpperCase()) {
      case "S": return "#059669";
      case "A": return "#2563eb";
      case "B": return "#d97706";
      case "C": return "#dc2626";
      default: return "#52525b";
    }
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#09090b",
          backgroundImage: "radial-gradient(circle at 25px 25px, #27272a 2px, transparent 0)",
          backgroundSize: "50px 50px",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
          <span style={{ color: "#a1a1aa", fontSize: "24px", fontWeight: 600 }}>
            getmerged.abhishekco.de
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span style={{ color: "#ffffff", fontSize: "52px", fontWeight: 800 }}>
            {fullName}
          </span>
          <span
            style={{
              color: "#d4d4d8",
              fontSize: "24px",
              maxWidth: "900px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: getTierBg(tier),
              padding: "10px 24px",
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: 800,
            }}
          >
            <span>{tier}-TIER</span>
            <span>({score} / 100)</span>
          </div>
          <span style={{ color: "#71717a", fontSize: "20px" }}>
            C-Rank™ Contributor Readiness Score
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
