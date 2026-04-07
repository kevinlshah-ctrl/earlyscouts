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
let _client: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (_client) return _client
  _client = createBrowserClient(
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
  return _client
}
