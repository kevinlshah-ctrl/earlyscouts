import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const schoolId = params.id
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') ?? ''
  const type = searchParams.get('type') // optional filter: 'review' | 'tour_report' | 'tip'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  let query = supabase
    .from('user_contributions')
    .select('*', { count: 'exact' })
    .eq('school_id', schoolId)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('contribution_type', type)

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ contributions: [], total: 0 })
  }

  // Fetch votes by this user if userId provided
  let votedIds = new Set<number>()
  if (userId && data && data.length > 0) {
    const ids = data.map((c: { id: number }) => c.id)
    const { data: votes } = await supabase
      .from('contribution_votes')
      .select('contribution_id')
      .eq('user_id', userId)
      .in('contribution_id', ids)
    if (votes) {
      votedIds = new Set(votes.map((v: { contribution_id: number }) => v.contribution_id))
    }
  }

  const contributions = (data ?? []).map((c: {
    id: number
    user_id: string
    display_name: string
    school_id: string
    contribution_type: string
    rating: number | null
    title: string | null
    content: string
    tour_date: string | null
    helpful_count: number
    created_at: string
  }) => ({
    id: c.id,
    userId: c.user_id,
    displayName: c.display_name,
    schoolId: c.school_id,
    contributionType: c.contribution_type,
    rating: c.rating,
    title: c.title,
    content: c.content,
    tourDate: c.tour_date,
    helpfulCount: c.helpful_count,
    createdAt: c.created_at,
    hasVoted: votedIds.has(c.id),
  }))

  return NextResponse.json({ contributions, total: count ?? 0 })
}
