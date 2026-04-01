import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { BoardInsight, DistrictIntelData } from '@/lib/types'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const schoolId = params.id
  if (!schoolId) return NextResponse.json({ error: 'School ID required' }, { status: 400 })

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch {
    const empty: DistrictIntelData = { hasData: false, districtName: null, insights: [], districtInsights: [] }
    return NextResponse.json(empty)
  }

  // Look up the school to get district info
  const { data: school } = await supabase
    .from('schools')
    .select('id, name, district, state')
    .eq('id', schoolId)
    .maybeSingle()

  if (!school) {
    const empty: DistrictIntelData = { hasData: false, districtName: null, insights: [], districtInsights: [] }
    return NextResponse.json(empty)
  }

  // Find which district_id(s) serve this school
  // First try school-specific insights (where school_id matches)
  const { data: schoolInsights } = await supabase
    .from('board_insights')
    .select('id, district_id, school_id, school_name, category, headline, detail, sentiment, impact_level, meeting_date, district_name, source_url')
    .eq('school_id', schoolId)
    .order('meeting_date', { ascending: false })
    .order('impact_level', { ascending: true })  // high first
    .limit(20)

  // Also pull district-wide insights from districts that likely serve this school
  // Heuristic: find any district that has insights matching this school's district name
  const districtName = school.district || ''
  const { data: districtWideInsights } = await supabase
    .from('board_insights')
    .select('id, district_id, school_id, school_name, category, headline, detail, sentiment, impact_level, meeting_date, district_name, source_url')
    .is('school_id', null)  // district-wide (not school-specific)
    .ilike('district_name', `%${districtName.split(' ')[0] || ''}%`)
    .order('meeting_date', { ascending: false })
    .order('impact_level', { ascending: true })
    .limit(15)

  const schoolRows = (schoolInsights || []) as BoardInsight[]
  const districtRows = (districtWideInsights || []) as BoardInsight[]

  const hasData = schoolRows.length > 0 || districtRows.length > 0

  // Determine district name from whichever set has data
  const resolvedDistrictName =
    schoolRows[0]?.district_name ??
    districtRows[0]?.district_name ??
    districtName ??
    null

  const result: DistrictIntelData = {
    hasData,
    districtName: resolvedDistrictName,
    insights: schoolRows,
    districtInsights: districtRows,
  }

  return NextResponse.json(result)
}
