import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function DELETE() {
  const cookieStore = cookies()
  const response = NextResponse.json({ success: true })

  // Use the session cookie to identify the user — more reliable than a
  // Bearer token because the cookie is always present when the user is on
  // the profile page, even if the client-side access token is stale.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete profile row first (non-fatal if row doesn't exist)
  await supabaseAdmin.from('user_profiles').delete().eq('id', user.id)

  // Delete auth user
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Sign out server-side to clear the HttpOnly session cookie in the response.
  // The user is already deleted so the API call will fail, but the setAll
  // callback still fires and writes the cookie-clearing Set-Cookie headers.
  await supabase.auth.signOut().catch(() => {})

  return response
}
