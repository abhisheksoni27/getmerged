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
          backgroundColor: "#07090F",
          backgroundImage:
            "radial-gradient(circle at 10% 0%, rgba(130, 80, 223, 0.22) 0%, transparent 45%), radial-gradient(circle at 90% 100%, rgba(88, 166, 255, 0.12) 0%, transparent 50%), linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)",
          backgroundSize: "100% 100%, 100% 100%, 48px 48px, 48px 48px",
          padding: "48px 56px",
          fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          boxSizing: "border-box",
        }}
      >
        {/* ── TOP NAV BAR ── */}
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Brand mark */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #8250DF 0%, #4F46E5 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 20px rgba(130, 80, 223, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontSize: "20px",
                  fontWeight: 900,
                  fontFamily: "monospace",
                }}
              >
                ⌘
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
              <span
                style={{
                  color: "#F0F6FC",
                  fontSize: "26px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                Get
              </span>
              <span
                style={{
                  color: "#A371F7",
                  fontSize: "26px",
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                Merged
              </span>
            </div>
            <div
              style={{
                marginLeft: "8px",
                color: "#8B949E",
                fontSize: "13px",
                fontWeight: 600,
                borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
                paddingLeft: "12px",
              }}
            >
              Glassdoor for Open Source
            </div>
          </div>

          {/* Right Live Scope Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              padding: "6px 14px",
              borderRadius: "999px",
            }}
          >
            <div
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#3FB950",
                boxShadow: "0 0 8px #3FB950",
              }}
            />
            <span
              style={{
                color: "#C9D1D9",
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "-0.1px",
              }}
            >
              153,900+ Repos Scored Daily
            </span>
          </div>
        </div>

        {/* ── HERO HEADLINE ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxWidth: "1060px",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#A371F7",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
            }}
          >
            <span>EMPIRICAL CONTRIBUTOR TELEMETRY</span>
          </div>
          <span
            style={{
              color: "#F0F6FC",
              fontSize: "52px",
              fontWeight: 900,
              letterSpacing: "-1.8px",
              lineHeight: 1.08,
            }}
          >
            Find welcoming repos.
            <br />
            Get your PR merged in 24 hours.
          </span>
          <span
            style={{
              color: "#8B949E",
              fontSize: "20px",
              lineHeight: 1.45,
              fontWeight: 400,
              maxWidth: "960px",
            }}
          >
            Stop guessing maintainer responsiveness. Live review latency, outside merge rates, and first-timer acceptance scores across 150k+ GitHub projects.
          </span>
        </div>

        {/* ── MOCK INSPECTOR CARD ── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#0D111A",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.7)",
          }}
        >
          {/* Card Titlebar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 18px",
              backgroundColor: "rgba(255, 255, 255, 0.02)",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.15)" }} />
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.15)" }} />
                <div style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: "rgba(255, 255, 255, 0.15)" }} />
              </div>
              <span style={{ color: "#6E7681", fontSize: "12px", fontFamily: "monospace" }}>
                c-rank-audit: astropy/astropy
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span
                style={{
                  color: "#3FB950",
                  fontSize: "11px",
                  fontWeight: 700,
                  backgroundColor: "rgba(63, 185, 80, 0.12)",
                  border: "1px solid rgba(63, 185, 80, 0.25)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                }}
              >
                TIER S · SUPER WELCOMING
              </span>
            </div>
          </div>

          {/* Card Body: 4 Columns */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px",
            }}
          >
            {/* Metric 1: C-Rank Index */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  color: "#6E7681",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                C-Rank™ Score
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ color: "#A371F7", fontSize: "30px", fontWeight: 900, lineHeight: 1 }}>
                  89.4
                </span>
                <span style={{ color: "#8B949E", fontSize: "13px", fontWeight: 600 }}>
                  / 100
                </span>
              </div>
            </div>

            <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Metric 2: PR Merge Rate */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  color: "#6E7681",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                Outside Merge Rate
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ color: "#F0F6FC", fontSize: "30px", fontWeight: 900, lineHeight: 1 }}>
                  88.4%
                </span>
                <span style={{ color: "#3FB950", fontSize: "12px", fontWeight: 700 }}>
                  High
                </span>
              </div>
            </div>

            <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Metric 3: First Response Latency */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  color: "#6E7681",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                Median Review Time
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ color: "#58A6FF", fontSize: "30px", fontWeight: 900, lineHeight: 1 }}>
                  &lt; 3.2h
                </span>
                <span style={{ color: "#8B949E", fontSize: "12px", fontWeight: 600 }}>
                  turnaround
                </span>
              </div>
            </div>

            <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Metric 4: First-Timer Success */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span
                style={{
                  color: "#6E7681",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.8px",
                  textTransform: "uppercase",
                }}
              >
                First-Timer Success
              </span>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
                <span style={{ color: "#D29922", fontSize: "30px", fontWeight: 900, lineHeight: 1 }}>
                  94%
                </span>
                <span style={{ color: "#8B949E", fontSize: "12px", fontWeight: 600 }}>
                  welcoming
                </span>
              </div>
            </div>

            <div style={{ width: "1px", height: "42px", backgroundColor: "rgba(255, 255, 255, 0.08)" }} />

            {/* Domain */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
              <span style={{ color: "#F0F6FC", fontSize: "14px", fontWeight: 700, fontFamily: "monospace" }}>
                getmerged.abhishekco.de
              </span>
              <span style={{ color: "#6E7681", fontSize: "12px" }}>
                100% Free Developer Tool
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
