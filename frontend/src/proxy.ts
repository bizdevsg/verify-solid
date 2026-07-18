import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = process.env.NEXT_PUBLIC_SESSION_COOKIE ?? "solid_video_verification_session";

const PROTECTED_PREFIXES = ["/dashboard", "/customers", "/meetings", "/users"];

// Laravel's session middleware issues a session cookie on essentially every
// request that touches the stateful API — including anonymous ones, and
// right after logout (session()->invalidate() still ends with a fresh empty
// session cookie on the response). So cookie *presence* only ever proves
// "a session exists", never "this session is an authenticated user". We use
// it here purely as a cheap early bounce for requests with NO cookie at all;
// the real authentication check is the client-side /auth/me call in
// DashboardLayout, which redirects to /login on a genuine 401. Do not add a
// "cookie present -> treat as logged in" redirect here (e.g. bouncing /login
// to /dashboard) — that reintroduces a login/dashboard redirect loop right
// after logout, since the post-logout response still carries a session
// cookie.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/customers/:path*", "/meetings/:path*", "/users/:path*"],
};
