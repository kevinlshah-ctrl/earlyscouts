import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const ALLOWED_TYPES = ['review', 'tour_report', 'tip', 'correction']

async function moderateContent(content: string, type: string): Promise<{
  approved: boolean
  reason?: string
}> {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a content moderator for a school research site for parents.

Review this parent-submitted ${type} and respond with ONLY valid JSON:
{"approved": true/false, "reason": "brief reason if rejected"}

Reject if it contains: spam, profanity, personal attacks on named individuals,
contact info/phone numbers, URLs (except school websites), anything clearly off-topic
or promotional. Approve genuine parent experiences, opinions, and school observations.

Content to review:
"${content.slice(0, 1000)}"`
      }],
    })

    const raw = msg.content.find(b => b.type === 'text')?.text ?? '{}'
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    return JSON.parse(cleaned)
  } catch {
    // If moderation fails, approve by default (can be reviewed manually)
    return { approved: true }
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const schoolId = params.id

  let body: {
    userId?: string
    displayName?: string
    contributionType?: string
    rating?: number
    title?: string
    content?: string
    tourDate?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, displayName, contributionType, rating, title, content, tourDate } = body

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }
  if (!content || typeof content !== 'string' || content.trim().length < 10) {
    return NextResponse.json({ error: 'content must be at least 10 characters' }, { status: 400 })
  }
  if (!contributionType || !ALLOWED_TYPES.includes(contributionType)) {
    return NextResponse.json({ error: 'invalid contributionType' }, { status: 400 })
  }
  if (contributionType === 'review' && rating != null && (rating < 1 || rating > 5)) {
    return NextResponse.json({ error: 'rating must be 1-5' }, { status: 400 })
  }

  // Verify school exists
  const { data: school } = await supabase
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .maybeSingle()

  if (!school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  // Rate limit: max 3 contributions per user per school per day
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await supabase
    .from('user_contributions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('school_id', schoolId)
    .gte('created_at', oneDayAgo)

  if ((recentCount ?? 0) >= 3) {
    return NextResponse.json({ error: 'Too many contributions today' }, { status: 429 })
  }

  // AI moderation
  const modResult = await moderateContent(content.trim(), contributionType)

  const { data: inserted, error } = await supabase
    .from('user_contributions')
    .insert({
      user_id: userId,
      display_name: (displayName || 'Anonymous').trim().slice(0, 50),
      school_id: schoolId,
      contribution_type: contributionType,
      rating: contributionType === 'review' ? (rating ?? null) : null,
      title: title?.trim().slice(0, 100) || null,
      content: content.trim().slice(0, 2000),
      tour_date: tourDate || null,
      status: modResult.approved ? 'published' : 'flagged',
      moderation_note: modResult.approved ? null : modResult.reason,
    })
    .select('id, status')
    .single()

  if (error) {
    console.error('[contributions] insert error:', error.message)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({
    id: inserted.id,
    status: inserted.status,
    message: inserted.status === 'published'
      ? 'Thank you! Your contribution has been published.'
      : 'Thank you! Your contribution is under review.',
  }, { status: 201 })
}
