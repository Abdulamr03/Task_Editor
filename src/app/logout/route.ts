import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// GET /logout?reason=… — clears the login cookie and opens the login page.
// Used when a login is no longer valid, and by "Switch account".
const REASONS = ["expired", "switch", "deleted", "password", "everywhere", "signed-out"];

export function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason");
  const url = new URL("/login", request.url);
  if (reason && REASONS.includes(reason)) url.searchParams.set("reason", reason);
  const res = NextResponse.redirect(url);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
