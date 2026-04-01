/**
 * scrape-school-news.ts
 *
 * Uses Claude with web search to find recent news for each school in the DB
 * and inserts results into the board_insights table.
 *
 * Run with:
 *   npx tsx scripts/scrape-school-news.ts
 *   npx tsx scripts/scrape-school-news.ts --school "Mar Vista Elementary"
 *   npx tsx scripts/scrape-school-news.ts --district
 *   npx tsx scripts/scrape-school-news.ts --dry-run
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ── Arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const dryRun      = args.includes('--dry-run')
const districtMode = args.includes('--district')
const schoolIdx   = args.indexOf('--school')
const schoolFilter = schoolIdx !== -1 ? args[schoolIdx + 1] : null

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
  state: string
  district: string | null
}

interface InsightItem {
  headline: string
  detail: string
  category: 'construction' | 'budget' | 'programs' | 'staffing' | 'policy' | 'enrollment' | 'safety' | 'partnership' | 'legal'
  impact_level: 'high' | 'medium' | 'low'
  sentiment: 'positive' | 'neutral' | 'negative'
  source_url: string
  approximate_date: string
}

const VALID_CATEGORIES = new Set(['construction', 'budget', 'programs', 'staffing', 'policy', 'enrollment', 'safety', 'partnership', 'legal'])
const VALID_IMPACT     = new Set(['high', 'medium', 'low'])
const VALID_SENTIMENT  = new Set(['positive', 'neutral', 'negative'])

// ── Claude call ───────────────────────────────────────────────────────────────

async function callClaudeWithSearch(prompt: string): Promise<string> {
  type MsgParam = { role: 'user' | 'assistant'; content: Anthropic.MessageParam['content'] }
  const messages: MsgParam[] = [{ role: 'user', content: prompt }]

  const MAX_CONTINUATIONS = 5

  for (let i = 0; i < MAX_CONTINUATIONS; i++) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }] as Parameters<typeof anthropic.messages.create>[0]['tools'],
      messages,
    })

    if (response.stop_reason === 'end_turn') {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
    }

    // Server hit iteration limit — re-send to continue
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content as Anthropic.MessageParam['content'] })
      continue
    }

    // Unexpected stop (e.g. max_tokens) — return whatever text we have
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  }

  return ''
}

// ── JSON extraction ───────────────────────────────────────────────────────────

function extractJsonArray(text: string): InsightItem[] {
  // Strip markdown code fences if present
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()

  // Find the outermost JSON array
  const start = stripped.indexOf('[')
  const end   = stripped.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []

  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is InsightItem => {
      if (typeof item !== 'object' || !item) return false
      if (typeof item.headline !== 'string' || !item.headline) return false
      if (typeof item.detail !== 'string' || !item.detail) return false
      if (!VALID_CATEGORIES.has(item.category)) return false
      if (!VALID_IMPACT.has(item.impact_level)) return false
      if (!VALID_SENTIMENT.has(item.sentiment)) return false
      return true
    })
  } catch {
    return []
  }
}

// ── Check recency ─────────────────────────────────────────────────────────────

async function hasRecentInsights(schoolId: string | null): Promise<boolean> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const query = supabase
    .from('board_insights')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', cutoff.toISOString())

  if (schoolId === null) {
    query.is('school_id', null)
  } else {
    query.eq('school_id', schoolId)
  }

  const { count } = await query
  return (count ?? 0) > 0
}

// ── Insert insights ───────────────────────────────────────────────────────────

async function insertInsights(
  items: InsightItem[],
  schoolId: string | null,
  schoolName: string,
  districtName: string | null
): Promise<void> {
  if (items.length === 0) return

  const rows = items.map((item) => ({
    school_id:     schoolId,
    district_name: districtName,
    headline:      item.headline.slice(0, 200),
    detail:        item.detail,
    category:      item.category,
    impact_level:  item.impact_level,
    sentiment:     item.sentiment,
    source_url:    item.source_url || null,
    meeting_date:  parseApproximateDate(item.approximate_date),
    source:        'web_search',
  }))

  const { error } = await supabase.from('board_insights').insert(rows)
  if (error) {
    console.error(`    ERROR inserting insights for "${schoolName}":`, error.message)
  }
}

function parseApproximateDate(dateStr: string): string {
  if (!dateStr || dateStr === 'ongoing') return new Date().toISOString().slice(0, 10)
  // Accept ISO dates (YYYY-MM-DD) or year-only strings
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10)
  if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`
  // Fall back to today
  return new Date().toISOString().slice(0, 10)
}

// ── Search for a school ───────────────────────────────────────────────────────

async function processSchool(school: SchoolRow): Promise<void> {
  const label = `${school.name} (${school.city})`
  process.stdout.write(`  ${label}... `)

  const recent = await hasRecentInsights(school.id)
  if (recent) {
    console.log('SKIP (insights < 30 days old)')
    return
  }

  const prompt = `Search the web for recent news, updates, construction projects, legal issues, partnerships, program changes, renovations, or any notable developments for ${school.name} in ${school.city}, California. Look at ca.gov, the school's own website, local news sites, district announcements, and any government records. Return ONLY a JSON array of items found (or empty array if nothing). Each item: { "headline": string (under 12 words), "detail": string (1-2 sentences explaining what's happening), "category": "construction"|"budget"|"programs"|"staffing"|"policy"|"enrollment"|"safety"|"partnership"|"legal", "impact_level": "high"|"medium"|"low", "sentiment": "positive"|"neutral"|"negative", "source_url": string (the URL where you found this), "approximate_date": string (ISO date or "ongoing") }`

  let items: InsightItem[] = []
  try {
    const text = await callClaudeWithSearch(prompt)
    items = extractJsonArray(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`ERROR: ${msg}`)
    return
  }

  if (dryRun) {
    console.log(`\n    [dry-run] ${items.length} items found`)
    for (const item of items) {
      console.log(`      [${item.impact_level}/${item.sentiment}] ${item.headline}`)
    }
    return
  }

  await insertInsights(items, school.id, school.name, school.district)
  console.log(`${items.length} insight${items.length !== 1 ? 's' : ''} saved`)
}

// ── District-wide search ──────────────────────────────────────────────────────

const DISTRICTS = [
  { name: 'LAUSD', label: 'Los Angeles Unified School District (LAUSD) Westside', city: 'Los Angeles' },
  { name: 'SMMUSD', label: 'Santa Monica-Malibu Unified School District (SMMUSD)', city: 'Santa Monica' },
]

async function processDistrict(district: typeof DISTRICTS[number]): Promise<void> {
  process.stdout.write(`  [District] ${district.name}... `)

  const recent = await hasRecentInsights(null)
  if (recent) {
    console.log('SKIP (insights < 30 days old)')
    return
  }

  const prompt = `Search the web for recent news, policy changes, budget decisions, construction projects, legal issues, curriculum updates, or any notable developments for the ${district.label} in California. Look at the district's official website, ca.gov, local news outlets, and board meeting minutes. Return ONLY a JSON array of items found (or empty array if nothing). Each item: { "headline": string (under 12 words), "detail": string (1-2 sentences explaining what's happening), "category": "construction"|"budget"|"programs"|"staffing"|"policy"|"enrollment"|"safety"|"partnership"|"legal", "impact_level": "high"|"medium"|"low", "sentiment": "positive"|"neutral"|"negative", "source_url": string (the URL where you found this), "approximate_date": string (ISO date or "ongoing") }`

  let items: InsightItem[] = []
  try {
    const text = await callClaudeWithSearch(prompt)
    items = extractJsonArray(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`ERROR: ${msg}`)
    return
  }

  if (dryRun) {
    console.log(`\n    [dry-run] ${items.length} items found`)
    for (const item of items) {
      console.log(`      [${item.impact_level}/${item.sentiment}] ${item.headline}`)
    }
    return
  }

  await insertInsights(items, null, district.name, district.name)
  console.log(`${items.length} insight${items.length !== 1 ? 's' : ''} saved`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== School News Scraper ===')
  if (dryRun)       console.log('DRY RUN — no writes to DB')
  if (schoolFilter) console.log(`Filtering to: "${schoolFilter}"`)
  if (districtMode) console.log('District mode: will also run district-level searches')
  console.log()

  // Load schools
  let query = supabase
    .from('schools')
    .select('id, name, city, state, district')
    .eq('state', 'CA')
    .order('name')

  if (schoolFilter) {
    query = query.ilike('name', `%${schoolFilter}%`)
  }

  const { data: schools, error } = await query
  if (error) {
    console.error('Failed to load schools:', error.message)
    process.exit(1)
  }

  const allSchools = (schools || []) as SchoolRow[]

  if (allSchools.length === 0) {
    console.log(schoolFilter
      ? `No schools matched "${schoolFilter}"`
      : 'No schools found in DB'
    )
    return
  }

  console.log(`Processing ${allSchools.length} school${allSchools.length !== 1 ? 's' : ''}...`)
  console.log()

  let processed = 0
  let skipped   = 0
  let errors    = 0

  for (let i = 0; i < allSchools.length; i++) {
    const school = allSchools[i]
    process.stdout.write(`[${i + 1}/${allSchools.length}] `)

    try {
      await processSchool(school)
      processed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`FATAL: ${msg}`)
      errors++
    }

    // Rate limit — skip delay after last item
    if (i < allSchools.length - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  // District-level searches
  if (districtMode) {
    console.log()
    console.log('Running district-level searches...')
    for (const district of DISTRICTS) {
      try {
        await processDistrict(district)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.log(`FATAL: ${msg}`)
        errors++
      }
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Processed: ${processed}`)
  if (skipped) console.log(`  Skipped:   ${skipped}`)
  if (errors)  console.log(`  Errors:    ${errors}`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
