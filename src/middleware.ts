import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 1. Non-www → www redirect for browser traffic (API routes excluded so
 *    Stripe webhooks and other external callers that don't follow redirects
 *    are never bounced with a 307/308).
 * 2. Refreshes the Supabase session token on every request.
 * 3. Checks the preview_access cookie to gate the private beta.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Non-www → www redirect ─────────────────────────────────────────────────
  // Stripe, payment processors, and crawlers must never receive a redirect on
  // /api/* routes — they won't follow it, causing silent failures (e.g. webhook
  // 307s that Stripe marks as failed).  Browser-facing pages are fine to redirect.
  const host = request.headers.get('host') ?? ''
  const isApex = host === 'earlyscouts.com' || host.startsWith('earlyscouts.com:')
  const isApiRoute = pathname.startsWith('/api/') || pathname.startsWith('/auth/')
  if (isApex && !isApiRoute) {
    const wwwUrl = request.nextUrl.clone()
    wwwUrl.host = `www.${host.split(':')[0]}${host.includes(':') ? `:${host.split(':')[1]}` : ''}`
    return NextResponse.redirect(wwwUrl, { status: 308 })
  }

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
