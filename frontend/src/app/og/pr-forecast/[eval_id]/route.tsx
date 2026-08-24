import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { verifyForecastToken, getCachedSnapshot } from "@/lib/pr-forecast-share";

export const runtime = "nodejs";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

function truncateRepoName(name: string, maxLen = 24): string {
  if (!name) return "Unknown Repo";
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen) + "…";
}

function renderExpiredPlaceholder() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#18181b",
          color: "#ffffff",
          fontFamily: "sans-serif",
          padding: "60px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#27272a",
            marginBottom: "24px",
            fontSize: "36px",
          }}
        >
          ⏱️
        </div>
        <div style={{ fontSize: "44px", fontWeight: 800, color: "#f4f4f5", marginBottom: "16px" }}>
          Forecast Expired
        </div>
        <div style={{ fontSize: "22px", color: "#a1a1aa", maxWidth: "600px", lineHeight: 1.4 }}>
          This preflight forecast snapshot is no longer active or the share token is invalid. Run a fresh evaluation on GetMerged.
        </div>
        <div
          style={{
            marginTop: "36px",
            fontSize: "18px",
            color: "#10b981",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>getmerged.abhishekco.de</span>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      status: 200,
    }
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eval_id: string }> }
) {
  const { eval_id } = await params;
  const searchParams = req.nextUrl.searchParams;
  const token = searchParams.get("t") || "";
  const queryRepo = searchParams.get("repo") || "";
  const queryScore = searchParams.get("score");
  const queryReady = searchParams.get("ready");
  const queryStatus = searchParams.get("status");

  // AC2: Token verification (HMAC with 30-day validity); invalid/expired returns HTTP 200 static placeholder
  if (!verifyForecastToken(eval_id, token)) {
    return renderExpiredPlaceholder();
  }

  // AC5: Try server-side cached eval snapshot (24h TTL) or fallback
  const cached = getCachedSnapshot(eval_id);

  // Extract public-safe fields ONLY (AC3)
  const repoRaw = cached?.repo_name || queryRepo || "Unknown Repository";
  const repoDisplay = truncateRepoName(repoRaw, 24); // AC4: truncated at 24 chars with ellipsis

  const status = cached?.status || queryStatus;
  const isPendingOrFailed = status === "pending" || status === "failed";

  // Score display: missing score shows '—' (AC4)
  let scoreDisplay = "—";
  const rawScore = cached?.overall_score !== undefined ? cached.overall_score : (queryScore !== null ? parseFloat(queryScore) : null);
  if (rawScore !== null && !isNaN(rawScore)) {
    scoreDisplay = `${Math.round(rawScore)}`;
  }

  // Verdict display: pending/failed show state label instead of verdict (AC4)
  let verdictLabel = "PRE-FLIGHT READY";
  let verdictColor = "#059669";
  let verdictBg = "#ecfdf5";
  let verdictBorder = "#a7f3d0";

  if (isPendingOrFailed) {
    verdictLabel = status === "pending" ? "EVALUATION PENDING" : "EVALUATION FAILED";
    verdictColor = "#6b7280";
    verdictBg = "#f3f4f6";
    verdictBorder = "#d1d5db";
  } else {
    const isReady = cached?.ready_to_merge !== undefined ? cached.ready_to_merge : (queryReady === "true" || (rawScore !== null && rawScore >= 70));
    if (!isReady) {
      verdictLabel = "ADJUSTMENTS RECOMMENDED";
      verdictColor = "#d97706";
      verdictBg = "#fffbeb";
      verdictBorder = "#fde68a";
    }
  }

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
              GETMERGED • PRE-FLIGHT FORECAST
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
              Pre-flight Score
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
            ⚡ Explore repo C-Rank & acceptance analytics
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
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    }
  );
}
