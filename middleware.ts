import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define public routes that don't require authentication
const publicRoutes = ["/", "/auth/signin", "/auth/signup"]

export function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname

  // Get the session token from cookies
  const token = request.cookies.get("next-auth.session-token")?.value || null

  // If user is not authenticated and trying to access protected route, redirect to signin
  if (!token && !publicRoutes.includes(path)) {
    return NextResponse.redirect(new URL("/auth/signin", request.url))
  }

  // Allow authenticated users to access any route
  return NextResponse.next()
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
} 