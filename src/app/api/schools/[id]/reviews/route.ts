import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'
import type { ReviewSummary } from '@/lib/types'

const MODEL = 'claude-sonnet-4-6'
const MIN_REVIEWS = 5
const GENERATE_TIMEOUT_MS = 30000

// ── On-demand generation (used when no cached summary exists) ─────────────────

async function generateSummaryOnDemand(
  schoolId: string,
  schoolName: string,
  supabase: ReturnType<typeof createServerClient>
): Promise<ReviewSummary | null> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) return null

  // Load reviews
  const { data: reviews } = await supabase
    .from('scraped_reviews')
    .select('source, reviewer_type, rating, review_text, review_date')
    .eq('school_id', schoolId)
    .limit(30)

  if (!reviews || reviews.length < MIN_REVIEWS) {
    console.log(`[reviews] ${schoolId}: only ${reviews?.length ?? 0} scraped reviews, need ${MIN_REVIEWS} — skipping generation`)
    return null
  }

  const anthropic = new Anthropic({ apiKey: anthropicKey })
  const reviewText = reviews
    .map((r, i) => {
      const ratingStr = r.rating != null ? `${r.rating}/5` : 'unrated'
      const typeStr = r.reviewer_type ? ` · ${r.reviewer_type}` : ''
      return `Review ${i + 1} (${r.source}, ${ratingStr}${typeStr}):\n${r.review_text}`
    })
    .join('\n\n---\n\n')

  const prompt = `Analyze these ${reviews.length} parent reviews for ${schoolName}.

Return ONLY a JSON object with exactly these fields:
{
  "themes": ["theme 1", "theme 2", "theme 3", "theme 4", "theme 5"],
  "summary": "2-3 sentence plain-English summary of what parents think overall",
  "positives": ["positive 1", "positive 2", "positive 3"],
  "concerns": ["concern 1", "concern 2", "concern 3"],
  "vibe": "one_word"
}

Rules:
- themes: 4-5 short phrases (3-8 words each) capturing what parents frequently mention
- summary: balanced, factual, no marketing language. Start with the school name.
- positives: 2-3 specific things parents consistently praise
- concerns: 2-3 specific things parents consistently flag (be honest)
- vibe: ONE word from: nurturing, rigorous, progressive, traditional, diverse, competitive, community-oriented, creative, structured, warm, academic, balanced, inclusive, spirited

Reviews:
${reviewText}`

  const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), GENERATE_TIMEOUT_MS))

  const generatePromise = (async () => {
    console.log(`[reviews] generating summary for ${schoolId} (${reviews.length} reviews)`)
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const msg = await stream.finalMessage()
    const raw = msg.content.find((b) => b.type === 'text')?.text ?? '{}'
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch (e) {
      console.error(`[reviews] JSON parse failed for ${schoolId}:`, e, 'cleaned:', cleaned.slice(0, 200))
      throw e
    }

    const sources = Array.from(new Set(reviews.map((r) => r.source as string)))

    // Cache the result
    await supabase.from('review_summaries').upsert({
      school_id: schoolId,
      themes: parsed.themes ?? [],
      summary: parsed.summary ?? '',
      positives: parsed.positives ?? [],
      concerns: parsed.concerns ?? [],
      vibe: parsed.vibe ?? 'balanced',
      review_count: reviews.length,
      sources,
      generated_at: new Date().toISOString(),
      model_used: MODEL,
      next_refresh_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'school_id' })

    return {
      themes: parsed.themes ?? [],
      summary: parsed.summary ?? '',
      positives: parsed.positives ?? [],
      concerns: parsed.concerns ?? [],
      vibe: parsed.vibe ?? 'balanced',
      reviewCount: reviews.length,
      sources,
      generatedAt: new Date().toISOString(),
    } as ReviewSummary
  })()

  return Promise.race([generatePromise, timeoutPromise]).catch((err) => {
    console.error(`[reviews] generation error for ${schoolId}:`, err)
    return null
  })
}

// ── Route ─────────────────────────────────────────────────────────────────────

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
    return NextResponse.json({ hasData: false })
  }

  // Look up school name
  const { data: school } = await supabase
    .from('schools')
    .select('id, name')
    .eq('id', schoolId)
    .maybeSingle()

  if (!school) return NextResponse.json({ hasData: false })

  // Check for a fresh cached summary
  const { data: cached } = await supabase
    .from('review_summaries')
    .select('themes, summary, positives, concerns, vibe, review_count, sources, generated_at, next_refresh_at')
    .eq('school_id', schoolId)
    .maybeSingle()

  const isFresh = cached && new Date(cached.next_refresh_at) > new Date()

  if (isFresh) {
    const result: ReviewSummary = {
      themes: cached.themes ?? [],
      summary: cached.summary ?? '',
      positives: cached.positives ?? [],
      concerns: cached.concerns ?? [],
      vibe: cached.vibe ?? 'balanced',
      reviewCount: cached.review_count ?? 0,
      sources: cached.sources ?? [],
      generatedAt: cached.generated_at,
    }
    return NextResponse.json({ hasData: true, summary: result })
  }

  // No fresh cache — try on-demand generation
  const generated = await generateSummaryOnDemand(schoolId, school.name, supabase)

  if (generated) {
    return NextResponse.json({ hasData: true, summary: generated })
  }

  // Has stale cache — return it rather than nothing
  if (cached) {
    const result: ReviewSummary = {
      themes: cached.themes ?? [],
      summary: cached.summary ?? '',
      positives: cached.positives ?? [],
      concerns: cached.concerns ?? [],
      vibe: cached.vibe ?? 'balanced',
      reviewCount: cached.review_count ?? 0,
      sources: cached.sources ?? [],
      generatedAt: cached.generated_at,
    }
    return NextResponse.json({ hasData: true, summary: result, stale: true })
  }

  return NextResponse.json({ hasData: false })
}
