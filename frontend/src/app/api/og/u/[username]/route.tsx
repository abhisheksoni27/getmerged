import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getPublicProfile, isReservedUsername, isValidUsername } from "@/lib/public-profile";
import { checkRateLimit, clientIpFromRequest } from "@/lib/og-rate-limit";

export const runtime = "nodejs";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;

// AC3: HTML and OG responses ship no CDN caching until a tag-based purge path
// exists for is_public flips.
const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" } as const;

// AC5: the OG endpoint requires the target user.isPublic=true - anything else
// returns a 404 with no image, so private data is never rendered.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`og-u:${ip}`);
  if (!rl.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { ...NO_STORE_HEADERS, "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  const { username } = await params;

  if (!username || !isValidUsername(username) || isReservedUsername(username)) {
    return new Response("Not Found", { status: 404, headers: NO_STORE_HEADERS });
  }

  const profile = await getPublicProfile(username);
  if (!profile || !profile.is_public) {
    return new Response("Not Found", { status: 404, headers: NO_STORE_HEADERS });
  }

  const accuracyPct =
    profile.accuracy_rate !== null && profile.accuracy_n > 0 && profile.total_evals > 0
      ? `${Math.round(profile.accuracy_rate * 100)}%`
      : null;
  const repos =
    profile.repos.length > 0 ? profile.repos.slice(0, 4) : [];

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
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#10b981" }} />
            <span style={{ color: "#10b981", fontSize: "20px", fontWeight: 700, letterSpacing: "1px" }}>
              GETMERGED • CONTRIBUTOR TRACK RECORD
            </span>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "18px", fontWeight: 500 }}>
            Verified PR Forecasts
          </span>
        </div>

        {/* Center */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "660px" }}>
            <span style={{ color: "#fdfbf7", fontSize: "56px", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1 }}>
              @{profile.username}
            </span>
            {profile.total_evals > 0 ? (
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                {[
                  { label: "EVALS", value: `${profile.total_evals}` },
                  ...(accuracyPct !== null
                    ? [{ label: "ACCURACY", value: accuracyPct }]
                    : []),
                  { label: "MERGED", value: `${profile.merged_count}` },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "8px",
                      backgroundColor: "#2c333e",
                      border: "2px solid #3f4a59",
                      borderRadius: "9999px",
                      padding: "10px 22px",
                    }}
                  >
                    <span style={{ color: "#fdfbf7", fontSize: "26px", fontWeight: 800 }}>{chip.value}</span>
                    <span style={{ color: "#9ca3af", fontSize: "15px", fontWeight: 700 }}>{chip.label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ color: "#9ca3af", fontSize: "24px", fontWeight: 600 }}>No forecasts yet</span>
            )}
          </div>

          {repos.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                backgroundColor: "#2c333e",
                border: "2px solid #3f4a59",
                borderRadius: "24px",
                padding: "28px 36px",
              }}
            >
              <span style={{ color: "#9ca3af", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>
                Merged into (C-Rank)
              </span>
              {repos.map((repo) => (
                <div key={repo.full_name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px" }}>
                  <span style={{ color: "#d4d4d8", fontSize: "20px", fontWeight: 600 }}>
                    {repo.full_name.length > 22 ? repo.full_name.slice(0, 22) + "…" : repo.full_name}
                  </span>
                  <span style={{ color: "#10b981", fontSize: "20px", fontWeight: 800, fontFamily: "monospace" }}>
                    {repo.c_rank_tier}
                  </span>
                </div>
              ))}
            </div>
          )}
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
            ⚡ Verify your own merge forecast free
          </span>
          <span style={{ color: "#10b981", fontSize: "18px", fontWeight: 700 }}>
            getmerged.abhishekco.de/u/{profile.slug}
          </span>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      headers: {
        // AC3: no CDN caching while the is_public flip lacks a purge path.
        ...NO_STORE_HEADERS,
      },
    }
  );
}
