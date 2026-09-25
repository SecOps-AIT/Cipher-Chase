import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || "cipher-chase-default-secret-key-32-chars-long"
);

const ADMIN_COOKIE_NAME = "cipher_admin_token";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/leaderboard" && request.cookies.has("cipher_team_token")) {
    return NextResponse.redirect(new URL("/team", request.url));
  }

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const adminToken = request.cookies.get(ADMIN_COOKIE_NAME)?.value;

    if (!adminToken) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const { payload } = await jwtVerify(adminToken, SECRET_KEY);
      if (!payload || !(payload as any).isAdmin) {
        throw new Error("Invalid admin payload");
      }
      return NextResponse.next();
    } catch {
      // Invalid or expired token -> redirect to login
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete(ADMIN_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/leaderboard"],
};
