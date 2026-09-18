import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/session";

// Optimistic redirect only: it checks that a cookie exists, not that it is
// valid or which firm it belongs to. The tenant boundary is lib/dal.ts, which
// re-reads and verifies the session on every query.
export function proxy(request: NextRequest) {
  const hasCookie = request.cookies.has(COOKIE_NAME);
  const { pathname } = request.nextUrl;

  if (!hasCookie && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (hasCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/clients", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
