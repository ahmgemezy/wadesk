import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication.
const PUBLIC_PREFIXES = [
  "/sign-in",
  "/sign-up",
  "/select-org",
  "/privacy",
  "/terms",
  "/dpa",
  "/accept-invite",
  "/join",
  "/api/auth",
  "/onboarding",
];

function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Better Auth stores the session as a cookie. If it's absent the user is
  // unauthenticated — redirect to sign-in preserving the original URL.
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
