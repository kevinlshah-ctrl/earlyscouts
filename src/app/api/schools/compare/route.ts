import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, rowToSchool, type SchoolRow } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam)
    return NextResponse.json({ error: 'ids parameter required' }, { status: 400 })

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3)
  if (ids.length < 2)
    return NextResponse.json(
      { error: 'Provide at least 2 school IDs' },
      { status: 400 }
    )

  const supabase = createServerClient()
  const { data: rows, error } = await supabase
    .from('schools')
    .select('*')
    .in('slug', ids)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  const schools = (rows as SchoolRow[] || []).map(rowToSchool)
  return NextResponse.json({ schools, count: schools.length })
}
