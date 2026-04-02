import { createServerClient } from '@supabase/ssr'
import { createServerClient as createServiceClient } from '@/lib/supabase'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Handles the Supabase PKCE magic-link callback.
 *
 * Supabase redirects here with ?code=<pkce_code> after the user clicks
 * the magic link.  This route handler:
 *   1. Exchanges the code for a session (writes session cookies).
 *   2. Routes new users to /success, returning users to ?next= or /schools.
 *   3. On failure, redirects to /signin?error=<message>.
 *
 * IMPORTANT: must use the request/response cookie pattern (not cookies() from
 * next/headers) so that session cookies are written directly onto the response
 * headers.  Using cookies() silently swallows writes in Route Handlers, which
 * causes a redirect loop back to /signin.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/schools'
  // Prevent open redirect — only allow same-origin relative paths
  const safeNext = next.startsWith('/') ? next : '/schools'

  if (!code) {
    return NextResponse.redirect(`${origin}/signin?error=auth`)
  }

  // Use NextResponse.next() as an intermediate cookie jar.
  // Supabase writes the session cookies here during exchangeCodeForSession;
  // we copy them onto the final redirect response below.
  const cookieJar = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieJar.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Auth callback error:', error.message)
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(error.message)}`, requestUrl)
    )
  }

  // New-user check: no onboarding_data + created within last 60 s
  let destination = safeNext
  if (data.user) {
    const serviceClient = createServiceClient()
    const { data: profileRaw } = await serviceClient
      .from('user_profiles')
      .select('created_at, onboarding_data')
      .eq('id', data.user.id)
      .single()

    const profile = profileRaw as {
      created_at: string
      onboarding_data: unknown
    } | null

    const ageMs = profile?.created_at
      ? Date.now() - new Date(profile.created_at).getTime()
      : Infinity
    const isNewUser = !profile?.onboarding_data && ageMs < 60_000
    if (isNewUser) destination = '/success'
  }

  // Build the final redirect and copy all session cookies from the jar.
  const response = NextResponse.redirect(`${origin}${destination}`)
  cookieJar.cookies.getAll().forEach(({ name, value, ...options }) => {
    response.cookies.set(name, value, options)
  })
  return response
}
