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

  let description = "Open-source contributor readiness & maintainer review telemetry";
  let tier = "A";
  let score = "75.0";
  let mergeRate = "78%";
  let responseTime = "< 12h";
  let stars = "1.2k";
  let language = "TypeScript";
  let busFactor = "High";
  let activeStatus = "Live 30d";

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`);
    if (res.ok) {
      const data = await res.json();
      const rawList = data.data || data.repos;
      if (Array.isArray(rawList) && rawList.length > 0) {
        const repo = rawList.find((r: { full_name: string }) => r.full_name.toLowerCase() === fullName.toLowerCase()) || rawList[0];
        if (repo) {
          description = (repo.description || description).replace(/[\u{1F600}-\u{1F6FF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "").trim();
          tier = repo.c_rank_tier || tier;
          score = repo.c_rank_score ? repo.c_rank_score.toFixed(1) : score;
          language = repo.language || language;
          if (repo.external_pr_merge_rate !== undefined) {
            mergeRate = `${Math.round(repo.external_pr_merge_rate)}%`;
          }
          if (repo.time_to_first_response_hours !== undefined) {
            const h = repo.time_to_first_response_hours;
            responseTime = h < 1 ? "< 1h" : h < 24 ? `${Math.round(h)}h` : `${(h / 24).toFixed(1)}d`;
          }
          if (repo.stars !== undefined) {
            stars = repo.stars >= 1000 ? `${(repo.stars / 1000).toFixed(1)}k` : `${repo.stars}`;
          }
          if (repo.bus_factor !== undefined) {
            busFactor = repo.bus_factor >= 3 ? `${repo.bus_factor} devs` : "Solo";
          }
          if (repo.currently_active !== undefined) {
            activeStatus = repo.currently_active ? "Live 30d" : "Dormant";
          }
        }
      }
    }
  } catch (e) {
    console.error("OG image fetch failed:", e);
  }

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

  const tierAccent = getTierColor(tier);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#07080b",
          backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.08) 1.5px, transparent 0)",
          backgroundSize: "32px 32px",
          padding: "50px 60px",
          fontFamily: "sans-serif",
          borderTop: `6px solid ${tierAccent}`,
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
                boxShadow: "0 0 16px #10b981",
              }}
            />
            <span style={{ color: "#ffffff", fontSize: "24px", fontWeight: 800, letterSpacing: "-0.5px" }}>
              GetMerged
            </span>
            <span
              style={{
                color: "#10b981",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "1px",
                textTransform: "uppercase",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "3px 10px",
                borderRadius: "999px",
              }}
            >
              Open Source Telemetry
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "5px 14px",
                borderRadius: "999px",
                color: "#f4f4f5",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              <span style={{ color: "#fbbf24", marginRight: "2px" }}>★</span>
              <span>{stars}</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "5px 14px",
                borderRadius: "999px",
                color: "#a1a1aa",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              <span>{language}</span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: activeStatus === "Live 30d" ? "rgba(16, 185, 129, 0.1)" : "rgba(255, 255, 255, 0.05)",
                border: activeStatus === "Live 30d" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                padding: "5px 14px",
                borderRadius: "999px",
                color: activeStatus === "Live 30d" ? "#34d399" : "#71717a",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: activeStatus === "Live 30d" ? "#10b981" : "#71717a",
                }}
              />
              <span>{activeStatus}</span>
            </div>
          </div>
        </div>

        {/* Center Main Repo Hero Block */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "1050px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
            <span style={{ color: "#ffffff", fontSize: "56px", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1 }}>
              {fullName}
            </span>
          </div>
          <span
            style={{
              color: "#a1a1aa",
              fontSize: "23px",
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </span>
        </div>

        {/* Bottom Bento Telemetry Surface */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            borderRadius: "18px",
            padding: "18px 24px",
          }}
        >
          {/* C-Rank Tier Big Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tierAccent,
                color: "#000000",
                padding: "8px 20px",
                borderRadius: "10px",
                minWidth: "115px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "1.5px", textTransform: "uppercase", opacity: 0.85 }}>
                C-Rank™
              </span>
              <span style={{ fontSize: "30px", fontWeight: 900, letterSpacing: "-0.5px", lineHeight: 1 }}>
                TIER {tier}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: 800 }}>
                Score: {score} / 100
              </span>
              <span style={{ color: "#71717a", fontSize: "13px" }}>
                180-Day Rolling Audit
              </span>
            </div>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Metric 1: Merge Rate */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              External Merge Rate
            </span>
            <span style={{ color: "#10b981", fontSize: "24px", fontWeight: 800 }}>
              {mergeRate}
            </span>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Metric 2: Review Latency */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Median Review
            </span>
            <span style={{ color: "#38bdf8", fontSize: "24px", fontWeight: 800 }}>
              {responseTime}
            </span>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Metric 3: Bus Factor */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Maintainer Core
            </span>
            <span style={{ color: "#c084fc", fontSize: "24px", fontWeight: 800 }}>
              {busFactor}
            </span>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Domain Watermark */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ color: "#e4e4e7", fontSize: "15px", fontWeight: 700, fontFamily: "monospace" }}>
              getmerged.abhishekco.de
            </span>
            <span style={{ color: "#71717a", fontSize: "13px", fontFamily: "monospace" }}>
              /{fullName}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
