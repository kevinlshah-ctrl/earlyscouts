import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { AcademicsData, SubjectAcademics } from '@/lib/types'
import { SUBGROUP_LABELS } from '@/lib/types'

// ── Row shape from DB ─────────────────────────────────────────────────────────
interface ScoreRow {
  school_id: string
  school_year: string
  subject: string
  grade_level: string
  subgroup: string
  students_tested: number | null
  pct_proficient: number | null
  pct_above_standard: number | null
  pct_near_standard: number | null
  pct_below_standard: number | null
  mean_score: number | null
  source: string | null
}

// Grade display order (ascending)
const GRADE_ORDER = ['3', '4', '5', '6', '7', '8', '11', 'all']

// Subgroup display order
const SUBGROUP_ORDER = [
  'all', 'white', 'asian', 'hispanic', 'black',
  'multiracial', 'filipino', 'native_american', 'pacific_islander',
  'low_income', 'english_learner', 'special_ed',
]

function sortGrades(grades: string[]): string[] {
  return grades.sort((a, b) => {
    const ai = GRADE_ORDER.indexOf(a)
    const bi = GRADE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return parseInt(a) - parseInt(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

function buildSubjectAcademics(
  subject: 'math' | 'ela',
  rows: ScoreRow[],
  prevYearRows: ScoreRow[]
): SubjectAcademics | null {
  if (rows.length === 0) return null

  const schoolYear = rows[0].school_year

  // ── All students, all grades ──────────────────────────────────────────────
  const allRow = rows.find((r) => r.grade_level === 'all' && r.subgroup === 'all')
  const prevAllRow = prevYearRows.find((r) => r.grade_level === 'all' && r.subgroup === 'all')

  const pctProficient = allRow?.pct_proficient ?? null
  const studentsTested = allRow?.students_tested ?? null
  const yoyChange =
    pctProficient !== null && prevAllRow?.pct_proficient != null
      ? Math.round((pctProficient - prevAllRow.pct_proficient) * 10) / 10
      : null

  // ── By grade (all students, specific grade rows) ──────────────────────────
  const gradeRows = rows.filter((r) => r.subgroup === 'all' && r.grade_level !== 'all')
  const gradeMap = new Map<string, ScoreRow>()
  for (const r of gradeRows) gradeMap.set(r.grade_level, r)

  const gradeLevels = sortGrades(Array.from(gradeMap.keys())).filter((g) => g !== 'all')
  const byGrade = gradeLevels.map((grade) => {
    const r = gradeMap.get(grade)!
    return { grade, pctProficient: r.pct_proficient, studentsTested: r.students_tested }
  })

  // ── By subgroup (all grades row per subgroup) ─────────────────────────────
  const subgroupRows = rows.filter((r) => r.grade_level === 'all' && r.subgroup !== 'all')
  const subgroupMap = new Map<string, ScoreRow>()
  for (const r of subgroupRows) subgroupMap.set(r.subgroup, r)

  // Prev year subgroup lookup
  const prevSubgroupMap = new Map<string, ScoreRow>()
  for (const r of prevYearRows.filter((r) => r.grade_level === 'all' && r.subgroup !== 'all')) {
    prevSubgroupMap.set(r.subgroup, r)
  }

  const presentSubgroups = SUBGROUP_ORDER.filter((sg) => subgroupMap.has(sg))
  const bySubgroup = presentSubgroups.map((sg) => {
    const r = subgroupMap.get(sg)!
    const prev = prevSubgroupMap.get(sg)
    const yoy =
      r.pct_proficient !== null && prev?.pct_proficient != null
        ? Math.round((r.pct_proficient - prev.pct_proficient) * 10) / 10
        : null
    return {
      subgroup: sg,
      label: SUBGROUP_LABELS[sg] ?? sg,
      pctProficient: r.pct_proficient,
      studentsTested: r.students_tested,
      yoyChange: yoy,
    }
  })

  return {
    subject,
    schoolYear,
    pctProficient,
    studentsTested,
    yoyChange,
    byGrade,
    bySubgroup,
    trend: [],  // filled below
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = params.id
  if (!slug) return NextResponse.json({ error: 'School slug required' }, { status: 400 })

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch {
    const empty: AcademicsData = { hasData: false, source: null, schoolYear: null, math: null, ela: null }
    return NextResponse.json(empty)
  }

  // ── Look up school_id by slug ─────────────────────────────────────────────
  const { data: schoolRow } = await supabase
    .from('schools')
    .select('id, state')
    .eq('id', slug)          // our school_id IS the slug
    .maybeSingle()

  if (!schoolRow) {
    const empty: AcademicsData = { hasData: false, source: null, schoolYear: null, math: null, ela: null }
    return NextResponse.json(empty)
  }

  // ── Fetch all assessment scores for this school ───────────────────────────
  const { data: allScoreRows, error } = await supabase
    .from('assessment_scores')
    .select('school_id, school_year, subject, grade_level, subgroup, students_tested, pct_proficient, pct_above_standard, pct_near_standard, pct_below_standard, mean_score, source')
    .eq('school_id', schoolRow.id)
    .order('school_year', { ascending: false })

  if (error || !allScoreRows?.length) {
    const empty: AcademicsData = { hasData: false, source: null, schoolYear: null, math: null, ela: null }
    return NextResponse.json(empty)
  }

  const rows = allScoreRows as ScoreRow[]

  // ── Determine most recent school year ────────────────────────────────────
  const years = Array.from(new Set(rows.map((r) => r.school_year))).sort().reverse()
  const latestYear = years[0]
  const prevYear = years[1] ?? null

  const latestRows = rows.filter((r) => r.school_year === latestYear)
  const prevRows = prevYear ? rows.filter((r) => r.school_year === prevYear) : []

  // ── Build per-subject data ────────────────────────────────────────────────
  const mathLatest = latestRows.filter((r) => r.subject === 'math')
  const elaLatest = latestRows.filter((r) => r.subject === 'ela')
  const mathPrev = prevRows.filter((r) => r.subject === 'math')
  const elaPrev = prevRows.filter((r) => r.subject === 'ela')

  const math = buildSubjectAcademics('math', mathLatest, mathPrev)
  const ela = buildSubjectAcademics('ela', elaLatest, elaPrev)

  // ── Build trend (all years, all/all row, per subject) ────────────────────
  const trendYears = years.slice().reverse()  // oldest → newest

  function buildTrend(subject: 'math' | 'ela') {
    return trendYears
      .map((yr) => {
        const r = rows.find(
          (row) =>
            row.school_year === yr &&
            row.subject === subject &&
            row.grade_level === 'all' &&
            row.subgroup === 'all'
        )
        return { schoolYear: yr, pctProficient: r?.pct_proficient ?? null }
      })
      .filter((t) => t.pctProficient !== null)
  }

  if (math) math.trend = buildTrend('math')
  if (ela) ela.trend = buildTrend('ela')

  const source = rows[0]?.source ?? null

  const result: AcademicsData = {
    hasData: true,
    source,
    schoolYear: latestYear,
    math: math ?? null,
    ela: ela ?? null,
  }

  return NextResponse.json(result)
}
