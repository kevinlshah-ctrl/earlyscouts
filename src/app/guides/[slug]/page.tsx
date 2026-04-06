import { notFound } from 'next/navigation'
import { createServerClient, rowToSchool } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server'
import SchoolReport from '@/components/SchoolReport'
import type { School } from '@/lib/types'

// These are the slugs backed by Supabase report_data records.
// Any other slug 404s immediately without touching the DB.
const VALID_GUIDE_SLUGS = new Set([
  'smmusd-transfer-playbook',
  'ccusd-transfer-playbook',
  'lausd-school-choice-playbook',
  'beach-cities-school-choice-blueprint',
  'hollywood-hills-school-choice-playbook',
])

export async function generateMetadata({ params }: { params: { slug: string } }) {
  if (!VALID_GUIDE_SLUGS.has(params.slug)) return {}
  try {
    const supabase = createServerClient()
    const { data } = await supabase
      .from('schools')
      .select('name, district')
      .eq('slug', params.slug)
      .maybeSingle()
    if (data?.name) {
      return {
        title: `${data.name} | EarlyScouts`,
        description: `Comprehensive transfer and enrollment guide for ${data.district || 'your district'}. Deadlines, permit windows, and strategy for LA families.`,
      }
    }
  } catch {}
  return {}
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  if (!VALID_GUIDE_SLUGS.has(params.slug)) notFound()

  // ── Fetch guide content (service role — bypasses RLS) ──────────────────
  const serviceClient = createServerClient()
  const { data, error } = await serviceClient
    .from('schools')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (error || !data || !data.report_data) notFound()

  const school = rowToSchool(data)

  // ── Server-side auth & access check ────────────────────────────────────
  // createAuthServerClient reads the session from cookies written by the
  // middleware.  Returns user=null for anonymous visitors.
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()

  let hasAccess = false

  if (user) {
    const { data: profileRow } = await serviceClient
      .from('user_profiles')
      .select('subscription_tier, subscription_status, access_expires_at')
      .eq('id', user.id)
      .single()

    const p = profileRow as {
      subscription_tier: string | null
      subscription_status: string | null
      access_expires_at: string | null
    } | null

    if (p) {
      if (p.subscription_tier === 'extended') {
        hasAccess = p.subscription_status === 'active' || p.subscription_status === 'trialing'
      } else if (p.subscription_tier === 'premium') {
        // No expiry set means the row was just created — treat as active.
        hasAccess = !p.access_expires_at || new Date(p.access_expires_at) > new Date()
      }
    }
  }

  // ── Paid path: send full content ────────────────────────────────────────
  if (hasAccess) {
    return <SchoolReport school={school} />
  }

  // ── Gated path: strip content server-side before it reaches the client ──
  // Only the first section is included in the HTML sent to the browser.
  // forcePaywall overrides SchoolReport's built-in isGuide bypass so the
  // paywall card renders even though this is a guide/playbook page.
  const sections = school.reportData?.sections ?? []
  const gatedSchool: School = {
    ...school,
    reportData: school.reportData
      ? {
          ...school.reportData,
          sections: sections.slice(0, 1),
          // Clear the verdict so it never reaches the client unauthenticated.
          verdict: { paragraphs: [], best_for: '', consider_alternatives: '' },
        }
      : null,
  }

  return <SchoolReport school={gatedSchool} forcePaywall />
}
