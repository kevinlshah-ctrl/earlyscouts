/**
 * import-ca-assessments.ts
 * Run with: npx tsx scripts/import-ca-assessments.ts --file <path-to-csv>
 *
 * Downloads and imports California CAASPP (Smarter Balanced) assessment data
 * into the assessment_scores table.
 *
 * ── How to get the data file ─────────────────────────────────────────────────
 *
 * 1. Go to: https://caaspp-elpac.cde.ca.gov/caaspp/ResearchFileList
 * 2. Under "Smarter Balanced Summative Assessments", download the most recent
 *    "All" research file (e.g., sb_ca2024_all_csv_v3.zip)
 * 3. Unzip → you get a .txt file that is actually a CSV
 * 4. Run: npx tsx scripts/import-ca-assessments.ts --file sb_ca2024_all_csv_v3.txt
 *
 * ── Env vars required ────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { parseCAASPPFile, parseEntitiesFile, buildCdsToSchoolIdMap } from '../src/lib/scraper/ca-caaspp'
import { existsSync } from 'fs'
import { resolve } from 'path'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const fileArgIdx     = args.indexOf('--file')
const entitiesArgIdx = args.indexOf('--entities')
const filePath     = fileArgIdx     !== -1 ? args[fileArgIdx     + 1] : null
const entitiesPath = entitiesArgIdx !== -1 ? args[entitiesArgIdx + 1] : null
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')

if (!filePath) {
  console.error('Usage: npx tsx scripts/import-ca-assessments.ts --file <path-to-txt> [--entities <path-to-entities-txt>] [--dry-run] [--verbose]')
  console.error()
  console.error('How to get the files:')
  console.error('  1. Visit https://caaspp-elpac.cde.ca.gov/caaspp/ResearchFileList')
  console.error('  2. Download the "All" research file (sb_ca20XX_all_csv_v3.zip) and unzip')
  console.error('  3. If the data file has no school names, also download the entities file')
  console.error('     (sb_ca20XXentities_csv.zip) and unzip it')
  console.error('  4. Pass the data file to --file and the entities file to --entities')
  process.exit(1)
}

const resolvedPath = resolve(filePath)
if (!existsSync(resolvedPath)) {
  console.error(`File not found: ${resolvedPath}`)
  process.exit(1)
}

const resolvedEntitiesPath = entitiesPath ? resolve(entitiesPath) : null
if (resolvedEntitiesPath && !existsSync(resolvedEntitiesPath)) {
  console.error(`Entities file not found: ${resolvedEntitiesPath}`)
  process.exit(1)
}

// ── Supabase ──────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE = 'CDE CAASPP'
const SOURCE_URL = 'https://caaspp-elpac.cde.ca.gov/caaspp/ResearchFileList'

async function main() {
  console.log('=== CA CAASPP Assessment Data Importer ===')
  console.log(`File: ${resolvedPath}`)
  if (dryRun) console.log('DRY RUN — no data will be written')
  console.log()

  // ── Step 1: Check assessment_scores table ─────────────────────────────────
  const { error: tableErr } = await supabase.from('assessment_scores').select('id').limit(1)
  if (tableErr) {
    console.error('assessment_scores table not found:', tableErr.message)
    console.error('Run supabase/migrations/003_assessment_scores.sql first.')
    process.exit(1)
  }

  // ── Step 2: Load CA schools from DB for matching ──────────────────────────
  console.log('Loading CA schools from Supabase...')
  const { data: dbSchools, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name, city, zip, state_school_id')
    .eq('state', 'CA')

  if (schoolErr) {
    console.error('Could not load schools:', schoolErr.message)
    process.exit(1)
  }

  const caSchools = (dbSchools || []) as {
    id: string; name: string; city: string; zip: string; state_school_id: string | null
  }[]
  console.log(`  ${caSchools.length} CA schools in DB`)

  // ── Step 3: Parse the CAASPP data file ───────────────────────────────────
  console.log()
  console.log('Parsing CAASPP data file (this may take 30-60 seconds for the full file)...')
  const allRows = await parseCAASPPFile(resolvedPath, { minStudentsTested: 0 })
  console.log(`  ${allRows.length} valid rows parsed`)

  if (allRows.length === 0) {
    console.error('No rows parsed. Check the file format and column names.')
    process.exit(1)
  }

  // Print sample years found
  const years = Array.from(new Set(allRows.map((r) => r.schoolYear))).sort()
  console.log(`  School years in file: ${years.join(', ')}`)

  // ── Step 3b: Load entities file if provided ───────────────────────────────
  let entitiesMap: Map<string, { name: string; zip: string; city: string }> | undefined
  if (resolvedEntitiesPath) {
    console.log()
    console.log(`Loading entities file: ${resolvedEntitiesPath}`)
    entitiesMap = await parseEntitiesFile(resolvedEntitiesPath)
  }

  // ── Step 4: Build CDS → school_id mapping ─────────────────────────────────
  console.log()
  console.log('Matching CDS codes to school IDs...')
  const cdsMap = buildCdsToSchoolIdMap(allRows, caSchools, entitiesMap)
  const uniqueCds = new Set(allRows.map((r) => r.cdsCode))
  const matchedCds = new Set(Array.from(uniqueCds).filter((c) => cdsMap.has(c)))
  console.log(`  ${uniqueCds.size} unique schools in file`)
  console.log(`  ${matchedCds.size} matched to our DB (${Math.round(matchedCds.size / uniqueCds.size * 100)}%)`)

  if (matchedCds.size === 0) {
    console.log('\n=== DEBUG: Name matching ===')
    const sampleCaaspp = Array.from(new Set(allRows.map(r => r.schoolName))).slice(0, 10)
    const sampleDb = caSchools.slice(0, 10).map(s => s.name)
    console.log('CAASPP names:', sampleCaaspp)
    console.log('DB names:', sampleDb)
    const { normalizeSchoolName } = require('../src/lib/scraper/ca-caaspp')
    console.log('CAASPP normalized:', sampleCaaspp.map(n => normalizeSchoolName(n)))
    console.log('DB normalized:', sampleDb.map(n => normalizeSchoolName(n)))
  }

  if (matchedCds.size === 0) {
    console.error('No schools matched. This may mean:')
    console.error('  - Your CA schools were loaded with state=CA but wrong zip codes')
    console.error('  - Or the school names differ significantly')
    console.error()
    console.error('Try running: npx tsx scripts/seed-schools.ts for some CA zip codes first.')
    process.exit(1)
  }

  // ── Step 5: Save CDS codes back to schools table ──────────────────────────
  if (!dryRun) {
    console.log()
    console.log('Updating schools with CDS codes...')
    let cdsUpdated = 0
    for (const [cdsCode, schoolId] of Array.from(cdsMap.entries())) {
      const school = caSchools.find((s) => s.id === schoolId)
      if (school && !school.state_school_id) {
        await supabase
          .from('schools')
          .update({ state_school_id: cdsCode })
          .eq('id', schoolId)
        cdsUpdated++
      }
    }
    console.log(`  ${cdsUpdated} schools updated with CDS code`)
  }

  // ── Step 6: Filter rows to matched schools only ───────────────────────────
  const matchedRows = allRows.filter((r) => cdsMap.has(r.cdsCode))
  console.log()
  console.log(`Preparing ${matchedRows.length} rows for import...`)

  // ── Step 7: Build DB rows ──────────────────────────────────────────────────
  const dbRows = matchedRows.map((r) => ({
    school_id: cdsMap.get(r.cdsCode)!,
    state: 'CA',
    school_year: r.schoolYear,
    subject: r.subject,
    grade_level: r.grade,
    subgroup: r.subgroup,
    students_tested: r.studentsTested,
    pct_proficient: r.pctProficient,
    pct_above_standard: r.pctAboveStandard,
    pct_near_standard: r.pctNearStandard,
    pct_below_standard: r.pctBelowStandard,
    mean_score: r.meanScore,
    source: SOURCE,
    source_url: SOURCE_URL,
  }))

  if (verbose) {
    console.log('Sample rows:')
    for (const r of dbRows.slice(0, 5)) {
      console.log(`  ${r.school_id} | ${r.school_year} | ${r.subject} | grade ${r.grade_level} | ${r.subgroup} | ${r.pct_proficient}%`)
    }
  }

  if (dryRun) {
    console.log()
    console.log(`DRY RUN complete — would have upserted ${dbRows.length} rows.`)
    return
  }

  // ── Step 7b: Deduplicate by unique key (keep last occurrence) ────────────
  const dedupMap = new Map<string, typeof dbRows[number]>()
  for (const row of dbRows) {
    const key = `${row.school_id}|${row.school_year}|${row.subject}|${row.grade_level}|${row.subgroup}`
    dedupMap.set(key, row)
  }
  const dedupedRows = Array.from(dedupMap.values())
  if (dedupedRows.length < dbRows.length) {
    console.log(`  Deduplicated: ${dbRows.length} → ${dedupedRows.length} rows (removed ${dbRows.length - dedupedRows.length} duplicates)`)
  }

  // ── Step 8: Upsert in batches ─────────────────────────────────────────────
  console.log()
  console.log('Upserting to assessment_scores...')
  const BATCH_SIZE = 200
  let inserted = 0
  let errors = 0

  for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
    const batch = dedupedRows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('assessment_scores')
      .upsert(batch, {
        onConflict: 'school_id,school_year,subject,grade_level,subgroup',
      })
    if (error) {
      console.error(`  Batch ${Math.floor(i / BATCH_SIZE) + 1} error: ${error.message}`)
      errors++
    } else {
      inserted += batch.length
    }
    // Progress
    if ((i / BATCH_SIZE) % 10 === 0) {
      process.stdout.write(`  ${inserted}/${dedupedRows.length}...\r`)
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Rows in file:     ${allRows.length}`)
  console.log(`  Matched schools:  ${matchedCds.size}`)
  console.log(`  Rows to import:   ${matchedRows.length}`)
  console.log(`  Upserted:         ${inserted}`)
  if (errors) console.log(`  Batch errors:     ${errors}`)
  console.log()
  console.log('Done. Assessment scores are now available in /api/schools/{slug}/academics')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
