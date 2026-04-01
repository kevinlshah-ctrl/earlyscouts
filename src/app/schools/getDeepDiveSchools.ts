import { createServerClient, rowToSchool } from '@/lib/supabase'
import type { School } from '@/lib/types'

export async function getDeepDiveSchools(): Promise<School[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .not('report_data', 'is', null)
    .order('name')

  if (error || !data) return []
  return data.map(rowToSchool)
}
