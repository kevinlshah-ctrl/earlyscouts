/**
 * generate-school-taglines.ts
 *
 * Generates a one-sentence "playground description" for every CA school and
 * writes it to the key_insight column in Supabase.
 *
 * Run with:
 *   npx tsx scripts/generate-school-taglines.ts [--dry-run] [--limit N] [--overwrite]
 *
 * Flags:
 *   --dry-run     Print generated taglines without writing to DB
 *   --limit N     Process at most N schools (useful for testing)
 *   --overwrite   Regenerate taglines even for schools that already have one
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun    = args.includes('--dry-run')
const overwrite = args.includes('--overwrite')
const limitIdx  = args.indexOf('--limit')
const limit     = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : Infinity

// ── Clients ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!anthropicKey) {
  console.error('Missing ANTHROPIC_API_KEY')
  process.exit(1)
}

const supabase  = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: anthropicKey })

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchoolRow {
  id: string
  name: string
  city: string
  type: string
  grades: string | null
  greatschools_rating: number | null
  programs: string[] | null
  key_insight: string | null
}

interface AssessmentRow {
  subject: string
  school_year: string
  pct_proficient: number | null
}

interface ReviewSummaryRow {
  themes: string[] | null
  vibe: string | null
}

interface BoardInsightRow {
  headline: string
  category: string
  impact_level: string
}

// ── Context builder ───────────────────────────────────────────────────────────

function buildContext(
  school: SchoolRow,
  assessments: AssessmentRow[],
  reviewSummary: ReviewSummaryRow | null,
  boardInsights: BoardInsightRow[],
): string {
  const parts: string[] = []

  parts.push(`School: ${school.name}`)
  parts.push(`Type: ${school.type}`)
  if (school.grades) parts.push(`Grades: ${school.grades}`)
  if (school.city)   parts.push(`City: ${school.city}`)

  // GreatSchools rating
  if (school.greatschools_rating !== null) {
    parts.push(`GreatSchools rating: ${school.greatschools_rating}/10`)
  }

  // Programs
  if (school.programs && school.programs.length > 0) {
    parts.push(`Programs: ${school.programs.slice(0, 6).join(', ')}`)
  }

  // Test score trends — take the two most recent years for math + ELA (grade=all, subgroup=all)
  const relevant = assessments.filter(
    (a) => (a.subject === 'math' || a.subject === 'ela') && a.pct_proficient !== null
  )
  if (relevant.length > 0) {
    // Group by subject, sort descending by year, keep top 2
    const bySubject: Record<string, AssessmentRow[]> = {}
    for (const r of relevant) {
      if (!bySubject[r.subject]) bySubject[r.subject] = []
      bySubject[r.subject].push(r)
    }
    for (const [subj, rows] of Object.entries(bySubject)) {
      const sorted = rows.sort((a, b) => b.school_year.localeCompare(a.school_year)).slice(0, 2)
      if (sorted.length === 1) {
        parts.push(`${subj === 'math' ? 'Math' : 'ELA'} proficiency (${sorted[0].school_year}): ${sorted[0].pct_proficient}%`)
      } else if (sorted.length === 2) {
        const delta = (sorted[0].pct_proficient! - sorted[1].pct_proficient!).toFixed(1)
        const trend = parseFloat(delta) >= 2 ? '↑ improving' : parseFloat(delta) <= -2 ? '↓ declining' : '→ stable'
        parts.push(
          `${subj === 'math' ? 'Math' : 'ELA'} proficiency: ${sorted[0].pct_proficient}% (${sorted[0].school_year}), ${trend} vs prior year`
        )
      }
    }
  }

  // Review summary
  if (reviewSummary) {
    if (reviewSummary.vibe)   parts.push(`Parent-reported vibe: "${reviewSummary.vibe}"`)
    if (reviewSummary.themes && reviewSummary.themes.length > 0) {
      parts.push(`Parent themes: ${reviewSummary.themes.slice(0, 4).join('; ')}`)
    }
  }

  // High-impact board insights (most recent 2)
  const highImpact = boardInsights.filter((b) => b.impact_level === 'high').slice(0, 2)
  if (highImpact.length > 0) {
    parts.push(`Recent district news: ${highImpact.map((b) => b.headline).join('; ')}`)
  }

  return parts.join('\n')
}

// ── Claude call ───────────────────────────────────────────────────────────────

async function generateTagline(context: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 80,
    messages: [
      {
        role: 'user',
        content: `${context}

Write a single sentence (under 15 words) describing what this school is known for. Write it like a parent would describe it to another parent at a playground. Be specific. Examples: 'Top-rated STEM school with strong math scores and active parent community' or 'Beloved dual immersion school feeding into Santa Monica's best middle school' or 'Small charter with devoted teachers but limited outdoor space'. Do not use marketing language. Be honest and specific. Output ONLY the sentence, no quotes, no punctuation at the end beyond a period.`,
      },
    ],
  })

  const text = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('')
    .trim()
    // Strip wrapping quotes if the model added them
    .replace(/^["']|["']$/g, '')

  return text
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== School Tagline Generator ===')
  if (dryRun)    console.log('DRY RUN — no writes to DB')
  if (overwrite) console.log('OVERWRITE MODE — regenerating all taglines')
  console.log()

  // 1. Load CA schools
  let query = supabase
    .from('schools')
    .select('id, name, city, type, grades, greatschools_rating, programs, key_insight')
    .eq('state', 'CA')
    .order('name')

  if (!overwrite) {
    // Only schools with a generic fallback or null key_insight
    query = query.or('key_insight.is.null,key_insight.ilike.% school serving grades %')
  }

  const { data: schools, error: schoolsErr } = await query
  if (schoolsErr) {
    console.error('Failed to load schools:', schoolsErr.message)
    process.exit(1)
  }

  const allSchools = (schools || []) as SchoolRow[]
  const toProcess = limit < Infinity ? allSchools.slice(0, limit) : allSchools
  console.log(`${allSchools.length} schools to process${limit < Infinity ? ` (capped at ${limit})` : ''}`)
  console.log()

  // 2. Pre-load supporting data for all schools in bulk
  const schoolIds = toProcess.map((s) => s.id)

  const [assessmentsRes, reviewsRes, boardRes] = await Promise.all([
    supabase
      .from('assessment_scores')
      .select('school_id, subject, school_year, pct_proficient')
      .in('school_id', schoolIds)
      .eq('grade_level', 'all')
      .eq('subgroup', 'all')
      .in('subject', ['math', 'ela'])
      .order('school_year', { ascending: false }),
    supabase
      .from('review_summaries')
      .select('school_id, themes, vibe')
      .in('school_id', schoolIds),
    supabase
      .from('board_insights')
      .select('school_id, headline, category, impact_level')
      .in('school_id', schoolIds)
      .order('meeting_date', { ascending: false }),
  ])

  // Index by school_id
  const assessmentsBySchool = new Map<string, AssessmentRow[]>()
  for (const r of ((assessmentsRes.data || []) as (AssessmentRow & { school_id: string })[])) {
    if (!assessmentsBySchool.has(r.school_id)) assessmentsBySchool.set(r.school_id, [])
    assessmentsBySchool.get(r.school_id)!.push(r)
  }

  const reviewBySchool = new Map<string, ReviewSummaryRow>()
  for (const r of ((reviewsRes.data || []) as (ReviewSummaryRow & { school_id: string })[])) {
    reviewBySchool.set(r.school_id, r)
  }

  const boardBySchool = new Map<string, BoardInsightRow[]>()
  for (const r of ((boardRes.data || []) as (BoardInsightRow & { school_id: string })[])) {
    if (!boardBySchool.has(r.school_id)) boardBySchool.set(r.school_id, [])
    boardBySchool.get(r.school_id)!.push(r)
  }

  console.log(`Loaded: ${assessmentsRes.data?.length ?? 0} assessment rows, ${reviewsRes.data?.length ?? 0} review summaries, ${boardRes.data?.length ?? 0} board insights`)
  console.log()

  // 3. Process each school
  let generated = 0
  let skipped   = 0
  let errors    = 0

  for (let i = 0; i < toProcess.length; i++) {
    const school = toProcess[i]
    process.stdout.write(`[${i + 1}/${toProcess.length}] ${school.name} (${school.city})... `)

    try {
      const context = buildContext(
        school,
        assessmentsBySchool.get(school.id) ?? [],
        reviewBySchool.get(school.id) ?? null,
        boardBySchool.get(school.id) ?? [],
      )

      const tagline = await generateTagline(context)

      if (dryRun) {
        console.log(`\n  → ${tagline}`)
      } else {
        const { error: updateErr } = await supabase
          .from('schools')
          .update({ key_insight: tagline })
          .eq('id', school.id)

        if (updateErr) {
          console.log(`ERROR saving: ${updateErr.message}`)
          errors++
          continue
        }
        console.log(`✓`)
      }

      generated++

      // Brief pause to stay within rate limits on Haiku
      if (i < toProcess.length - 1) await new Promise((r) => setTimeout(r, 150))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`ERROR: ${msg}`)
      errors++
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Generated: ${generated}`)
  if (skipped)  console.log(`  Skipped:   ${skipped}`)
  if (errors)   console.log(`  Errors:    ${errors}`)
  if (!dryRun && generated > 0) {
    console.log()
    console.log('Taglines are now live in the key_insight column.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
