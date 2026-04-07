import { createBrowserClient } from '@supabase/ssr'

// Singleton browser client.
// createBrowserClient from @supabase/ssr stores the session in cookies
// (not localStorage) so the middleware and Server Components can read it.
//
// cookieOptions.domain is set to 'earlyscouts.com' (the apex, no leading dot)
// so the same session cookies are valid on both www.earlyscouts.com and
// earlyscouts.com — without this, cookies set on one subdomain are invisible
// on the other, which breaks the session after any cross-domain redirect
// (e.g. Stripe success_url returning to the apex while the session was
// established on www, or vice versa).
//
// The singleton is stored on `window` rather than a module-level variable so
// it survives Next.js Fast Refresh module re-evaluations in development.
// Without this, a hot reload resets the module-level variable to null and
// creates a second GoTrueClient that competes for the same IndexedDB lock as
// the still-running AuthProvider instance — producing "Lock was released
// because another request stole it" errors.

type BrowserClient = ReturnType<typeof createBrowserClient>

const SINGLETON_KEY = '__supabaseBrowserClient' as const

function createInstance(): BrowserClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain:   'earlyscouts.com',
        path:     '/',
        sameSite: 'lax',
        secure:   true,
      },
    }
  )
}

export function getBrowserClient(): BrowserClient {
  if (typeof window === 'undefined') {
    // Should never be called server-side — all callers are 'use client'.
    // Return a fresh instance as a safe fallback (no window to store it on).
    return createInstance()
  }

  // Anchor the singleton on window so it survives Fast Refresh re-evaluations
  // and any duplicate module instances created by bundle splitting.
  const w = window as Window & Record<string, unknown>
  if (!w[SINGLETON_KEY]) {
    w[SINGLETON_KEY] = createInstance()
  }
  return w[SINGLETON_KEY] as BrowserClient
}
