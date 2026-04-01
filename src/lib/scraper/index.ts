import { searchGSByZip, scrapeGSDetail, makeSlug, type GSSearchResult } from './greatschools'
import { searchNicheByZip, scrapeNicheDetail, type NicheSearchResult } from './niche'
import type { School } from '../types'

// Generate our internal slug format
function generateSlug(name: string, city: string, state: string): string {
  return [name, city, state]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Parse "$41,330/yr" or "41330" → number
function parseTuitionNumber(text: string | null): number | null {
  if (!text) return null
  const match = text.match(/[\d,]+/)
  if (!match) return null
  return parseInt(match[0].replace(/,/g, ''))
}

// Merge GS search result + optional Niche data into School type
function mergeToSchool(
  gs: GSSearchResult,
  niche?: NicheSearchResult
): School & { greatschoolsUrl: string; nicheUrl: string } {
  const tuition = parseTuitionNumber(niche?.tuition || null)
  return {
    id: gs.slug,
    name: gs.name,
    slug: gs.slug,
    type: gs.type,
    district: gs.district || '',
    state: gs.stateAbbr || gs.state.substring(0, 2).toUpperCase(),
    city: gs.city,
    zip: gs.zip,
    address: gs.address || '',
    lat: gs.lat || 0,
    lng: gs.lng || 0,
    website: '',
    grades: gs.grades,
    enrollment: gs.enrollment || niche?.enrollment || 0,
    studentTeacherRatio: 'N/A',
    ratings: {
      greatSchools: gs.greatschoolsRating,
      niche: niche?.nicheGrade || null,
      stateRanking: null,
    },
    academics: { mathProficiency: null, readingProficiency: null },
    demographics: { white: 0, hispanic: 0, asian: 0, black: 0, multiracial: 0, other: 0 },
    freeReducedLunchPct: 0,
    titleOne: false,
    programs: { gate: false, stem: false, specialEd: false, specialEdDetails: '', dualLanguage: false },
    financials: {
      tuition: tuition,
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
    sentiment: { score: 0, reviewCount: 0, trend: 'stable', themes: [] },
    keyInsight: `${gs.type.charAt(0).toUpperCase() + gs.type.slice(1)} school serving grades ${gs.grades} in ${gs.city}.`,
    lastUpdated: new Date().toISOString().split('T')[0],
    greatschoolsUrl: gs.greatschoolsUrl,
    nicheUrl: niche?.nicheUrl || '',
  }
}

// Look up a school by slug when it's not yet in Supabase.
// Searches GS using the slug as a name query, finds the zip, then runs a full zip scrape.
export async function scrapeSchoolBySlug(
  slug: string
): Promise<(School & { greatschoolsUrl: string; nicheUrl: string }) | null> {
  try {
    // Use the slug words as a GS search query
    const query = encodeURIComponent(slug.replace(/-/g, ' '))
    const searchUrl = `https://www.greatschools.org/search/search.page?q=${query}`
    console.log(`[Scraper] scrapeSchoolBySlug: searching GS for "${slug}"`)

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null
    const html = await res.text()

    // Extract gon.search (GreatSchools Rails data injection)
    const m = html.match(/gon\.search=(\{[\s\S]+?\});(?:gon\.|<\/script>)/)
    if (!m) return null
    const gonData: { schools?: unknown[] } = JSON.parse(m[1])
    const schools = gonData.schools || []

    // Find the school whose generated slug matches ours
    for (const item of schools) {
      const s = item as Record<string, unknown>
      const name = String(s.name || '')
      const address = s.address as Record<string, unknown> | null
      const city = String(address?.city || '')
      const state = String(s.state || '').toUpperCase()
      const schoolZip = String(address?.zip || '')
      const candidateSlug = makeSlug(name, city, state)
      if (candidateSlug === slug && schoolZip) {
        console.log(`[Scraper] Matched "${name}" in ZIP ${schoolZip} — running zip scrape`)
        const results = await scrapeSchoolsForZip(schoolZip)
        return results.find((r) => r.slug === slug) || null
      }
    }

    console.warn(`[Scraper] No slug match found for "${slug}" in GS search results`)
    return null
  } catch (err) {
    console.error(`[Scraper] scrapeSchoolBySlug failed for "${slug}":`, err)
    return null
  }
}

// Main export: scrape search results for a zip
export async function scrapeSchoolsForZip(
  zip: string
): Promise<(School & { greatschoolsUrl: string; nicheUrl: string })[]> {
  const [gsResults, nicheResults] = await Promise.allSettled([
    searchGSByZip(zip),
    searchNicheByZip(zip),
  ])

  const gsSchools = gsResults.status === 'fulfilled' ? gsResults.value : []
  const nicheCards = nicheResults.status === 'fulfilled' ? nicheResults.value : []

  // Index Niche by normalized name for matching
  const nicheByName = new Map(nicheCards.map((n) => [n.name.toLowerCase().trim(), n]))

  if (gsSchools.length === 0) {
    // Fall back to Niche-only if GS failed
    return nicheCards.map((n) =>
      mergeToSchool(
        {
          name: n.name,
          gsId: '',
          slug: n.nicheSlug || generateSlug(n.name, '', ''),
          type: 'public',
          grades: '',
          city: '',
          state: '',
          stateAbbr: '',
          zip,
          address: '',
          lat: null,
          lng: null,
          greatschoolsRating: null,
          greatschoolsUrl: '',
          enrollment: n.enrollment,
          district: null,
        },
        n
      )
    )
  }

  return gsSchools.map((gs) =>
    mergeToSchool(gs, nicheByName.get(gs.name.toLowerCase().trim()))
  )
}

// Scrape full detail and return a partial School update
export async function scrapeSchoolDetailUpdate(
  gsUrl: string,
  nicheUrl: string
): Promise<Partial<School> | null> {
  const [gsResult, nicheResult] = await Promise.allSettled([
    gsUrl ? scrapeGSDetail(gsUrl) : Promise.resolve(null),
    nicheUrl ? scrapeNicheDetail(nicheUrl) : Promise.resolve(null),
  ])

  const gs = gsResult.status === 'fulfilled' ? gsResult.value : null
  const niche = nicheResult.status === 'fulfilled' ? nicheResult.value : null

  if (!gs && !niche) return null

  const update: Partial<School> = {}

  if (gs) {
    if (gs.name) update.name = gs.name
    update.grades = gs.grades
    update.enrollment = gs.enrollment || 0
    update.studentTeacherRatio = gs.studentTeacherRatio || 'N/A'
    update.address = gs.address
    if (gs.website) update.website = gs.website
    update.freeReducedLunchPct = gs.freeReducedLunchPct || 0
    update.titleOne = gs.titleOne
    update.programs = gs.programs
    update.demographics = gs.demographics
    update.academics = {
      mathProficiency: gs.mathProficiency,
      readingProficiency: gs.readingProficiency,
    }
    update.ratings = {
      greatSchools: gs.greatschoolsRating,
      niche: null,
      stateRanking: null,
    }
    update.sentiment = {
      score: gs.sentimentScore || 0,
      reviewCount: gs.sentimentReviewCount || 0,
      trend: 'stable',
      themes: gs.sentimentThemes,
    }
  }

  if (niche) {
    update.ratings = {
      ...(update.ratings || { greatSchools: null, niche: null, stateRanking: null }),
      niche: niche.nicheGrade,
      stateRanking: niche.stateRanking,
    }
    if (niche.enrollment && !gs?.enrollment) update.enrollment = niche.enrollment
    if (niche.studentTeacherRatio && !gs?.studentTeacherRatio)
      update.studentTeacherRatio = niche.studentTeacherRatio
    if (niche.sentimentScore) {
      update.sentiment = {
        ...(update.sentiment || { score: 0, reviewCount: 0, trend: 'stable', themes: [] }),
        score: niche.sentimentScore,
        themes: [
          ...(update.sentiment?.themes || []),
          ...niche.reviewThemes,
        ].slice(0, 8),
      }
    }
    if (niche.tuition) {
      const tuitionNum = parseTuitionNumber(niche.tuition)
      update.financials = { tuition: tuitionNum, expectedDonation: null, ptaActive: false }
    }
  }

  update.lastUpdated = new Date().toISOString().split('T')[0]
  return update
}
