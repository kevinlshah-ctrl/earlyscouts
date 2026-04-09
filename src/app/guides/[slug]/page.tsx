import { notFound } from 'next/navigation'
import { createServerClient, rowToSchool } from '@/lib/supabase'
import { createAuthServerClient } from '@/lib/supabase-server'
import SchoolReport from '@/components/SchoolReport'
import type { School, CalloutBlock, ComparisonTableBlock, GuidePreviewExtras } from '@/lib/types'
import { calculateReadTime, calculateSourceCount } from '@/lib/report-metrics'

// These are the slugs backed by Supabase report_data records.
// Any other slug 404s immediately without touching the DB.
const VALID_GUIDE_SLUGS = new Set([
  'smmusd-transfer-playbook',
  'ccusd-transfer-playbook',
  'lausd-school-choice-playbook',
  'beach-cities-school-choice-blueprint',
  'hollywood-hills-school-choice-playbook',
  'la-charter-magnet-school-choice-playbook',
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
      .select('plan_type, subscription_status, access_expires_at')
      .eq('id', user.id)
      .maybeSingle()

    const p = profileRow as {
      plan_type: string | null
      subscription_status: string | null
      access_expires_at: string | null
    } | null

    if (p) {
      if (p.plan_type === 'extended') {
        hasAccess = p.subscription_status === 'active' || p.subscription_status === 'trialing'
      } else if (p.plan_type === 'premium') {
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
  // Calculate metrics from the FULL report before stripping — the hero badges
  // should reflect the complete guide even for unauthenticated visitors.
  const preStripReadTime    = school.reportData ? calculateReadTime(school.reportData) : 0
  const preStripSourceCount = school.reportData ? calculateSourceCount(school.reportData) : 0

  // ── Extract strategic preview content from gated sections ──────────────────
  // Shown to unauthenticated visitors as a conversion teaser before the paywall.
  const gatedSections = sections.slice(1)
  const previewExtras: GuidePreviewExtras = {}

  // 1. First green/sky callout that isn't the Scout Take
  for (const section of gatedSections) {
    const found = section.content.find(
      b => b.type === 'callout' &&
           ((b as CalloutBlock).variant === 'green' || (b as CalloutBlock).variant === 'sky') &&
           (b as CalloutBlock).label?.toLowerCase() !== 'scout take'
    ) as CalloutBlock | undefined
    if (found) { previewExtras.callout = found; break }
  }

  // 2. First comparison table from any gated section
  for (const section of gatedSections) {
    const found = section.content.find(b => b.type === 'comparison_table') as ComparisonTableBlock | undefined
    if (found) { previewExtras.comparison_table = found; break }
  }

  // 3. Calendar section — partial (5 visible rows + up to 3 blurred rows)
  const calSection = gatedSections.find(s => {
    const id = s.id.toLowerCase(); const title = s.title.toLowerCase(); const tag = (s.tag ?? '').toLowerCase()
    return id.includes('calendar') || id.includes('timeline') ||
           title.includes('calendar') || title.includes('timeline') ||
           tag.includes('calendar') || tag.includes('timeline')
  })
  if (calSection) {
    const tableBlock = calSection.content.find(b => b.type === 'comparison_table') as ComparisonTableBlock | undefined
    if (tableBlock) {
      previewExtras.calendar = {
        title: calSection.title,
        subtitle: calSection.subtitle || undefined,
        columns: tableBlock.columns,
        visible_rows: tableBlock.rows.slice(0, 5),
        blurred_rows: tableBlock.rows.slice(5, 8),
      }
    }
  }

  // 4. Contacts section — partial (heading + first 2 blocks)
  const contactSection = gatedSections.find(s => {
    const id = s.id.toLowerCase(); const title = s.title.toLowerCase(); const tag = (s.tag ?? '').toLowerCase()
    return id.includes('contact') || title.includes('contact') || tag.includes('contact')
  })
  if (contactSection) {
    previewExtras.contacts = {
      title: contactSection.title,
      visible_blocks: contactSection.content.slice(0, 2),
    }
  }

  const hasExtras = previewExtras.callout || previewExtras.comparison_table ||
                    previewExtras.calendar || previewExtras.contacts

  const gatedSchool: School = {
    ...school,
    reportData: school.reportData
      ? {
          ...school.reportData,
          // Preserve real chapter count before stripping so the hero pill shows
          // the correct "N chapters" instead of "1 chapters".
          total_sections: sections.length,
          // Preserve real read time + source count — calculated above from
          // the full report so hero badges stay accurate after stripping.
          _guide_read_time:    preStripReadTime,
          _guide_source_count: preStripSourceCount,
          sections: sections.slice(0, 1),
          // Clear the verdict so it never reaches the client unauthenticated.
          verdict: { paragraphs: [], best_for: '', consider_alternatives: '' },
          // Strategic preview content for unauthenticated visitors.
          ...(hasExtras ? { _guide_preview_extras: previewExtras } : {}),
        }
      : null,
  }

  return <SchoolReport school={gatedSchool} forcePaywall />
}
