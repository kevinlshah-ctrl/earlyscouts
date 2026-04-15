import { createClient } from '@supabase/supabase-js'

// Server-side client — uses service role key (never expose to browser)
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  }
  return createClient(url, key, {
    global: {
      fetch: (input, init = {}) =>
        fetch(input as string, { ...init, next: { revalidate: 0 } } as RequestInit),
    },
  })
}

// Type for the schools table row (snake_case, matches Supabase columns)
export interface SchoolRow {
  id: string
  name: string
  slug: string
  type: string
  district: string | null
  state: string
  city: string
  zip: string
  address: string | null
  lat: number | null
  lng: number | null
  website: string | null
  grades: string | null
  enrollment: number | null
  student_teacher_ratio: string | null
  greatschools_rating: number | null
  niche_grade: string | null
  state_ranking: string | null
  math_proficiency: number | null
  reading_proficiency: number | null
  demographics: Record<string, number> | null
  free_reduced_lunch_pct: number | null
  title_one: boolean
  programs: {
    gate: boolean
    stem: boolean
    specialEd: boolean
    specialEdDetails: string
    dualLanguage: boolean
  } | null
  tuition: string | null
  sentiment: {
    score: number
    reviewCount: number
    trend: string
    themes: string[]
  } | null
  greatschools_url: string | null
  niche_url: string | null
  key_insight: string | null
  metro: string | null
  scraped_at: string
  updated_at: string
  deep_report: string | null
  report_data: import('./types').ReportData | null
}

// Convert a DB row to the School type used by the frontend
export function rowToSchool(row: SchoolRow): import('./types').School {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: (row.type || 'public') as 'public' | 'charter' | 'private',
    district: row.district || '',
    state: row.state || '',
    city: row.city || '',
    zip: row.zip || '',
    address: row.address || '',
    lat: row.lat || 0,
    lng: row.lng || 0,
    website: row.website || '',
    grades: row.grades || '',
    enrollment: row.enrollment || 0,
    studentTeacherRatio: row.student_teacher_ratio || 'N/A',
    ratings: {
      greatSchools: row.greatschools_rating,
      niche: row.niche_grade,
      stateRanking: row.state_ranking,
    },
    academics: {
      mathProficiency: row.math_proficiency,
      readingProficiency: row.reading_proficiency,
    },
    demographics: (row.demographics as any) || { white: 0, hispanic: 0, asian: 0, black: 0, multiracial: 0, other: 0 },
    freeReducedLunchPct: row.free_reduced_lunch_pct || 0,
    titleOne: row.title_one || false,
    programs: row.programs || { gate: false, stem: false, specialEd: false, specialEdDetails: '', dualLanguage: false },
    financials: {
      tuition: row.tuition ? parseInt(row.tuition.replace(/[^0-9]/g, '')) || null : null,
      expectedDonation: null,
      ptaActive: false,
    },
    enrollment_info: {
      permitPercent: 'See school website',
      neighborhoodPercent: 'See school website',
      tourDates: [],
      enrollmentOpens: 'See school website',
    },
    feederMap: { feedsInto: [], feedsFrom: [] },
    sentiment: row.sentiment
      ? {
          score: row.sentiment.score,
          reviewCount: row.sentiment.reviewCount,
          trend: (row.sentiment.trend as 'rising' | 'stable' | 'declining') || 'stable',
          themes: row.sentiment.themes,
        }
      : { score: 0, reviewCount: 0, trend: 'stable' as const, themes: [] },
    keyInsight: row.key_insight || `${(row.type || 'public').charAt(0).toUpperCase() + (row.type || 'public').slice(1)} school serving grades ${row.grades || 'K-12'}.`,
    lastUpdated: row.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0],
    greatschoolsUrl: row.greatschools_url || undefined,
    nicheUrl: row.niche_url || undefined,
    deepReport: row.deep_report || null,
    reportData: (row.report_data as import('./types').ReportData) || null,
  }
}
