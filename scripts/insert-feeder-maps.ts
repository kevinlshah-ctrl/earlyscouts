/**
 * insert-feeder-maps.ts
 *
 * Populates the feeder_maps table with known LA Westside feeder patterns.
 * Schema: one row per school with feeds_into (text[]) and feeds_from (text[]).
 *
 * Run with:
 *   npx tsx scripts/insert-feeder-maps.ts [--dry-run]
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const dryRun = process.argv.includes('--dry-run')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Feeder data ──────────────────────────────────────────────────────────────
// For each school: which schools it feeds into, and which schools feed into it.
// Names must match what's in the DB (used for ILIKE lookup).

interface SchoolFeederData {
  feedsInto: string[]
  feedsFrom: string[]
}

const FEEDER_DATA: Record<string, SchoolFeederData> = {
  // ── LAUSD Westside Elementaries ────────────────────────────────────────────
  // Keys are substrings of the DB name so %key% matches via ILIKE.
  // feedsInto/feedsFrom are display labels stored in the DB column (not used for lookup).
  'Mar Vista Elementary': {
    feedsInto: ['Mark Twain Middle', 'Palms Middle'],
    feedsFrom: [],
  },
  'Grand View Boulevard Elementary': {
    feedsInto: ['Mark Twain Middle'],
    feedsFrom: [],
  },
  'Beethoven Street Elementary': {
    feedsInto: ['Mark Twain Middle'],
    feedsFrom: [],
  },
  'Stoner Avenue Elementary': {
    feedsInto: ['Mark Twain Middle'],
    feedsFrom: [],
  },
  'Braddock Drive Elementary': {
    feedsInto: ['Mark Twain Middle'],
    feedsFrom: [],
  },
  'Clover Avenue Elementary': {
    feedsInto: ['Palms Middle'],
    feedsFrom: [],
  },
  'Richland Avenue Elementary': {
    feedsInto: ['Palms Middle'],
    feedsFrom: [],
  },

  // ── LAUSD Westside Middle Schools ─────────────────────────────────────────
  'Mark Twain Middle': {
    feedsInto: ['Venice High'],
    feedsFrom: [
      'Mar Vista Elementary',
      'Grand View Boulevard Elementary',
      'Beethoven Street Elementary',
      'Stoner Avenue Elementary',
      'Braddock Drive Elementary',
    ],
  },
  'Palms Middle': {
    feedsInto: ['Venice High', 'Hamilton High'],
    feedsFrom: [
      'Mar Vista Elementary',
      'Clover Avenue Elementary',
      'Richland Avenue Elementary',
    ],
  },

  // ── LAUSD Westside High Schools ───────────────────────────────────────────
  'Venice High': {
    feedsInto: [],
    feedsFrom: ['Mark Twain Middle', 'Palms Middle'],
  },
  'Hamilton High': {
    feedsInto: [],
    feedsFrom: ['Palms Middle'],
  },

  // ── SMMUSD Elementaries ───────────────────────────────────────────────────
  'Edison Language Academy': {
    feedsInto: ['John Adams Middle'],
    feedsFrom: [],
  },
  'Grant Elementary': {
    feedsInto: ['John Adams Middle'],
    feedsFrom: [],
  },
  'Franklin Elementary': {
    feedsInto: ['John Adams Middle'],
    feedsFrom: [],
  },
  'Roosevelt Elementary': {
    feedsInto: ['John Adams Middle', 'Lincoln Middle'],
    feedsFrom: [],
  },
  'McKinley Elementary': {
    feedsInto: ['Lincoln Middle'],
    feedsFrom: [],
  },
  'Will Rogers Learning Community': {
    feedsInto: ['John Adams Middle'],
    feedsFrom: [],
  },

  // ── SMMUSD Middle Schools ─────────────────────────────────────────────────
  'John Adams Middle': {
    feedsInto: ['Santa Monica High'],
    feedsFrom: [
      'Edison Language Academy',
      'Grant Elementary',
      'Franklin Elementary',
      'Roosevelt Elementary',
      'Will Rogers Learning Community',
    ],
  },
  'Lincoln Middle': {
    feedsInto: ['Santa Monica High'],
    feedsFrom: ['Roosevelt Elementary', 'McKinley Elementary'],
  },

  // ── SMMUSD High School ────────────────────────────────────────────────────
  'Santa Monica High': {
    feedsInto: [],
    feedsFrom: ['John Adams Middle', 'Lincoln Middle'],
  },
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Feeder Map Importer ===')
  if (dryRun) console.log('DRY RUN — no writes to DB')
  console.log()

  const allNames = Object.keys(FEEDER_DATA)
  console.log(`Looking up ${allNames.length} schools by name...`)

  const nameToId = new Map<string, string>()

  for (const name of allNames) {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, city')
      .ilike('name', `%${name}%`)
      .limit(2)

    if (error) {
      console.warn(`  WARN: DB error looking up "${name}": ${error.message}`)
      continue
    }

    if (!data || data.length === 0) {
      console.warn(`  WARN: Not found in DB — "${name}" (will be skipped)`)
      continue
    }

    if (data.length > 1) {
      console.warn(
        `  WARN: "${name}" matched ${data.length} schools — using "${data[0].name}" (${data[0].city})`
      )
    }

    nameToId.set(name, data[0].id)
    console.log(`  ✓ "${name}" → ${data[0].id} (${data[0].city})`)
  }

  console.log()
  console.log(`Resolved ${nameToId.size} of ${allNames.length} school names`)
  console.log()

  // Build upsert rows
  const rows: {
    school_id: string
    feeds_into: string[]
    feeds_from: string[]
    source: string
    confidence: string
  }[] = []

  for (const [name, data] of Object.entries(FEEDER_DATA)) {
    const schoolId = nameToId.get(name)
    if (!schoolId) {
      console.log(`  SKIP (not in DB): "${name}"`)
      continue
    }
    rows.push({
      school_id: schoolId,
      feeds_into: data.feedsInto,
      feeds_from: data.feedsFrom,
      source: 'LAUSD/SMMUSD district assignment',
      confidence: 'high',
    })
  }

  console.log(`Prepared ${rows.length} feeder_maps rows`)

  if (dryRun) {
    console.log()
    for (const r of rows) {
      const name = [...nameToId.entries()].find(([, id]) => id === r.school_id)?.[0] ?? r.school_id
      console.log(`  ${name}`)
      if (r.feeds_into.length) console.log(`    → feeds into: ${r.feeds_into.join(', ')}`)
      if (r.feeds_from.length) console.log(`    ← feeds from: ${r.feeds_from.join(', ')}`)
    }
    console.log()
    console.log('DRY RUN complete — no writes.')
    return
  }

  console.log()
  console.log('Upserting to feeder_maps...')
  const { error: upsertErr } = await supabase
    .from('feeder_maps')
    .upsert(rows, { onConflict: 'school_id' })

  if (upsertErr) {
    console.error('Upsert failed:', upsertErr.message)
    process.exit(1)
  }

  console.log(`Done. ${rows.length} schools upserted into feeder_maps.`)
  console.log()
  console.log('Visit a school detail page → Feeder Map tab to verify.')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
