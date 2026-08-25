import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getEvaluation } from "@/lib/pr-eval-store";
import { getEvalOutcome } from "@/lib/eval-outcome-client";
import { formatVerdict } from "@/lib/pr-verdict";

export const runtime = "nodejs";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function truncateRepoName(name: string, maxLen = 24): string {
  if (!name) return "Unknown Repo";
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen) + "…";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = req.nextUrl.searchParams;

  const stored = getEvaluation(id);

  const repoRaw = stored?.repo || searchParams.get("repo") || "Unknown Repository";
  const repoDisplay = truncateRepoName(repoRaw, 24);

  const rawScore = stored?.score !== undefined ? stored.score : (searchParams.get("score") ? parseFloat(searchParams.get("score")!) : null);
  const scoreDisplay = rawScore !== null && !isNaN(rawScore) ? `${Math.round(rawScore)}` : "—";

  const verdict = stored?.verdict || searchParams.get("verdict") || (rawScore !== null && rawScore >= 70 ? "PRE-FLIGHT READY" : "ADJUSTMENTS RECOMMENDED");
  const isReady = verdict.toUpperCase().includes("READY");

  const verdictLabel = isReady ? "PRE-FLIGHT READY" : "ADJUSTMENTS RECOMMENDED";
  const verdictColor = isReady ? "#059669" : "#d97706";
  const verdictBg = isReady ? "#ecfdf5" : "#fffbeb";
  const verdictBorder = isReady ? "#a7f3d0" : "#fde68a";

  // Verified outcome (AC1/AC5): rendered from the same verdict field as the
  // share page and dashboard cards. Absent -> card stays a static snapshot.
  const outcome = await getEvalOutcome(id);
  const outcomeView = formatVerdict(outcome);
  const outcomeStyles: Record<string, { bg: string; color: string; border: string }> = {
    good: { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
    bad: { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
    muted: { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" },
  };
  const os = outcomeView ? outcomeStyles[outcomeView.tone] : null;

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
          padding: "56px 64px",
          fontFamily: "sans-serif",
          borderTop: "8px solid #10b981",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
              }}
            />
            <span style={{ color: "#10b981", fontSize: "20px", fontWeight: 700, letterSpacing: "1px" }}>
              GETMERGED • PRE-FLIGHT EVALUATION
            </span>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "18px", fontWeight: 500 }}>
            Open Source Contributor Intelligence
          </span>
        </div>

        {/* Center Content */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "680px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ color: "#9ca3af", fontSize: "16px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1.5px" }}>
                Target Repository
              </span>
              <span style={{ color: "#fdfbf7", fontSize: "52px", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1 }}>
                {repoDisplay}
              </span>
            </div>

            {/* Verdict Badge */}
            <div style={{ display: "flex", alignItems: "center", marginTop: "12px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 20px",
                  borderRadius: "9999px",
                  backgroundColor: verdictBg,
                  border: `2px solid ${verdictBorder}`,
                  color: verdictColor,
                  fontSize: "20px",
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                }}
              >
                {verdictLabel}
              </div>
            </div>

            {/* Verified Outcome pill (AC1) — e.g. 'Predicted 82% → Merged in 4 days ✓' */}
            {outcomeView && os && (
              <div style={{ display: "flex", alignItems: "center", marginTop: "12px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "8px 18px",
                    borderRadius: "9999px",
                    backgroundColor: os.bg,
                    border: `2px solid ${os.border}`,
                    color: os.color,
                    fontSize: "18px",
                    fontWeight: 800,
                    letterSpacing: "0.3px",
                  }}
                >
                  {outcomeView.text}
                </div>
              </div>
            )}
          </div>

          {/* Score Tile */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#2c333e",
              border: "2px solid #3f4a59",
              borderRadius: "24px",
              padding: "32px 48px",
              minWidth: "240px",
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline" }}>
              <span style={{ color: "#fdfbf7", fontSize: "72px", fontWeight: 800, lineHeight: 1 }}>
                {scoreDisplay}
              </span>
              {scoreDisplay !== "—" && (
                <span style={{ color: "#9ca3af", fontSize: "28px", fontWeight: 600, marginLeft: "4px" }}>
                  /100
                </span>
              )}
            </div>
            <span style={{ color: "#9ca3af", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginTop: "8px" }}>
              Evaluation Score
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid #374151",
            width: "100%",
          }}
        >
          <span style={{ color: "#d4d4d8", fontSize: "18px", fontWeight: 500 }}>
            ⚡ Explore repo C-Rank & PR acceptance analytics
          </span>
          <span style={{ color: "#10b981", fontSize: "18px", fontWeight: 700 }}>
            getmerged.abhishekco.de
          </span>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
