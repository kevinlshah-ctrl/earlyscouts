import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const contributionId = parseInt(params.id)
  if (isNaN(contributionId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: { userId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId } = body
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  // Check if already voted
  const { data: existing } = await supabase
    .from('contribution_votes')
    .select('user_id')
    .eq('user_id', userId)
    .eq('contribution_id', contributionId)
    .maybeSingle()

  if (existing) {
    // Toggle off — remove vote and decrement
    await supabase
      .from('contribution_votes')
      .delete()
      .eq('user_id', userId)
      .eq('contribution_id', contributionId)

    await supabase.rpc('decrement_helpful_count', { contribution_id: contributionId })

    return NextResponse.json({ voted: false })
  }

  // Add vote
  const { error: voteErr } = await supabase
    .from('contribution_votes')
    .insert({ user_id: userId, contribution_id: contributionId })

  if (voteErr) {
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }

  await supabase.rpc('increment_helpful_count', { contribution_id: contributionId })

  return NextResponse.json({ voted: true })
}
