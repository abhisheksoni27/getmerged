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
  let busFactor = "4 active";
  let gfiCount = 0;
  let activeStatus = "Active";

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
          if (repo.good_first_issue_count !== undefined) {
            gfiCount = Number(repo.good_first_issue_count);
          }
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
            busFactor = repo.bus_factor >= 2 ? `${repo.bus_factor} devs` : "Solo core";
          }
          if (repo.currently_active !== undefined) {
            activeStatus = repo.currently_active ? "Active" : "Quiet";
          }
        }
      }
    }
  } catch (e) {
    console.error("OG image fetch failed:", e);
  }

  const getTierDetails = (t: string) => {
    switch (t.toUpperCase()) {
      case "S":
        return {
          accent: "#10b981",
          subtle: "rgba(16, 185, 129, 0.14)",
          border: "rgba(16, 185, 129, 0.35)",
          verdict: "TOP-TIER WELCOMING",
        };
      case "A":
        return {
          accent: "#38bdf8",
          subtle: "rgba(56, 189, 248, 0.14)",
          border: "rgba(56, 189, 248, 0.35)",
          verdict: "HIGHLY RESPONSIVE",
        };
      case "B":
        return {
          accent: "#a855f7",
          subtle: "rgba(168, 85, 247, 0.14)",
          border: "rgba(168, 85, 247, 0.35)",
          verdict: "SELECTIVE MERGES",
        };
      case "C":
        return {
          accent: "#f59e0b",
          subtle: "rgba(245, 158, 11, 0.14)",
          border: "rgba(245, 158, 11, 0.35)",
          verdict: "HIGH LATENCY",
        };
      default:
        return {
          accent: "#ef4444",
          subtle: "rgba(239, 68, 68, 0.14)",
          border: "rgba(239, 68, 68, 0.35)",
          verdict: "MAINTAINER STALLED",
        };
    }
  };

  const tierMeta = getTierDetails(tier);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#06080d",
          backgroundImage:
            "radial-gradient(ellipse at top left, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(56, 189, 248, 0.06) 0%, transparent 50%)",
          padding: "44px 54px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle Outer Border Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "5px",
            backgroundColor: tierMeta.accent,
          }}
        />

        {/* ── TOP NAV / BRAND BAR ── */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Logo & Category */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  backgroundColor: "#06080d",
                }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ color: "#ffffff", fontSize: "24px", fontWeight: 900, letterSpacing: "-0.5px" }}>
                  GetMerged
                </span>
                <span
                  style={{
                    color: tierMeta.accent,
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    backgroundColor: tierMeta.subtle,
                    border: `1px solid ${tierMeta.border}`,
                    padding: "2px 8px",
                    borderRadius: "6px",
                  }}
                >
                  {tierMeta.verdict}
                </span>
              </div>
              <span style={{ color: "#71717a", fontSize: "13px", fontWeight: 500 }}>
                GitHub Maintainer Responsiveness & Review Index
              </span>
            </div>
          </div>

          {/* Repo Quick Tags */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Stars Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "6px 14px",
                borderRadius: "8px",
                color: "#f4f4f5",
                fontSize: "15px",
                fontWeight: 700,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
              <span>{stars}</span>
            </div>

            {/* Language Pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "6px 14px",
                borderRadius: "8px",
                color: "#e4e4e7",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              <span>{language}</span>
            </div>

            {/* Activity Status */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                backgroundColor: activeStatus === "Active" ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.05)",
                border: activeStatus === "Active" ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(255, 255, 255, 0.1)",
                padding: "6px 14px",
                borderRadius: "8px",
                color: activeStatus === "Active" ? "#34d399" : "#a1a1aa",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: activeStatus === "Active" ? "#10b981" : "#71717a",
                }}
              />
              <span>{activeStatus}</span>
            </div>
          </div>
        </div>

        {/* ── CENTER HERO: REPO NAME & DESCRIPTION ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px", marginBottom: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                color: "#ffffff",
                fontSize: fullName.length > 25 ? "44px" : "54px",
                fontWeight: 900,
                letterSpacing: "-1.5px",
                lineHeight: 1.1,
              }}
            >
              {fullName}
            </span>
          </div>
          <span
            style={{
              color: "#94a3b8",
              fontSize: "21px",
              lineHeight: 1.4,
              maxWidth: "1080px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {description}
          </span>
        </div>

        {/* ── BOTTOM HERO: 4-COLUMN HIGH-IMPACT METRICS PANEL ── */}
        <div
          style={{
            display: "flex",
            width: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            border: `1px solid ${tierMeta.border}`,
            borderRadius: "18px",
            padding: "20px 26px",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 16px 36px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Tile 1: C-Rank Tier & Score */}
          <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: tierMeta.accent,
                color: "#04070b",
                padding: "10px 22px",
                borderRadius: "12px",
                minWidth: "120px",
                boxShadow: `0 0 24px ${tierMeta.accent}44`,
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                C-RANK™
              </span>
              <span style={{ fontSize: "36px", fontWeight: 900, letterSpacing: "-1px", lineHeight: 1 }}>
                TIER {tier}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ color: "#ffffff", fontSize: "30px", fontWeight: 900 }}>
                  {score}
                </span>
                <span style={{ color: "#64748b", fontSize: "16px", fontWeight: 700 }}>
                  / 100
                </span>
              </div>
              <span style={{ color: "#94a3b8", fontSize: "13px", fontWeight: 600 }}>
                180-Day Global Rating
              </span>
            </div>
          </div>

          <div style={{ width: "1px", height: "54px", backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

          {/* Tile 2: External Merge Rate */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ color: "#94a3b8", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Merge Rate
            </span>
            <span style={{ color: "#10b981", fontSize: "32px", fontWeight: 900, letterSpacing: "-0.5px" }}>
              {mergeRate}
            </span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
              Outside pull requests
            </span>
          </div>

          <div style={{ width: "1px", height: "54px", backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

          {/* Tile 3: Response Speed */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ color: "#94a3b8", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              First Response
            </span>
            <span style={{ color: "#38bdf8", fontSize: "32px", fontWeight: 900, letterSpacing: "-0.5px" }}>
              {responseTime}
            </span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
              Maintainer initial reply
            </span>
          </div>

          <div style={{ width: "1px", height: "54px", backgroundColor: "rgba(255, 255, 255, 0.12)" }} />

          {/* Tile 4: GFIs or Active Core */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ color: "#94a3b8", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              {gfiCount > 0 ? "Good First Issues" : "Maintainer Core"}
            </span>
            <span style={{ color: gfiCount > 0 ? "#fbbf24" : "#c084fc", fontSize: "32px", fontWeight: 900, letterSpacing: "-0.5px" }}>
              {gfiCount > 0 ? `${gfiCount} Open` : busFactor}
            </span>
            <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 600 }}>
              {gfiCount > 0 ? "Ready for beginners" : "Reviewer capacity"}
            </span>
          </div>
        </div>

        {/* ── FOOTER BAR ── */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "6px",
          }}
        >
          <span style={{ color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
            Know maintainer turnaround before you push your pull request.
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#94a3b8", fontSize: "14px", fontWeight: 700 }}>
              getmerged.abhishekco.de
            </span>
            <span style={{ color: "#64748b", fontSize: "14px" }}>
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

