import { NextResponse, type NextRequest } from 'next/server';

// better-auth session cookie names
const SESSION_COOKIE = 'better-auth.session_token';
const SECURE_SESSION_COOKIE = '__Secure-better-auth.session_token';

// Auth routes that don't require authentication
const AUTH_ROUTES = ['/login', '/verify'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth routes - let them render normally
  if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Check for session cookie (either secure or non-secure variant)
  const hasSession =
    request.cookies.has(SESSION_COOKIE) || request.cookies.has(SECURE_SESSION_COOKIE);

  if (!hasSession) {
    // Redirect to login if no session cookie
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata)
     * - public folder assets
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ]
};
