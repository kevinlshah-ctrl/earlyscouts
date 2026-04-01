/**
 * generate-review-summaries.ts
 * Run with: npx tsx scripts/generate-review-summaries.ts [--zip <zip>] [--limit <n>] [--force] [--verbose]
 *
 * For each school with 5+ scraped reviews, calls Claude to generate a
 * structured summary and stores it in the review_summaries table.
 *
 * ── Env vars required ─────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const zipArg = args.indexOf('--zip') !== -1 ? args[args.indexOf('--zip') + 1] : null
const limitArg = args.indexOf('--limit') !== -1 ? parseInt(args[args.indexOf('--limit') + 1]) : 100
const forceRefresh = args.includes('--force')
const verbose = args.includes('--verbose')
const MIN_REVIEWS = 5

// ── Clients ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY

if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase env vars'); process.exit(1) }
if (!anthropicKey) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1) }

const supabase = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: anthropicKey })

const MODEL = 'claude-sonnet-4-6'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewRow {
  source: string
  reviewer_type: string | null
  rating: number | null
  review_text: string
  review_date: string | null
}

interface ReviewSummaryResult {
  themes: string[]
  summary: string
  positives: string[]
  concerns: string[]
  vibe: string
}

// ── Should refresh check ──────────────────────────────────────────────────────

async function shouldRefresh(schoolId: string, currentCount: number): Promise<boolean> {
  if (forceRefresh) return true

  const { data: existing } = await supabase
    .from('review_summaries')
    .select('review_count, next_refresh_at')
    .eq('school_id', schoolId)
    .maybeSingle()

  if (!existing) return true
  if (new Date(existing.next_refresh_at) < new Date()) return true

  const countChange = Math.abs(currentCount - (existing.review_count || 0)) / Math.max(existing.review_count || 1, 1)
  if (countChange > 0.2) return true

  return false
}

// ── Claude extraction ─────────────────────────────────────────────────────────

async function generateSummary(schoolName: string, reviews: ReviewRow[]): Promise<ReviewSummaryResult> {
  const reviewText = reviews
    .map((r, i) => {
      const ratingStr = r.rating != null ? `${r.rating}/5` : 'unrated'
      const typeStr = r.reviewer_type ? ` · ${r.reviewer_type}` : ''
      const sourceStr = r.source
      return `Review ${i + 1} (${sourceStr}, ${ratingStr}${typeStr}):\n${r.review_text}`
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
- themes: 4-5 short phrases (3-8 words each) capturing what parents frequently mention, both positive and negative
- summary: balanced, factual, no marketing language. Start with the school name.
- positives: 2-3 specific things parents consistently praise
- concerns: 2-3 specific things parents consistently flag as issues (be honest, don't sugarcoat)
- vibe: ONE word from: nurturing, rigorous, progressive, traditional, diverse, competitive, community-oriented, creative, structured, warm, academic, balanced, inclusive, spirited

Reviews:
${reviewText}`

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  const msg = await stream.finalMessage()
  const raw = msg.content.find((b) => b.type === 'text')?.text ?? '{}'
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

  const parsed = JSON.parse(cleaned) as ReviewSummaryResult

  // Validate shape
  if (!Array.isArray(parsed.themes)) parsed.themes = []
  if (!Array.isArray(parsed.positives)) parsed.positives = []
  if (!Array.isArray(parsed.concerns)) parsed.concerns = []
  if (typeof parsed.summary !== 'string') parsed.summary = ''
  if (typeof parsed.vibe !== 'string') parsed.vibe = 'balanced'

  return parsed
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Review Summary Generator ===')
  console.log(`Model: ${MODEL}`)
  if (forceRefresh) console.log('FORCE REFRESH — regenerating all existing summaries')
  console.log()

  // Verify tables
  const { error: tableErr } = await supabase.from('review_summaries').select('school_id').limit(1)
  if (tableErr) {
    console.error('review_summaries table not found:', tableErr.message)
    console.error('Run supabase/migrations/005_review_summaries.sql first.')
    process.exit(1)
  }

  // Find schools with enough reviews
  let query = supabase
    .from('scraped_reviews')
    .select('school_id, schools(name, zip)')

  if (zipArg) {
    // Filter by zip via join — fetch review counts grouped
    const { data: zipSchools } = await supabase
      .from('schools').select('id').eq('zip', zipArg)
    const zipIds = (zipSchools || []).map((s: { id: string }) => s.id)
    if (zipIds.length === 0) { console.log('No schools for zip:', zipArg); process.exit(0) }
    query = query.in('school_id', zipIds)
  }

  const { data: allReviews } = await query
  if (!allReviews) { console.log('No reviews found.'); process.exit(0) }

  // Count reviews per school
  const countMap = new Map<string, { count: number; name: string; zip: string }>()
  for (const r of allReviews as { school_id: string; schools: { name: string; zip: string } | null }[]) {
    const existing = countMap.get(r.school_id)
    if (existing) {
      existing.count++
    } else {
      countMap.set(r.school_id, {
        count: 1,
        name: r.schools?.name ?? r.school_id,
        zip: r.schools?.zip ?? '',
      })
    }
  }

  const eligible = Array.from(countMap.entries())
    .filter(([, v]) => v.count >= MIN_REVIEWS)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limitArg)

  console.log(`${eligible.length} schools with ${MIN_REVIEWS}+ reviews (of ${countMap.size} total with any reviews)`)
  console.log()

  let generated = 0
  let skipped = 0
  let errors = 0

  for (const [schoolId, info] of eligible) {
    const needsRefresh = await shouldRefresh(schoolId, info.count)
    if (!needsRefresh) {
      if (verbose) console.log(`  ${info.name} — up to date, skipping`)
      skipped++
      continue
    }

    console.log(`Generating: ${info.name} (${info.count} reviews)`)

    // Load review texts for this school
    const { data: reviews } = await supabase
      .from('scraped_reviews')
      .select('source, reviewer_type, rating, review_text, review_date')
      .eq('school_id', schoolId)
      .limit(30)

    if (!reviews || reviews.length < MIN_REVIEWS) { skipped++; continue }

    const sources = Array.from(new Set((reviews as ReviewRow[]).map((r) => r.source)))

    try {
      const result = await generateSummary(info.name, reviews as ReviewRow[])
      if (verbose) {
        console.log(`  vibe: ${result.vibe}`)
        console.log(`  themes: ${result.themes.join(', ')}`)
      }

      // Upsert into review_summaries
      const { error: upsertErr } = await supabase.from('review_summaries').upsert({
        school_id: schoolId,
        themes: result.themes,
        summary: result.summary,
        positives: result.positives,
        concerns: result.concerns,
        vibe: result.vibe,
        review_count: info.count,
        sources,
        generated_at: new Date().toISOString(),
        model_used: MODEL,
        next_refresh_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'school_id' })

      if (upsertErr) {
        console.error(`  Save error: ${upsertErr.message}`)
        errors++
      } else {
        generated++
        console.log(`  ✓ Saved`)
      }
    } catch (e) {
      console.error(`  Generation failed: ${(e as Error).message}`)
      errors++
    }

    // Small delay between API calls
    await new Promise((r) => setTimeout(r, 300))
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Generated: ${generated}`)
  console.log(`  Skipped:   ${skipped}`)
  if (errors) console.log(`  Errors:    ${errors}`)
  console.log()
  console.log('Review summaries are now available in /api/schools/{id}/reviews')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
