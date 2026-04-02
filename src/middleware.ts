import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 1. Refreshes the Supabase session token on every request.
 * 2. After refresh, checks the preview_access cookie to gate the private beta.
 *    The gate runs second so Supabase cookies are always written — even on
 *    redirected requests — and the auth callback is never blocked.
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
  await supabase.auth.getUser()

  // ── Preview gate ───────────────────────────────────────────────────────────
  // Skip the gate for: the preview page itself, all API routes (including
  // /api/preview-auth and Stripe webhooks), and the Supabase auth callback.
  const isExempt =
    pathname.startsWith('/preview') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/')

  if (!isExempt && request.cookies.get('preview_access')?.value !== 'true') {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/preview'
    loginUrl.searchParams.set('from', pathname)
    const redirectResponse = NextResponse.redirect(loginUrl)
    // Copy any Supabase session cookies onto the redirect so they aren't lost.
    response.cookies.getAll().forEach(cookie => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
