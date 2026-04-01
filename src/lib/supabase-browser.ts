import { createBrowserClient } from '@supabase/ssr'

// Singleton browser client.
// createBrowserClient from @supabase/ssr stores the session in cookies
// (not localStorage) so the middleware and Server Components can read it.
let _client: ReturnType<typeof createBrowserClient> | null = null

export function getBrowserClient() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return _client
}
