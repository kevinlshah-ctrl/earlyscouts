import { createServerClient, rowToSchool } from '@/lib/supabase'
import type { School } from '@/lib/types'
import type { SchoolRow } from '@/lib/supabase'

export async function getDeepDiveSchools(metro: string = 'los-angeles'): Promise<School[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('schools')
    .select(
      'id, name, slug, address, city, state, zip, district, type, grades, lat, lng, enrollment, greatschools_rating, website, metro, math_proficiency, reading_proficiency, key_insight, student_teacher_ratio, niche_grade, updated_at, scraped_at'
    )
    .not('report_data', 'is', null)
    .eq('metro', metro)
    .order('name')

  if (error || !data) {
    // Fallback: if metro column doesn't exist yet, load without filter
    const { data: fallback, error: fallbackErr } = await supabase
      .from('schools')
      .select(
        'id, name, slug, address, city, state, zip, district, type, grades, lat, lng, enrollment, greatschools_rating, website, math_proficiency, reading_proficiency, key_insight, student_teacher_ratio, niche_grade, updated_at, scraped_at'
      )
      .not('report_data', 'is', null)
      .order('name')
    if (fallbackErr || !fallback) return []
    return fallback.map(row => rowToSchool(row as unknown as SchoolRow))
  }

  return data.map(row => rowToSchool(row as unknown as SchoolRow))
}
