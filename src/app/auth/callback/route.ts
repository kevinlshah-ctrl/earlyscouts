import { createServerClient as createServiceClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Handles the Supabase PKCE magic-link callback.
 *
 * Supabase redirects here with ?code=<pkce_code> after the user clicks
 * the magic link.  This route handler:
 *   1. Exchanges the code for a session (writes session cookies).
 *   2. Routes new users to /success, returning users to ?next= or /schools.
 *   3. On failure, redirects to /signin?error=auth.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/schools'
  // Prevent open redirect — only allow same-origin relative paths
  const safeNext = next.startsWith('/') ? next : '/schools'

  if (code) {
    const supabase = createAuthServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // New-user check: no onboarding_data + created within last 60 s
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

      return NextResponse.redirect(`${origin}${isNewUser ? '/success' : safeNext}`)
    }
  }

  // Code missing or exchange failed
  return NextResponse.redirect(`${origin}/signin?error=auth`)
}
