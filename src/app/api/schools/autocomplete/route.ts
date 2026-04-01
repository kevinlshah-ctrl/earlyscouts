import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ schools: [] })
  }

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch {
    return NextResponse.json({ schools: [] })
  }

  const { data } = await supabase
    .from('schools')
    .select('id, name, city, slug')
    .ilike('name', `%${q}%`)
    .limit(5)

  return NextResponse.json({ schools: data || [] })
}
