import { createServerClient } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server'
import SchoolDetailPage from './SchoolPageClient'

/**
 * Thin server wrapper — runs the same access check as the guide page so that
 * premium users see content immediately without waiting for the client-side
 * profile to load.  The heavy interactive UI lives in SchoolPageClient.
 */
export default async function SchoolPage({ params }: { params: { slug: string } }) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  let serverGrantedAccess = false

  if (user) {
    const serviceClient = createServerClient()
    const { data: p } = await serviceClient
      .from('user_profiles')
      .select('plan_type, subscription_status, access_expires_at')
      .eq('id', user.id)
      .maybeSingle()

    if (p) {
      if (p.plan_type === 'premium') {
        serverGrantedAccess = !p.access_expires_at || new Date(p.access_expires_at) > new Date()
      } else if (p.plan_type === 'extended') {
        serverGrantedAccess = p.subscription_status === 'active' || p.subscription_status === 'trialing'
      }
    }
  }

  return <SchoolDetailPage serverGrantedAccess={serverGrantedAccess} />
}
