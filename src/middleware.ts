import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const SITE_PASSWORD = 'VIPSCOUTACCESS'
const SITE_AUTH_COOKIE = 'vipscout_auth'

/**
 * 1. Site-wide password gate — checked before anything else.
 * 2. Refreshes the Supabase session token on every request.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Site gate ──────────────────────────────────────────────────────────────
  // Skip: the auth page itself, API routes, Supabase callback, static files
  const isExempt =
    pathname.startsWith('/_auth') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/auth/')

  if (!isExempt) {
    const siteToken = request.cookies.get(SITE_AUTH_COOKIE)?.value
    if (siteToken !== SITE_PASSWORD) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/_auth'
      loginUrl.searchParams.set('from', pathname)
      return NextResponse.redirect(loginUrl)
    }
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

  return response
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
