import { notFound } from 'next/navigation'
import { createServerClient, rowToSchool } from '@/lib/supabase'
import SchoolReport from '@/components/SchoolReport'

// These are the slugs that are backed by Supabase report_data records.
// Any slug not in this set will 404 immediately without hitting the DB.
const VALID_GUIDE_SLUGS = new Set([
  'smmusd-transfer-playbook',
  'ccusd-transfer-playbook',
  'lausd-school-choice-playbook',
  'beach-cities-school-choice-blueprint',
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
  // Reject unknown slugs without hitting the DB
  if (!VALID_GUIDE_SLUGS.has(params.slug)) notFound()

  let supabase
  try {
    supabase = createServerClient()
  } catch {
    notFound()
  }

  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .eq('slug', params.slug)
    .maybeSingle()

  if (error || !data || !data.report_data) notFound()

  const school = rowToSchool(data)
  return <SchoolReport school={school} />
}
