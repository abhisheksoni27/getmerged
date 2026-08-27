import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { backendBase } from "@/lib/eval-outcome-client";
import { checkRateLimit, clientIpFromRequest } from "@/lib/og-rate-limit";

export const runtime = "nodejs";

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const TEMPLATE = "report_card";

interface LangRow {
  language: string;
  count: number;
}
interface TierRow {
  tier: string;
  repo_count: number;
}
interface ReportCard {
  username: string;
  slug: string;
  avatar_url?: string;
  merged_pr_count: number;
  first_merge_at: string | null;
  top_languages: LangRow[];
  c_rank_tiers: TierRow[];
}

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600",
} as const;

function truncate(name: string, maxLen = 26): string {
  if (!name) return "—";
  return name.length <= maxLen ? name : name.slice(0, maxLen) + "…";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
}

// Neutral placeholder card for non-renderable states (user not found / private).
function placeholderCard(headline: string, sub: string) {
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
          gap: "18px",
          backgroundColor: "#222831",
          padding: "48px 64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#9ca3af" }} />
        <span style={{ color: "#fdfbf7", fontSize: "44px", fontWeight: 800, letterSpacing: "-1px" }}>{headline}</span>
        <span style={{ color: "#9ca3af", fontSize: "22px", fontWeight: 500 }}>{sub}</span>
        <span style={{ color: "#6b7280", fontSize: "18px", fontWeight: 700, letterSpacing: "1px", marginTop: "12px" }}>
          GETMERGED
        </span>
      </div>
    ),
    { width: CARD_WIDTH, height: CARD_HEIGHT, headers: CACHE_HEADERS }
  );
}

function reportCard(card: ReportCard, etag?: string) {
  const zero = card.merged_pr_count === 0;
  const langs = (card.top_languages || []).slice(0, 4);
  const tiers = (card.c_rank_tiers || []).filter((t) => t && t.tier);

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
          borderTop: "8px solid #10b981",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#10b981" }} />
            <span style={{ color: "#10b981", fontSize: "20px", fontWeight: 700, letterSpacing: "1px" }}>
              GETMERGED • CONTRIBUTOR REPORT CARD
            </span>
          </div>
          <span style={{ color: "#9ca3af", fontSize: "18px", fontWeight: 500 }}>Verified merges</span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "36px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px", maxWidth: "640px" }}>
            <span style={{ color: "#fdfbf7", fontSize: "54px", fontWeight: 800, letterSpacing: "-1px", lineHeight: 1.1 }}>
              @{card.username}
            </span>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", backgroundColor: "#2c333e", border: "2px solid #3f4a59", borderRadius: "9999px", padding: "10px 22px" }}>
                <span style={{ color: "#fdfbf7", fontSize: "26px", fontWeight: 800 }}>{card.merged_pr_count}</span>
                <span style={{ color: "#9ca3af", fontSize: "15px", fontWeight: 700 }}>MERGED PRs</span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "8px", backgroundColor: "#2c333e", border: "2px solid #3f4a59", borderRadius: "9999px", padding: "10px 22px" }}>
                <span style={{ color: "#fdfbf7", fontSize: "22px", fontWeight: 800 }}>{fmtDate(card.first_merge_at)}</span>
                <span style={{ color: "#9ca3af", fontSize: "15px", fontWeight: 700 }}>FIRST MERGE</span>
              </div>
            </div>
            {zero ? (
              <span style={{ color: "#fbbf24", fontSize: "22px", fontWeight: 700, backgroundColor: "#3a2f12", border: "2px solid #6b5410", borderRadius: "9999px", padding: "6px 18px", alignSelf: "flex-start" }}>
                No merges yet
              </span>
            ) : (
              langs.length > 0 && (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {langs.map((l) => (
                    <span key={l.language} style={{ color: "#d4d4d8", fontSize: "18px", fontWeight: 600, backgroundColor: "#2c333e", border: "1px solid #3f4a59", borderRadius: "10px", padding: "6px 14px" }}>
                      {l.language} · {l.count}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>

          {/* C-Rank tiers (omitted entirely when zero merges — no div-by-zero) */}
          {!zero && tiers.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", backgroundColor: "#2c333e", border: "2px solid #3f4a59", borderRadius: "24px", padding: "24px 32px" }}>
              <span style={{ color: "#9ca3af", fontSize: "14px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>C-Rank tiers</span>
              {tiers.map((t) => (
                <div key={t.tier} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "18px" }}>
                  <span style={{ color: "#10b981", fontSize: "22px", fontWeight: 800, fontFamily: "monospace" }}>{t.tier}</span>
                  <span style={{ color: "#9ca3af", fontSize: "18px", fontWeight: 600 }}>{t.repo_count} repos</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "20px", borderTop: "1px solid #374151", width: "100%" }}>
          <span style={{ color: "#d4d4d8", fontSize: "18px", fontWeight: 500 }}>
            ⚡ Prove your open-source track record
          </span>
          <span style={{ color: "#10b981", fontSize: "18px", fontWeight: 700 }}>
            getmerged.com/u/{card.slug || card.username}
          </span>
        </div>
      </div>
    ),
    {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      headers: etag ? { ...CACHE_HEADERS, ETag: etag } : CACHE_HEADERS,
    }
  );
}

export async function GET(req: NextRequest) {
  const ip = clientIpFromRequest(req);
  const rl = checkRateLimit(`og:${ip}`);
  if (!rl.ok) {
    return new Response("Too Many Requests", {
      status: 429,
      headers: { ...CACHE_HEADERS, "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  const sp = req.nextUrl.searchParams;
  const template = (sp.get("template") || "").trim();
  const user = (sp.get("user") || "").trim();

  if (template !== TEMPLATE) {
    return new Response("Unsupported template", { status: 400, headers: CACHE_HEADERS });
  }
  if (!user) {
    return new Response("Missing user", { status: 400, headers: CACHE_HEADERS });
  }

  try {
    const res = await fetch(
      `${backendBase()}/api/v1/u/${encodeURIComponent(user)}/report-card`,
      { next: { revalidate: 3600 }, headers: { accept: "application/json" } }
    );

    if (res.status === 404) {
      return placeholderCard("User not found", "This contributor profile does not exist.");
    }
    if (res.status === 403) {
      return placeholderCard("Profile private", "This contributor's report card is not public.");
    }
    if (!res.ok) {
      return placeholderCard("Report card unavailable", "Please try again later.");
    }

    const card = (await res.json()) as ReportCard;

    // AC5: ETag on the source JSON; 304 when unchanged.
    const sum = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(card)));
    const etag = `"` + Buffer.from(sum).toString("hex") + `"`;
    if (req.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ...CACHE_HEADERS, ETag: etag } });
    }

    return reportCard(
      {
        username: card.username || user,
        slug: truncate(card.slug || card.username || user, 60),
        avatar_url: card.avatar_url,
        merged_pr_count: card.merged_pr_count || 0,
        first_merge_at: card.first_merge_at ?? null,
        top_languages: card.top_languages || [],
        c_rank_tiers: card.c_rank_tiers || [],
      },
      etag
    );
  } catch {
    return placeholderCard("Report card unavailable", "Please try again later.");
  }
}
