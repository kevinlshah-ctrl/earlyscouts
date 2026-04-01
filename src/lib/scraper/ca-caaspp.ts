/**
 * ca-caaspp.ts
 * Parser for California CDE CAASPP (Smarter Balanced) research files.
 *
 * Data source: https://caaspp-elpac.cde.ca.gov/caaspp/ResearchFileList
 * File format: sb_ca{YEAR}_all_csv_v3.zip  →  unzip  →  sb_ca{YEAR}_all_csv_v3.txt (CSV)
 *
 * CAASPP CSV columns:
 *   Type_Id, School_Code, District_Code, County_Code,
 *   School_Name, District_Name, County_Name, Zip_Code,
 *   Research_Name, Grade, Test_Year, Subgroup_ID, Test_Type,
 *   Total_Tested_At_Entity_Level, Total_Tested_With_Scores, Students_Tested,
 *   Mean_Scale_Score, Percentage_Standard_Exceeded, Percentage_Standard_Met,
 *   Percentage_Standard_Nearly_Met, Percentage_Standard_Not_Met,
 *   Percentage_Standard_Met_and_Above, School, District, State, DASS
 *
 * Key value mappings:
 *   Type_Id: 7 = School level rows (others = county/district/state)
 *   Test_Type: 1 = ELA, 2 = Math
 *   Grade: "03"-"08", "11", "13" (13 = all grades combined)
 *   Subgroup_ID: see SUBGROUP_MAP below
 *   Percentage_Standard_Met_and_Above: proficiency %, or "*" = suppressed (<11 students)
 */

import { createReadStream } from 'fs'
import { createInterface } from 'readline'

// ── Subgroup ID mapping (CDE CAASPP codes) ───────────────────────────────────
// Source: CDE CAASPP Research File Layout documentation
const SUBGROUP_MAP: Record<number, string> = {
  1: 'all',
  74: 'black',
  75: 'native_american',
  76: 'asian',
  77: 'filipino',
  78: 'hispanic',
  79: 'pacific_islander',
  80: 'white',
  144: 'multiracial',
  // Economic disadvantage / low income
  28: 'low_income',   // older files
  128: 'low_income',  // newer files: Socioeconomically Disadvantaged
  // English learners
  31: 'english_learner',   // older files
  160: 'english_learner',  // newer files
  // Students with disabilities
  52: 'special_ed',   // older files
  200: 'special_ed',  // newer files
  // Skip: 3=Male, 4=Female, 6=Migrant, 90=Homeless, etc.
}

// ── Subject mapping ───────────────────────────────────────────────────────────
const TEST_TYPE_MAP: Record<number, 'ela' | 'math'> = {
  1: 'ela',
  2: 'math',
}

// ── Grade normalization ───────────────────────────────────────────────────────
// CAASPP uses "03", "04"…"08", "11", "13" (13 = all grades)
function normalizeGrade(rawGrade: string): string {
  const g = rawGrade.trim().replace(/^0+/, '')  // "03" → "3"
  if (g === '13' || g === '' || g.toLowerCase() === 'all') return 'all'
  return g
}

// ── School year from Test_Year ────────────────────────────────────────────────
// Test_Year = 2024 → "2023-2024"
function schoolYearFromTestYear(testYear: number): string {
  return `${testYear - 1}-${testYear}`
}

