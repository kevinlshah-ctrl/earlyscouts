import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for Server Components and Route Handlers that
 * reads the authenticated user's session from HTTP cookies.
 *
 * Uses the ANON key (respects Row-Level Security) — not the service role.
 * Use createServerClient() from @/lib/supabase for admin/service-role work.
 */
export function createAuthServerClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Server Components are read-only; silently ignore set attempts.
          // The middleware handles writing updated tokens back to the response.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
