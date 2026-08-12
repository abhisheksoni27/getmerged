import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "opendoor - Glassdoor for Open Source Repositories";
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
            opendoor.abhishekco.de
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <span style={{ color: "#ffffff", fontSize: "56px", fontWeight: 800 }}>
            Glassdoor for Open Source
          </span>
          <span
            style={{
              color: "#d4d4d8",
              fontSize: "26px",
              maxWidth: "960px",
              lineHeight: 1.4,
            }}
          >
            Stop guessing which door is open. Discover public GitHub repositories where your pull requests are welcomed, reviewed fast, and merged.
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              backgroundColor: "#10b981",
              padding: "10px 24px",
              borderRadius: "12px",
              color: "#ffffff",
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            <span>C-Rank™ Index</span>
          </div>
          <span style={{ color: "#71717a", fontSize: "20px" }}>
            PR Merge Rates &bull; Response Times &bull; Beginner Friendly Repos
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
