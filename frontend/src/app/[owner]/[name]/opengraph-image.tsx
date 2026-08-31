import { ImageResponse } from "next/og";
import { API_BASE_URL } from "@/lib/api";

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
  let mergeRate = "78%";
  let responseTime = "<12h";
  let stars = "1.2k";

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = data.data || data.repos;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const repo = rawList.find((r: { full_name: string }) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        if (repo) {
          description = repo.description || description;
          tier = repo.c_rank_tier || tier;
          score = repo.c_rank_score ? repo.c_rank_score.toFixed(1) : score;
          if (repo.external_pr_merge_rate !== undefined) {
            mergeRate = `${Math.round(repo.external_pr_merge_rate)}%`;
          }
          if (repo.time_to_first_response_hours !== undefined) {
            const h = repo.time_to_first_response_hours;
            responseTime = h < 1 ? "<1h" : h < 24 ? `${Math.round(h)}h` : `${Math.round(h / 24)}d`;
          }
          if (repo.stars !== undefined) {
            stars = repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : `${repo.stars}`;
          }
        }
      }
    }
  } catch (e) {
    console.error("OG image fetch failed:", e);
  }

  const getTierBg = (t: string) => {
    switch (t.toUpperCase()) {
      case "S": return "#10b981";
      case "A": return "#38bdf8";
      case "B": return "#c084fc";
      case "C": return "#fbbf24";
      case "D": return "#f87171";
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
          backgroundColor: "#07080b",
          backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.08) 1.5px, transparent 0)",
          backgroundSize: "36px 36px",
          padding: "60px 70px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Header */}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 12px #10b981",
              }}
            />
            <span style={{ color: "#ffffff", fontSize: "24px", fontWeight: 700, letterSpacing: "-0.5px" }}>
              GetMerged
            </span>
            <span style={{ color: "#71717a", fontSize: "20px" }}>&bull; Open Source Telemetry</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              padding: "6px 16px",
              borderRadius: "999px",
              color: "#d4d4d8",
              fontSize: "18px",
            }}
          >
            {stars} ★
          </div>
        </div>

        {/* Center Main Repo Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "1050px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <span style={{ color: "#ffffff", fontSize: "56px", fontWeight: 800, letterSpacing: "-1px" }}>
              {fullName}
            </span>
          </div>
          <span
            style={{
              color: "#a1a1aa",
              fontSize: "24px",
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </span>
        </div>

        {/* Bottom Metrics Bar */}
        <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                backgroundColor: getTierBg(tier),
                padding: "12px 24px",
                borderRadius: "14px",
                color: "#000000",
                fontSize: "28px",
                fontWeight: 900,
                letterSpacing: "0.5px",
              }}
            >
              <span>TIER {tier}</span>
              <span style={{ opacity: 0.8, fontSize: "22px", fontWeight: 700 }}>({score})</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "10px 20px",
                borderRadius: "12px",
              }}
            >
              <span style={{ color: "#a1a1aa", fontSize: "14px", textTransform: "uppercase" }}>Merge Rate</span>
              <span style={{ color: "#10b981", fontSize: "22px", fontWeight: 800 }}>{mergeRate}</span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "10px 20px",
                borderRadius: "12px",
              }}
            >
              <span style={{ color: "#a1a1aa", fontSize: "14px", textTransform: "uppercase" }}>Median Review</span>
              <span style={{ color: "#38bdf8", fontSize: "22px", fontWeight: 800 }}>{responseTime}</span>
            </div>
          </div>

          <span style={{ color: "#71717a", fontSize: "18px", fontFamily: "monospace" }}>
            getmerged.abhishekco.de/{fullName}
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
