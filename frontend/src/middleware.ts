import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
