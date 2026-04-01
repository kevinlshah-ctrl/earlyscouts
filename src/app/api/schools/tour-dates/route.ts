import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get('zip')?.trim()
  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: 'Valid zip required' }, { status: 400 })
  }

  let supabase: ReturnType<typeof createServerClient>
  try { supabase = createServerClient() } catch {
    return NextResponse.json({ tourDates: [], zip })
  }

  // Get all school IDs near this zip
  const { data: zipSchools } = await supabase
    .from('zip_schools')
    .select('school_id')
    .eq('zip', zip)

  if (!zipSchools?.length) return NextResponse.json({ tourDates: [], zip })

  const ids = zipSchools.map((z: { school_id: string }) => z.school_id)

  // Get upcoming tour dates for those schools
  const today = new Date().toISOString().split('T')[0]
  const { data: rows } = await supabase
    .from('tour_dates')
    .select('*, schools(name, slug, address, city)')
    .in('school_id', ids)
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(50)

  return NextResponse.json({ tourDates: rows || [], zip })
}
