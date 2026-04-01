import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export interface RelatedSchool {
  id: string
  name: string
  slug: string
  type: string
  city: string
  zip: string
  grades: string | null
  greatschoolsRating: number | null
  keyInsight: string | null
  /** 'nearby' | 'feeder_into' | 'feeder_from' */
  relation: 'nearby' | 'feeder_into' | 'feeder_from'
}

export interface RelatedSchoolsResponse {
  nearby: RelatedSchool[]
  feederInto: RelatedSchool[]
  feederFrom: RelatedSchool[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = params.id
  if (!slug) return NextResponse.json({ error: 'id required' }, { status: 400 })

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch {
    return NextResponse.json({ nearby: [], feederInto: [], feederFrom: [] })
  }

  // Look up the school by slug to get id + zip
  const { data: school } = await supabase
    .from('schools')
    .select('id, zip')
    .eq('slug', slug)
    .maybeSingle()

  if (!school) return NextResponse.json({ nearby: [], feederInto: [], feederFrom: [] })

  const schoolId = school.id
  const zip      = school.zip

  // ── Nearby schools (same zip, exclude self) ───────────────────────────────
  const { data: nearbyRaw } = await supabase
    .from('schools')
    .select('id, name, slug, type, city, zip, grades, greatschools_rating, key_insight')
    .eq('zip', zip)
    .neq('id', schoolId)
    .order('greatschools_rating', { ascending: false, nullsFirst: false })
    .limit(6)

  const nearby: RelatedSchool[] = (nearbyRaw || []).map((s) => ({
    id:               s.id,
    name:             s.name,
    slug:             s.slug,
    type:             s.type,
    city:             s.city,
    zip:              s.zip,
    grades:           s.grades,
    greatschoolsRating: s.greatschools_rating,
    keyInsight:       s.key_insight,
    relation:         'nearby',
  }))

  // ── Feeder map ────────────────────────────────────────────────────────────
  const { data: feederRow } = await supabase
    .from('feeder_maps')
    .select('feeds_into, feeds_from')
    .eq('school_id', schoolId)
    .maybeSingle()

  const feedsIntoNames: string[] = Array.isArray(feederRow?.feeds_into) ? feederRow.feeds_into : []
  const feedsFromNames: string[] = Array.isArray(feederRow?.feeds_from) ? feederRow.feeds_from : []

  // Resolve feeder school names → full rows (ILIKE each name)
  async function resolveFeederNames(names: string[], relation: RelatedSchool['relation']): Promise<RelatedSchool[]> {
    if (names.length === 0) return []

    const results: RelatedSchool[] = []

    for (const name of names) {
      const { data } = await supabase
        .from('schools')
        .select('id, name, slug, type, city, zip, grades, greatschools_rating, key_insight')
        .ilike('name', `%${name}%`)
        .neq('id', schoolId)
        .limit(1)

      if (data?.[0]) {
        const s = data[0]
        results.push({
          id:               s.id,
          name:             s.name,
          slug:             s.slug,
          type:             s.type,
          city:             s.city,
          zip:              s.zip,
          grades:           s.grades,
          greatschoolsRating: s.greatschools_rating,
          keyInsight:       s.key_insight,
          relation,
        })
      }
    }

    return results
  }

  const [feederInto, feederFrom] = await Promise.all([
    resolveFeederNames(feedsIntoNames, 'feeder_into'),
    resolveFeederNames(feedsFromNames, 'feeder_from'),
  ])

  return NextResponse.json({ nearby, feederInto, feederFrom } satisfies RelatedSchoolsResponse)
}
