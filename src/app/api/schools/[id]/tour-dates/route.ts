import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = params.id
  if (!slug) return NextResponse.json({ error: 'School ID required' }, { status: 400 })

  let supabase: ReturnType<typeof createServerClient>
  try { supabase = createServerClient() } catch {
    return NextResponse.json({ tourDates: [] })
  }

  const today = new Date().toISOString().split('T')[0]

  // Get upcoming + null-date (by appointment) tour dates
  const { data: rows } = await supabase
    .from('tour_dates')
    .select('*')
    .eq('school_id', slug)
    .or(`date.gte.${today},date.is.null`)
    .order('date', { ascending: true, nullsFirst: false })
    .limit(20)

  return NextResponse.json({ tourDates: rows || [] })
}
