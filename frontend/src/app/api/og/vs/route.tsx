import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { Repo } from "@/types/opendoor";
import { API_BASE_URL } from "@/lib/api";
import { computeVsVerdict, formatMetricValue, VsVerdict } from "@/lib/vs-verdict";

export const runtime = "nodejs";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function truncate(name: string, maxLen = 26): string {
  if (!name) return "Unknown Repo";
  return name.length <= maxLen ? name : name.slice(0, maxLen) + "…";
}

/** Server-side GitHub-derived data fetch, cached once per pair via fetch cache. */
async function fetchRepo(fullName: string): Promise<Repo | null> {
  if (!fullName || !fullName.includes("/")) return null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/repos?name=${encodeURIComponent(fullName)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rawList: unknown = data.data || data.repos;
    if (!Array.isArray(rawList)) return null;
    return (
      (rawList as Repo[]).find(
        (r) => r?.full_name && r.full_name.toLowerCase() === fullName.toLowerCase()
      ) || null
    );
  } catch (err) {
    console.error("og/vs fetchRepo error:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const a = (sp.get("a") || "").trim();
  const b = (sp.get("b") || "").trim();

  const [repoA, repoB] = await Promise.all([fetchRepo(a), fetchRepo(b)]);
  const nameA = repoA?.full_name || a;
  const nameB = repoB?.full_name || b;

  const verdict: VsVerdict =
    computeVsVerdict(nameA, nameB, repoA, repoB);

  const tie = verdict.isTie;
  const accentColor = tie ? "#d97706" : "#10b981";
  const verdictBg = tie ? "#fffbeb" : "#ecfdf5";
  const verdictBorder = tie ? "#fde68a" : "#a7f3d0";
  const verdictColor = tie ? "#b45309" : "#059669";

  const metricRows = verdict.metrics.map((m) => (
    <div
      key={m.key}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#2c333e",
        border: "1px solid #3f4a59",
        borderRadius: "14px",
        padding: "12px 24px",
        marginBottom: "10px",
      }}
    >
      <span style={{ color: "#fdfbf7", fontSize: "22px", fontWeight: 700 }}>
        {formatMetricValue(m.valueA, m.format)}
      </span>
      <span style={{ color: "#9ca3af", fontSize: "16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
        {m.label}
      </span>
      <span style={{ color: "#fdfbf7", fontSize: "22px", fontWeight: 700 }}>
        {formatMetricValue(m.valueB, m.format)}
      </span>
    </div>
  ));

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#222831",
          backgroundImage: "radial-gradient(circle at 25px 25px, #2c333e 2px, transparent 0)",
          backgroundSize: "40px 40px",
          padding: "48px 64px",
          fontFamily: "sans-serif",
          borderTop: `8px solid ${accentColor}`,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: accentColor }} />
            <span style={{ color: accentColor, fontSize: "20px", fontWeight: 700, letterSpacing: "1px" }}>
              GETMERGED • REPO VS REPO SHOWDOWN
            </span>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "18px", fontWeight: 500 }}>
            Should I Contribute?
          </span>
        </div>

        {/* Names + Verdict */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <span style={{ color: tie ? "#fdfbf7" : accentColor, fontSize: tie ? 38 : 44, fontWeight: 800, maxWidth: 420, textAlign: "right" }}>
              {truncate(nameA)}
            </span>
            <span style={{ color: "#6b7280", fontSize: 30, fontWeight: 700 }}>VS</span>
            <span style={{ color: tie ? "#fdfbf7" : accentColor, fontSize: tie ? 38 : 44, fontWeight: 800, maxWidth: 420, textAlign: "left" }}>
              {truncate(nameB)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "10px 26px",
              borderRadius: "9999px",
              backgroundColor: verdictBg,
              border: `2px solid ${verdictBorder}`,
              color: verdictColor,
              fontSize: "24px",
              fontWeight: 800,
            }}
          >
            {verdict.label}
          </div>
        </div>

        {/* Headline metrics */}
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>{metricRows}</div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "20px", borderTop: "1px solid #374151", width: "100%" }}>
          <span style={{ color: "#d4d4d8", fontSize: "18px", fontWeight: 500 }}>
            ⚡ Maintainer responsiveness & merge velocity, decided.
          </span>
          <span style={{ color: accentColor, fontSize: "18px", fontWeight: 700 }}>
            getmerged.abhishekco.de
          </span>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate",
      },
    }
  );
}
