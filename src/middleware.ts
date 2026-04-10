import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase session token on every request.
 *
 * www → apex redirect is handled at the Vercel domain level (not here).
 * A code-level redirect in the same direction would create an infinite loop.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Supabase session refresh ───────────────────────────────────────────────
  // Start with a plain pass-through response; cookie writes below mutate it.
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies both into the forwarded request and the response.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() validates + refreshes the session; side-effect writes cookies.
  // Skip for the signout route: the route handler is about to clear the session
  // cookie, and calling getUser() here would write a refreshed session cookie
  // AFTER the route handler's clearing Set-Cookie, overwriting the deletion.
  if (!pathname.startsWith('/api/auth/signout')) {
    await supabase.auth.getUser()
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
