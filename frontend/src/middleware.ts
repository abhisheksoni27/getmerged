import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 301 redirect uppercase routes matching known static/dynamic sections to lowercase
  if (/[A-Z]/.test(pathname)) {
    const lower = pathname.toLowerCase();
    const knownPrefixes = [
      "/rankings",
      "/good-first-issue",
      "/repos",
      "/pricing",
      "/compare",
      "/guides",
      "/topics",
      "/contribute",
      "/hall-of-fame",
      "/hacktoberfest",
      "/how-c-rank-works",
      "/about",
    ];
    if (knownPrefixes.some((p) => lower === p || lower.startsWith(p + "/"))) {
      const url = request.nextUrl.clone();
      url.pathname = lower;
      return NextResponse.redirect(url, 301);
    }
  }

  const response = NextResponse.next();

  if (
    request.nextUrl.pathname === "/404" ||
    request.nextUrl.pathname === "/_not-found"
  ) {
    response.headers.set("X-Robots-Tag", "noindex, follow");
  }

  // If user is logged in (has active auth token), bypass all CDN & browser caching
  const token = request.cookies.get("opendoor_token")?.value;
  if (token) {
    response.headers.set("Cache-Control", "private, no-store, must-revalidate");
    response.headers.set("Cloudflare-CDN-Cache-Control", "no-store");
    response.headers.set("CDN-Cache-Control", "no-store");
  } else {
    // Generate bucketed Cache-Tag headers for targeted edge purging
    const path = request.nextUrl.pathname;
    const tags: string[] = ["all-pages"];

    if (path === "/") {
      tags.push("home");
    } else if (path.startsWith("/topics/")) {
      tags.push("topics");
      const topic = path.replace("/topics/", "").split("/")[0];
      if (topic) tags.push(`topic-${topic}`);
    } else if (path.startsWith("/good-first-issue/")) {
      tags.push("good-first-issue");
      const lang = path.replace("/good-first-issue/", "").split("/")[0];
      if (lang) tags.push(`gfi-${lang}`);
    } else if (path.startsWith("/rankings/")) {
      tags.push("rankings");
    } else if (path.startsWith("/compare/")) {
      tags.push("compare");
    } else if (path.startsWith("/guides")) {
      tags.push("guides");
    } else {
      // Single repo page: /[owner]/[name]
      const parts = path.split("/").filter(Boolean);
      if (parts.length === 2 && !parts[0].startsWith("_") && parts[0] !== "api") {
        tags.push("repos", `repo-${parts[0]}-${parts[1]}`, `owner-${parts[0]}`);
      }
    }

    response.headers.set("Cache-Tag", tags.join(","));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