// ── Proficiency value parsing ─────────────────────────────────────────────────
// CAASPP uses "*" for suppressed values (fewer than 11 students)
function parsePct(raw: string): number | null {
  const s = raw.trim()
  if (!s || s === '*' || s === 'N/A' || s === '--') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

// ── Parsed row type ───────────────────────────────────────────────────────────
export interface CAASSPRow {
  cdsCode: string           // 14-digit CDS: County(2) + District(5) + School(7)
  schoolName: string
  districtName: string
  countyName: string
  city: string
  zip: string
  testYear: number
  schoolYear: string
  subject: 'ela' | 'math'
  grade: string             // "3", "4", ..., "11", "all"
  subgroup: string          // our normalized subgroup key
  studentsTested: number | null
  pctProficient: number | null
  pctAboveStandard: number | null
  pctNearStandard: number | null
  pctBelowStandard: number | null
  meanScore: number | null
}

// ── Column index resolver ─────────────────────────────────────────────────────
// Handles slight column name variations across CAASPP file versions
function buildColumnIndex(headerRow: string[]): Record<string, number> {
  const idx: Record<string, number> = {}
  headerRow.forEach((col, i) => {
    idx[col.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')] = i
  })
  return idx
}

function col(
  row: string[],
  idx: Record<string, number>,
  ...names: string[]
): string {
  for (const name of names) {
    const i = idx[name]
    if (i !== undefined && row[i] !== undefined) return row[i].trim()
  }
  return ''
}

// ── Delimited line splitter (handles quoted fields) ───────────────────────────
function splitDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result
}

// ── Main parser ───────────────────────────────────────────────────────────────

export interface ParseOptions {
  /** Limit to specific school CDS codes (for faster testing). Empty = all schools. */
  filterCdsCodes?: Set<string>
  /** Only include subgroup IDs from SUBGROUP_MAP (default: true) */
  knownSubgroupsOnly?: boolean
  /** Minimum students tested to include a row (avoids privacy-suppressed data) */
  minStudentsTested?: number
}

export async function parseCAASPPFile(
  filePath: string,
  options: ParseOptions = {}
): Promise<CAASSPRow[]> {
  const {
    filterCdsCodes,
    knownSubgroupsOnly = true,
    minStudentsTested = 0,
  } = options

  return new Promise((resolve, reject) => {
    const rows: CAASSPRow[] = []
    let headerProcessed = false
    let colIdx: Record<string, number> = {}
    let delimiter = ','
    let lineCount = 0
    let skippedCount = 0

    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    })

    rl.on('line', (line) => {
      if (!line.trim()) return
      lineCount++

      if (!headerProcessed) {
        // Auto-detect delimiter from header row
        delimiter = line.includes('^') ? '^' : ','
        const fields = splitDelimitedLine(line, delimiter)
        colIdx = buildColumnIndex(fields)
        headerProcessed = true
        return
      }

      const fields = splitDelimitedLine(line, delimiter)

      // ── Filter: school-level rows only ──────────────────────────────────
      // Type_Id = 7 means school; also guard that School_Code isn't all-zeros
      const typeId = col(fields, colIdx, 'type_id')
      const schoolCode = col(fields, colIdx, 'school_code').replace(/^0+$/, '')
      if (typeId !== '7' || !schoolCode) {
        skippedCount++
        return
      }

      // ── Subgroup ─────────────────────────────────────────────────────────
      const subgroupIdRaw = col(fields, colIdx, 'subgroup_id', 'student_group_id')
      const subgroupId = parseInt(subgroupIdRaw, 10)
      if (isNaN(subgroupId)) return

      const subgroup = SUBGROUP_MAP[subgroupId]
      if (knownSubgroupsOnly && !subgroup) return

      // ── Subject ───────────────────────────────────────────────────────────
      const testTypeRaw = col(fields, colIdx, 'test_id', 'test_type')
      const subject = TEST_TYPE_MAP[parseInt(testTypeRaw, 10)]
      if (!subject) return   // skip non-ELA/Math subjects (e.g. science pilots)

      // ── Test year ─────────────────────────────────────────────────────────
      const testYearRaw = col(fields, colIdx, 'test_year')
      const testYear = parseInt(testYearRaw, 10)
      if (isNaN(testYear)) return

      // ── CDS code ──────────────────────────────────────────────────────────
      const countyCode = col(fields, colIdx, 'county_code').padStart(2, '0')
      const districtCode = col(fields, colIdx, 'district_code').padStart(5, '0')
      const schoolCodePadded = col(fields, colIdx, 'school_code').padStart(7, '0')
      const cdsCode = countyCode + districtCode + schoolCodePadded

      // ── Apply CDS filter ──────────────────────────────────────────────────
      if (filterCdsCodes && filterCdsCodes.size > 0 && !filterCdsCodes.has(cdsCode)) return

      // ── Proficiency ───────────────────────────────────────────────────────
      const pctProficient = parsePct(
        col(fields, colIdx,
          'percentage_standard_met_and_above',
          'pct_met_and_above',
          'percent_met_and_above'
        )
      )

      const studentsTested = (() => {
        const s = col(fields, colIdx, 'students_tested', 'total_tested_with_scores')
        const n = parseInt(s, 10)
        return isNaN(n) ? null : n
      })()

      if (minStudentsTested > 0 && (studentsTested === null || studentsTested < minStudentsTested)) return

      // ── Remaining proficiency bands ───────────────────────────────────────
      const pctAbove = parsePct(col(fields, colIdx, 'percentage_standard_exceeded', 'pct_exceeded'))
      const pctNear = parsePct(col(fields, colIdx, 'percentage_standard_nearly_met', 'pct_nearly_met'))
      const pctBelow = parsePct(col(fields, colIdx, 'percentage_standard_not_met', 'pct_not_met'))
      const meanScore = parsePct(col(fields, colIdx, 'mean_scale_score', 'mean_score'))

      const grade = normalizeGrade(col(fields, colIdx, 'grade'))
      const schoolName = col(fields, colIdx, 'school_name')
      const districtName = col(fields, colIdx, 'district_name')
      const countyName = col(fields, colIdx, 'county_name')
      const zip = col(fields, colIdx, 'zip_code')
      // CAASPP doesn't have city in the main file — derive from zip later
      const city = ''

      rows.push({
        cdsCode,
        schoolName,
        districtName,
        countyName,
        city,
        zip,
        testYear,
        schoolYear: schoolYearFromTestYear(testYear),
        subject,
        grade,
        subgroup: subgroup ?? `subgroup_${subgroupId}`,
        studentsTested,
        pctProficient,
        pctAboveStandard: pctAbove,
        pctNearStandard: pctNear,
        pctBelowStandard: pctBelow,
        meanScore,
      })
    })

    rl.on('close', () => {
      console.log(`[CAASPP] Read ${lineCount} lines, parsed ${rows.length} school rows (skipped ${skippedCount} non-school rows)`)
      resolve(rows)
    })

    rl.on('error', reject)
  })
}

