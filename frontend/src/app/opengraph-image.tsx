import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GetMerged — Glassdoor for Open Source Repositories";
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
          backgroundColor: "#07090e",
          backgroundImage:
            "radial-gradient(ellipse 900px 500px at 15% -10%, rgba(16, 185, 129, 0.18), transparent 60%), radial-gradient(ellipse 700px 400px at 85% 110%, rgba(56, 189, 248, 0.12), transparent 60%)",
          padding: "48px 60px 42px 60px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          position: "relative",
          boxSizing: "border-box",
        }}
      >
        {/* Top Accent Line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background: "linear-gradient(90deg, #10b981 0%, #38bdf8 55%, #a855f7 100%)",
          }}
        />

        {/* ── TOP HEADER: Logo & Global Metric Badge ── */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Logo Mark + Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 24px rgba(16, 185, 129, 0.35)",
              }}
            >
              {/* Git PR merge icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="6" cy="6" r="3" fill="#ffffff" />
                <circle cx="6" cy="18" r="3" fill="#ffffff" />
                <circle cx="18" cy="10" r="3" fill="#ffffff" />
                <path d="M6 9v6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M6 15c0-4 4-5 12-5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
              </svg>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "28px",
                  fontWeight: 900,
                  letterSpacing: "-0.6px",
                }}
              >
                GetMerged
              </span>
              <span
                style={{
                  color: "#10b981",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  padding: "3px 9px",
                  borderRadius: "6px",
                }}
              >
                C-Rank™ Telemetry
              </span>
            </div>
          </div>

          {/* Right Live Scope Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "9px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.09)",
              padding: "7px 16px",
              borderRadius: "999px",
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 10px #10b981",
              }}
            />
            <span
              style={{
                color: "#f4f4f5",
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "-0.2px",
              }}
            >
              153,900+ Repos Scored Daily
            </span>
          </div>
        </div>

        {/* ── HERO HEADLINE & VALUE PROP ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            maxWidth: "1080px",
            marginTop: "6px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#38bdf8",
              fontSize: "15px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            <span>The Glassdoor for Open Source</span>
          </div>
          <span
            style={{
              color: "#ffffff",
              fontSize: "50px",
              fontWeight: 900,
              letterSpacing: "-1.8px",
              lineHeight: 1.1,
            }}
          >
            Know if maintainers merge PRs before you write a single line of code.
          </span>
          <span
            style={{
              color: "#94a3b8",
              fontSize: "21px",
              lineHeight: 1.45,
              fontWeight: 400,
              maxWidth: "960px",
            }}
          >
            Independent contributor readiness scores, median review latency, real external merge rates, and first-timer acceptance across 150k+ GitHub projects.
          </span>
        </div>

        {/* ── CARD: LIVE TELEMETRY SHOWCASE ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "16px",
            padding: "18px 26px",
            boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Badge: C-Rank Welcoming */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#10b981",
                padding: "8px 18px",
                borderRadius: "10px",
                boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
              }}
            >
              <span
                style={{
                  color: "#022c22",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                }}
              >
                C-Rank™
              </span>
              <span
                style={{
                  color: "#022c22",
                  fontSize: "24px",
                  fontWeight: 900,
                  lineHeight: 1.1,
                }}
              >
                TIER S
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ color: "#ffffff", fontSize: "16px", fontWeight: 800 }}>
                  ★ Super Welcoming
                </span>
                <span
                  style={{
                    color: "#34d399",
                    fontSize: "11px",
                    fontWeight: 700,
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  TOP 5%
                </span>
              </div>
              <span style={{ color: "#64748b", fontSize: "12px", fontWeight: 500 }}>
                High-confidence 9-signal contributor index
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "46px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

          {/* Metric 1: Merge Rate */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              External PR Merge Rate
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ color: "#10b981", fontSize: "26px", fontWeight: 900, lineHeight: 1 }}>
                89.4%
              </span>
              <span style={{ color: "#475569", fontSize: "12px", fontWeight: 600 }}>
                vs 28% avg
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "46px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

          {/* Metric 2: Turnaround Latency */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              Median Review Time
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ color: "#38bdf8", fontSize: "26px", fontWeight: 900, lineHeight: 1 }}>
                &lt; 3.2h
              </span>
              <span style={{ color: "#475569", fontSize: "12px", fontWeight: 600 }}>
                turnaround
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "46px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

          {/* Metric 3: First-Timer Success */}
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            <span
              style={{
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              First-Timer Success
            </span>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ color: "#c084fc", fontSize: "26px", fontWeight: 900, lineHeight: 1 }}>
                94.1%
              </span>
              <span style={{ color: "#475569", fontSize: "12px", fontWeight: 600 }}>
                friendly
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: "1px", height: "46px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

          {/* Domain & Free Tag */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "3px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 800,
                fontFamily: "monospace",
              }}
            >
              <span>getmerged.abhishekco.de</span>
            </div>
            <span style={{ color: "#10b981", fontSize: "12px", fontWeight: 700 }}>
              100% Free &amp; Open
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
