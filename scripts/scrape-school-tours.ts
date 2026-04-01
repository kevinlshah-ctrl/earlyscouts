/**
 * scrape-school-tours.ts
 *
 * Uses Claude with web search to find upcoming tour and open house dates for
 * LAUSD Westside schools, then inserts them into the tour_dates table.
 *
 * Run with:
 *   npx tsx scripts/scrape-school-tours.ts
 *   npx tsx scripts/scrape-school-tours.ts --school "Mar Vista Elementary School"
 *   npx tsx scripts/scrape-school-tours.ts --dry-run
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
const dryRun      = args.includes('--dry-run')
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

// ── LA Westside zip codes ─────────────────────────────────────────────────────

const WESTSIDE_ZIPS = [
  '90066', // Mar Vista
  '90049', // Brentwood
  '90025', // West LA
  '90291', // Venice
  '90401', '90402', '90403', '90404', '90405', // Santa Monica
  '90230', '90232', // Culver City
  '90094', '90045', // Playa Vista / Playa del Rey
  '90272', // Pacific Palisades
  '90034', // Palms
]

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchoolRow {
  id: string
  name: string
  city: string
  zip: string
  website: string | null
}

interface TourItem {
  title: string
  date: string | null               // ISO "2026-01-15" or null if recurring/TBD
  time: string | null               // "9:00 AM – 11:00 AM" or null
  event_type: 'tour' | 'open_house' | 'info_session' | 'tk_k_roundup' | 'enrollment'
  location: string | null           // if different from main campus
  rsvp_url: string | null
  rsvp_required: boolean
  source_url: string
  notes: string | null
  is_recurring: boolean
  recurrence_note: string | null    // e.g. "Every Tuesday at 9am through February"
}

const VALID_EVENT_TYPES = new Set(['tour', 'open_house', 'info_session', 'tk_k_roundup', 'enrollment'])

// ── Claude call ───────────────────────────────────────────────────────────────

async function callClaudeWithSearch(prompt: string): Promise<string> {
  type MsgParam = { role: 'user' | 'assistant'; content: Anthropic.MessageParam['content'] }
  const messages: MsgParam[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < 5; i++) {
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

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content as Anthropic.MessageParam['content'] })
      continue
    }

    // max_tokens or unexpected stop — return whatever text we have
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  }

  return ''
}

// ── JSON extraction ───────────────────────────────────────────────────────────

function extractJsonArray(text: string): TourItem[] {
  const stripped = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '').trim()
  const start = stripped.indexOf('[')
  const end   = stripped.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return []

  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1))
    if (!Array.isArray(parsed)) return []

    return parsed.filter((item): item is TourItem => {
      if (typeof item !== 'object' || !item) return false
      if (typeof item.title !== 'string' || !item.title) return false
      if (!VALID_EVENT_TYPES.has(item.event_type)) return false
      if (typeof item.rsvp_required !== 'boolean') item.rsvp_required = false
      if (typeof item.is_recurring !== 'boolean') item.is_recurring = false
      // Validate date format if present
      if (item.date && !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) item.date = null
      return true
    })
  } catch {
    return []
  }
}

// ── Deduplicate against existing rows ─────────────────────────────────────────

async function filterExisting(schoolId: string, items: TourItem[]): Promise<TourItem[]> {
  if (items.length === 0) return []

  const { data: existing } = await supabase
    .from('tour_dates')
    .select('date, title')
    .eq('school_id', schoolId)

  if (!existing?.length) return items

  const seen = new Set(existing.map((r: { date: string | null; title: string }) =>
    `${r.date ?? 'recurring'}|${r.title.toLowerCase().trim()}`
  ))

  return items.filter(
    (item) => !seen.has(`${item.date ?? 'recurring'}|${item.title.toLowerCase().trim()}`)
  )
}

// ── Insert tours ──────────────────────────────────────────────────────────────

async function insertTours(
  items: TourItem[],
  schoolId: string,
  schoolName: string
): Promise<number> {
  if (items.length === 0) return 0

  const rows = items.map((item) => ({
    school_id:       schoolId,
    title:           item.title.slice(0, 300),
    date:            item.date,
    time:            item.time,
    event_type:      item.event_type,
    location:        item.location,
    rsvp_url:        item.rsvp_url?.startsWith('http') ? item.rsvp_url : null,
    rsvp_required:   item.rsvp_required,
    source_url:      item.source_url?.startsWith('http') ? item.source_url : '',
    notes:           item.notes,
    is_recurring:    item.is_recurring,
    recurrence_note: item.recurrence_note,
    school_year:     '2025-26',
    scraped_at:      new Date().toISOString(),
  }))

  const { error } = await supabase.from('tour_dates').insert(rows)
  if (error) {
    console.error(`    ERROR inserting tours for "${schoolName}":`, error.message)
    return 0
  }
  return rows.length
}

// ── Build search prompt ───────────────────────────────────────────────────────

function buildPrompt(school: SchoolRow): string {
  const websiteHint = school.website
    ? ` The school's website is ${school.website}.`
    : ''

  return `Search the web for upcoming school tours, open houses, TK/Kindergarten roundups, and info sessions for ${school.name} in ${school.city}, California for the 2025-2026 school year.${websiteHint}

Search for:
1. "${school.name} school tour 2026"
2. "${school.name} open house"
3. "${school.name} kindergarten roundup"

Look at the school's own website, district pages (lausd.net, smmusd.org), Eventbrite, and local parent community sites.

Return ONLY a JSON array of events found (or empty array [] if nothing found). Each event:
{
  "title": string (e.g. "Fall Open House" or "Kindergarten Roundup"),
  "date": string | null (ISO format "2026-01-15", or null if date not announced / recurring),
  "time": string | null (e.g. "9:00 AM – 11:00 AM", or null if unknown),
  "event_type": "tour" | "open_house" | "info_session" | "tk_k_roundup" | "enrollment",
  "location": string | null (if different from main campus, otherwise null),
  "rsvp_url": string | null (direct URL to RSVP or event page),
  "rsvp_required": boolean,
  "source_url": string (URL where you found this),
  "notes": string | null (any additional details — capacity limits, languages offered, etc.),
  "is_recurring": boolean (true if this is a recurring event like monthly tours),
  "recurrence_note": string | null (e.g. "Every Tuesday at 9am through February 2026")
}

Only include real, specific events — not generic "contact the school" placeholders. If no events are found, return [].`
}

// ── Process one school ────────────────────────────────────────────────────────

async function processSchool(school: SchoolRow): Promise<void> {
  const label = `${school.name} (${school.city})`
  process.stdout.write(`  ${label}... `)

  const prompt = buildPrompt(school)

  let items: TourItem[] = []
  try {
    const text = await callClaudeWithSearch(prompt)
    items = extractJsonArray(text)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`ERROR: ${msg}`)
    return
  }

  if (items.length === 0) {
    console.log('no events found')
    return
  }

  if (dryRun) {
    console.log(`\n    [dry-run] ${items.length} event(s) found:`)
    for (const item of items) {
      const dateStr = item.date ?? (item.is_recurring ? 'recurring' : 'TBD')
      console.log(`      [${item.event_type}] ${item.title} — ${dateStr}${item.time ? ' ' + item.time : ''}`)
      if (item.rsvp_url) console.log(`        RSVP: ${item.rsvp_url}`)
    }
    return
  }

  const newItems = await filterExisting(school.id, items)
  if (newItems.length === 0) {
    console.log('all events already in DB')
    return
  }

  const saved = await insertTours(newItems, school.id, school.name)
  const skipped = items.length - newItems.length
  const parts = [`${saved} saved`]
  if (skipped > 0) parts.push(`${skipped} already existed`)
  console.log(parts.join(', '))
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== School Tour Date Scraper ===')
  if (dryRun)       console.log('DRY RUN — no writes to DB')
  if (schoolFilter) console.log(`Filtering to: "${schoolFilter}"`)
  console.log()

  // Load LA Westside schools
  let query = supabase
    .from('schools')
    .select('id, name, city, zip, website')
    .in('zip', WESTSIDE_ZIPS)
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
      ? `No schools matched "${schoolFilter}" in the LA Westside zips`
      : 'No schools found in LA Westside zip codes'
    )
    return
  }

  console.log(`Found ${allSchools.length} school${allSchools.length !== 1 ? 's' : ''} in LA Westside`)
  console.log()

  let processed = 0
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

    // 2s delay between schools to avoid API rate limits
    if (i < allSchools.length - 1) {
      await new Promise((r) => setTimeout(r, 2000))
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Processed: ${processed}`)
  if (errors) console.log(`  Errors:    ${errors}`)
  console.log()
  console.log('Tour dates are now in the tour_dates table.')
  console.log('Visit a school detail page → Enrollment section to verify.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