// ── School name normalizer (for CDS→school_id matching) ──────────────────────
export function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(school|elementary|middle|high|academy|unified|district|the|of|and|at)\b/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Entities file parser ──────────────────────────────────────────────────────
// Reads the separate sb_ca{YEAR}entities_csv.txt file (caret-delimited).
// Returns Map<cdsCode, { name, zip, city }> for resolving names in files
// that only contain CDS codes (no school name column).
export async function parseEntitiesFile(
  filePath: string
): Promise<Map<string, { name: string; zip: string; city: string }>> {
  const { createReadStream } = await import('fs')
  const { createInterface } = await import('readline')

  return new Promise((resolve, reject) => {
    const map = new Map<string, { name: string; zip: string; city: string }>()
    let headerProcessed = false
    let colIdx: Record<string, number> = {}

    const rl = createInterface({
      input: createReadStream(filePath, { encoding: 'utf8' }),
      crlfDelay: Infinity,
    })

    rl.on('line', (line) => {
      if (!line.trim()) return

      if (!headerProcessed) {
        const delimiter = line.includes('^') ? '^' : ','
        const fields = splitDelimitedLine(line, delimiter)
        colIdx = buildColumnIndex(fields)
        headerProcessed = true
        return
      }

      // Re-detect delimiter from first data line would require storing it —
      // instead detect once: entities files are always caret-delimited.
      // Use the same logic as the header detection already ran.
      const fields = splitDelimitedLine(line, '^')

      const countyCode   = (fields[colIdx['county_code']]   ?? '').trim().padStart(2, '0')
      const districtCode = (fields[colIdx['district_code']] ?? '').trim().padStart(5, '0')
      const schoolCode   = (fields[colIdx['school_code']]   ?? '').trim().padStart(7, '0')

      // Skip non-school rows (school code all zeros = district/county level)
      if (!schoolCode || /^0+$/.test(schoolCode)) return

      const cdsCode = countyCode + districtCode + schoolCode

      const name = (
        fields[colIdx['school_name']] ??
        fields[colIdx['school']] ??
        ''
      ).trim()

      const zip  = (fields[colIdx['zip_code']] ?? fields[colIdx['zip']] ?? '').trim()
      const city = (fields[colIdx['city']] ?? '').trim()

      if (name) map.set(cdsCode, { name, zip, city })
    })

    rl.on('close', () => {
      console.log(`[CAASPP] Entities file: ${map.size} school entries loaded`)
      resolve(map)
    })

    rl.on('error', reject)
  })
}

// ── Build CDS → school_id lookup from CAASPP rows + our schools DB ─────────
// entitiesMap (optional): from parseEntitiesFile — used when the research file
// has no school names in data rows (countywide files).
// Returns: Map<cdsCode, schoolId>
export function buildCdsToSchoolIdMap(
  caasppRows: CAASSPRow[],
  dbSchools: { id: string; name: string; city: string; zip: string; state_school_id?: string | null }[],
  entitiesMap?: Map<string, { name: string; zip: string; city: string }>
): Map<string, string> {
  const map = new Map<string, string>()

  // If school already has state_school_id (CDS) stored, use it directly
  for (const school of dbSchools) {
    if (school.state_school_id) {
      map.set(school.state_school_id, school.id)
    }
  }

  // Try to match each unique CDS code
  const uniqueCds = new Set(caasppRows.map((r) => r.cdsCode))
  for (const cdsCode of Array.from(uniqueCds)) {
    if (map.has(cdsCode)) continue  // already mapped via state_school_id

    // Resolve name + zip: prefer entities file, fall back to data row
    let schoolName = ''
    let zip = ''

    if (entitiesMap) {
      const entry = entitiesMap.get(cdsCode)
      if (entry) {
        schoolName = entry.name
        zip = entry.zip
      }
    }

    if (!schoolName) {
      const sample = caasppRows.find((r) => r.cdsCode === cdsCode)
      if (!sample) continue
      schoolName = sample.schoolName
      zip = sample.zip
    }

    if (!schoolName) continue

    const normName = normalizeSchoolName(schoolName)
    let matched = false

    // Exact normalized name match, confirmed by zip when available
    for (const school of dbSchools) {
      if (normalizeSchoolName(school.name) === normName) {
        if (!zip || school.zip === zip) {
          map.set(cdsCode, school.id)
          matched = true
          break
        }
      }
    }

    if (!matched) {
      // Partial word match fallback
      const words = normName.split(' ').filter((w) => w.length > 3)
      for (const school of dbSchools) {
        const dbNorm = normalizeSchoolName(school.name)
        const matchCount = words.filter((w) => dbNorm.includes(w)).length
        if (matchCount >= 2 && matchCount >= words.length * 0.6) {
          if (!zip || school.zip === zip) {
            map.set(cdsCode, school.id)
            break
          }
        }
      }
    }
  }

  return map
}
