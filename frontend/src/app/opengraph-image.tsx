import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GetMerged - Glassdoor for Open Source Repositories";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function Image() {
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
          borderTop: "6px solid #10b981",
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 16px #10b981",
              }}
            />
            <span
              style={{
                color: "#ffffff",
                fontSize: "26px",
                fontWeight: 800,
                letterSpacing: "-0.5px",
              }}
            >
              GetMerged
            </span>
            <span
              style={{
                color: "#10b981",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "1.2px",
                textTransform: "uppercase",
                backgroundColor: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "4px 12px",
                borderRadius: "999px",
              }}
            >
              Open Source Telemetry
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "6px 16px",
              borderRadius: "999px",
              color: "#a1a1aa",
              fontSize: "16px",
              fontFamily: "monospace",
            }}
          >
            <span>102,480 Repos Scored Nightly</span>
          </div>
        </div>

        {/* Hero Value Proposition */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "1000px" }}>
          <span
            style={{
              color: "#f4f4f5",
              fontSize: "54px",
              fontWeight: 900,
              letterSpacing: "-1.5px",
              lineHeight: 1.1,
            }}
          >
            Where Pull Requests Don’t Go to Die.
          </span>
          <span
            style={{
              color: "#a1a1aa",
              fontSize: "23px",
              lineHeight: 1.45,
              fontWeight: 400,
            }}
          >
            Stop guessing maintainer responsiveness. Live review latency, merge rates, and first-timer acceptance scores across 102k+ public GitHub repositories.
          </span>
        </div>

        {/* Dynamic Metric Telemetry Cards */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.09)",
            borderRadius: "18px",
            padding: "18px 26px",
          }}
        >
          {/* Card 1: C-Rank */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#10b981",
                color: "#000000",
                padding: "8px 20px",
                borderRadius: "10px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 900, letterSpacing: "1px", textTransform: "uppercase" }}>
                C-Rank™
              </span>
              <span style={{ fontSize: "28px", fontWeight: 900, lineHeight: 1 }}>
                TIER S
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700 }}>
                Contributor Readiness
              </span>
              <span style={{ color: "#71717a", fontSize: "13px" }}>
                9-signal maintainer index
              </span>
            </div>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Metric 1 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              Median Response
            </span>
            <span style={{ color: "#38bdf8", fontSize: "24px", fontWeight: 800 }}>
              &lt; 2.4 hrs
            </span>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Metric 2 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              External Merge Rate
            </span>
            <span style={{ color: "#10b981", fontSize: "24px", fontWeight: 800 }}>
              88.4%
            </span>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Metric 3 */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <span style={{ color: "#71717a", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 700 }}>
              First-Timer
            </span>
            <span style={{ color: "#c084fc", fontSize: "24px", fontWeight: 800 }}>
              Top 5%
            </span>
          </div>

          <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.1)" }} />

          {/* Brand mark right */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#e4e4e7",
              fontSize: "15px",
              fontWeight: 700,
              fontFamily: "monospace",
            }}
          >
            getmerged.abhishekco.de
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
