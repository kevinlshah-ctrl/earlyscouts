import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = cookies()
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Best-effort: revoke the server-side session. This may fail (e.g. if the
  // access token is expired and the refresh token is already invalidated) but
  // we clear the cookies regardless below.
  await supabase.auth.signOut().catch(() => {})

  // Explicitly delete all Supabase auth cookies from the response.
  // We do this unconditionally because signOut() may return early on API error
  // without triggering setAll, leaving the cookie intact. The cookie is also
  // not HttpOnly so the client clears it in JS, but belt-and-suspenders here.
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '')
    .match(/https?:\/\/([^.]+)/)?.[1] ?? ''
  const cookiePrefix = `sb-${projectRef}-auth-token`

  cookieStore.getAll()
    .filter(c => c.name.startsWith(cookiePrefix))
    .forEach(c => {
      response.cookies.set(c.name, '', {
        maxAge: 0,
        path: '/',
        sameSite: 'lax',
        secure: true,
      })
    })

  return response
}
