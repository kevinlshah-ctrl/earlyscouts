/**
 * seed-tour-dates.ts
 * Run with: npx tsx scripts/seed-tour-dates.ts
 *
 * Scrapes all configured districts for tour dates and upserts into Supabase.
 * Matches scraped events to schools in the DB by school name + district.
 */

import { createClient } from '@supabase/supabase-js'
import { scrapeAllDistricts, type ScrapedTourDate } from '../src/lib/scraper/district-tours'
import districtConfigs from '../src/data/district-configs.json'

// ── Supabase setup ────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.error('Run: set NEXT_PUBLIC_SUPABASE_URL=... && set SUPABASE_SERVICE_ROLE_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name.toLowerCase()
    .replace(/\b(school|elementary|middle|high|academy|unified|district|the)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function matchSchoolId(
  schoolName: string,
  districtId: string,
  schoolIndex: Map<string, string>
): Promise<string | null> {
  const normalized = normalizeName(schoolName)

  // Exact normalized match
  if (schoolIndex.has(normalized)) return schoolIndex.get(normalized)!

  // Partial match — find any school whose normalized name contains the key words
  const words = normalized.split(' ').filter((w) => w.length > 3)
  for (const [indexedName, id] of Array.from(schoolIndex.entries())) {
    const matchCount = words.filter((w) => indexedName.includes(w)).length
    if (matchCount >= 2 && matchCount >= words.length * 0.6) {
      return id
    }
  }

  return null
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== SchoolScout Tour Date Seeder ===')
  console.log(`Districts: ${districtConfigs.map((d: { id: string }) => d.id).join(', ')}`)
  console.log()

  // ── Step 1: Check if tour_dates table exists ───────────────────────────────
  console.log('Checking Supabase connection and tour_dates table...')
  const { error: tableCheck } = await supabase
    .from('tour_dates')
    .select('id')
    .limit(1)

  if (tableCheck) {
    console.error(`tour_dates table error: ${tableCheck.message}`)
    console.error('Run supabase/migrations/002_tour_dates.sql in Supabase SQL Editor first.')
    process.exit(1)
  }
  console.log('tour_dates table: OK')

  // ── Step 2: Load school index from DB for name matching ───────────────────
  console.log('Loading schools from Supabase for name matching...')
  const { data: schoolRows, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name, district')

  if (schoolErr) {
    console.error('Could not load schools:', schoolErr.message)
    console.log('Proceeding without school matching — events stored without school_id')
  }

  // Build normalized name → id index
  const schoolIndex = new Map<string, string>()
  for (const row of (schoolRows || []) as { id: string; name: string; district: string | null }[]) {
    schoolIndex.set(normalizeName(row.name), row.id)
  }
  console.log(`Loaded ${schoolIndex.size} schools into index`)
  console.log()

  // ── Step 3: Scrape all districts ───────────────────────────────────────────
  console.log('Scraping district pages...')
  const scraped: ScrapedTourDate[] = await scrapeAllDistricts(districtConfigs as Parameters<typeof scrapeAllDistricts>[0])
  console.log()
  console.log(`Total events scraped: ${scraped.length}`)

  if (scraped.length === 0) {
    console.log('No events found across any district. District pages may be JS-rendered or off-season.')
    console.log()
    console.log('Inserting sample tour dates for testing...')
    await insertSampleTourDates()
    return
  }

  // ── Step 4: Match to schools and upsert ───────────────────────────────────
  console.log('Matching events to schools and upserting...')
  let matched = 0
  let unmatched = 0
  let inserted = 0
  let errors = 0

  const batches: object[][] = [[]]
  for (const event of scraped) {
    let schoolId: string | null = null

    if (event.schoolName) {
      schoolId = await matchSchoolId(event.schoolName, event.districtId, schoolIndex)
      if (schoolId) matched++
      else unmatched++
    }

    const row = {
      school_id: schoolId,
      district_id: event.districtId,
      event_type: event.eventType,
      title: event.title,
      date: event.date,
      time: event.time,
      end_date: event.endDate,
      is_recurring: event.isRecurring,
      recurrence_note: event.recurrenceNote,
      location: event.location,
      rsvp_required: event.rsvpRequired,
      rsvp_url: event.rsvpUrl,
      notes: event.notes,
      source_url: event.sourceUrl,
      school_year: event.schoolYear,
      scraped_at: new Date().toISOString(),
    }

    const currentBatch = batches[batches.length - 1]
    currentBatch.push(row)
    if (currentBatch.length >= 50) batches.push([])
  }

  for (const batch of batches) {
    if (batch.length === 0) continue
    const { error } = await supabase.from('tour_dates').insert(batch)
    if (error) {
      console.error(`  Batch insert error: ${error.message}`)
      errors++
    } else {
      inserted += batch.length
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Events scraped:    ${scraped.length}`)
  console.log(`  School-matched:    ${matched}`)
  console.log(`  Unmatched (district-wide): ${unmatched}`)
  console.log(`  Inserted to DB:    ${inserted}`)
  if (errors) console.log(`  Batch errors:      ${errors}`)
  console.log()
  printSample(scraped.slice(0, 5))
}

function printSample(events: ScrapedTourDate[]) {
  if (events.length === 0) return
  console.log('Sample events:')
  for (const e of events) {
    console.log(`  [${e.districtId}] ${e.title} | ${e.date ?? 'no date'} ${e.time ?? ''} | school: ${e.schoolName ?? '(district-wide)'}`)
  }
}

// ── Sample data fallback (for when scraper returns nothing due to JS-rendered pages) ──

async function insertSampleTourDates() {
  // Get a couple of real schools from the DB to attach tours to
  const { data: schools } = await supabase
    .from('schools')
    .select('id, name, address')
    .eq('zip', '90066')
    .limit(3)

  if (!schools?.length) {
    console.log('No schools in DB yet — run a zip search first to populate schools, then re-run this script.')
    return
  }

  const today = new Date()
  const schoolYear = '2026-2027'

  const sampleRows = []
  for (const school of schools) {
    // Add two sample tour dates: one next month, one in two months
    const date1 = new Date(today)
    date1.setMonth(date1.getMonth() + 1)
    date1.setDate(15)

    const date2 = new Date(today)
    date2.setMonth(date2.getMonth() + 2)
    date2.setDate(8)

    sampleRows.push({
      school_id: school.id,
      district_id: 'lausd',
      event_type: 'tour',
      title: 'Campus Tour',
      date: date1.toISOString().split('T')[0],
      time: '9:00 AM - 11:00 AM',
      location: school.address || 'School campus',
      rsvp_required: false,
      rsvp_url: null,
      notes: 'Sample tour date — check school website for current schedule.',
      source_url: 'https://achieve.lausd.net/enroll',
      school_year: schoolYear,
      scraped_at: new Date().toISOString(),
    })
    sampleRows.push({
      school_id: school.id,
      district_id: 'lausd',
      event_type: 'tk_k_roundup',
      title: 'TK/K Roundup',
      date: date2.toISOString().split('T')[0],
      time: '10:00 AM - 12:00 PM',
      location: school.address || 'School campus',
      rsvp_required: true,
      rsvp_url: 'https://achieve.lausd.net/enroll',
      notes: 'Incoming TK and Kindergarten families welcome.',
      source_url: 'https://achieve.lausd.net/enroll',
      school_year: schoolYear,
      scraped_at: new Date().toISOString(),
    })
  }

  const { error } = await supabase.from('tour_dates').insert(sampleRows)
  if (error) {
    console.error('Sample insert error:', error.message)
  } else {
    console.log(`Inserted ${sampleRows.length} sample tour dates for ${schools.length} schools:`)
    for (const s of schools) {
      console.log(`  - ${s.name}`)
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
