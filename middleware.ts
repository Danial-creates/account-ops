import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidSessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/admin/dashboard/:path*", "/api/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  // Never gate the login/logout endpoints themselves.
  if (req.nextUrl.pathname === "/api/admin/login" || req.nextUrl.pathname === "/api/admin/logout") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const valid = await isValidSessionToken(token);

  if (valid) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", req.url);
  return NextResponse.redirect(loginUrl);
}
