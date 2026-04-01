/**
 * niche.ts — Niche.com school scraper
 *
 * NOTE: HTML selectors reflect known page structure as of 2025. If scraping returns empty
 * results, inspect the target page and update selectors accordingly. For production use,
 * consider a scraping proxy service (ScraperAPI, Bright Data, Apify) to handle anti-bot
 * measures.
 */

import * as cheerio from 'cheerio'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NicheSearchResult {
  name: string
  nicheSlug: string
  nicheUrl: string
  nicheGrade: string | null
  tuition: string | null
  enrollment: number | null
}

export interface NicheEnrichment {
  nicheGrade: string | null
  tuition: string | null
  enrollment: number | null
  studentTeacherRatio: string | null
  nicheUrl: string
  stateRanking: string | null
  sentimentScore: number | null
  reviewThemes: string[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPage(url: string): Promise<string> {
  const proxyBase = process.env.SCRAPING_PROXY_URL
  const targetUrl = proxyBase
    ? `${proxyBase}?url=${encodeURIComponent(url)}`
    : url

  const res = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

function extractNextData(html: string): Record<string, unknown> | null {
  const match = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null
  const cleaned = text.replace(/[^0-9]/g, '')
  const n = parseInt(cleaned)
  return isNaN(n) ? null : n
}

function extractNicheSlug(url: string): string {
  // e.g. https://www.niche.com/k12/mar-vista-elementary-school-los-angeles-ca/ → mar-vista-elementary-school-los-angeles-ca
  const m = url.match(/niche\.com\/k12\/([^/?#]+)/)
  return m ? m[1] : url.split('/').filter(Boolean).pop() || ''
}

function extractGrade(text: string): string | null {
  const m = text.match(/[A-F][+-]?/)
  return m ? m[0] : null
}

// Deep-search for arrays of school objects in Niche's __NEXT_DATA__
function findNicheSchools(obj: unknown, depth = 0): unknown[] {
  if (depth > 6) return []
  if (Array.isArray(obj) && obj.length > 0) {
    const first = obj[0]
    if (first && typeof first === 'object' && ('name' in first || 'entityName' in first)) {
      return obj
    }
  }
  if (obj && typeof obj === 'object') {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = findNicheSchools(val, depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}

// ---------------------------------------------------------------------------
// searchNicheByZip
// ---------------------------------------------------------------------------

export async function searchNicheByZip(zip: string): Promise<NicheSearchResult[]> {
  try {
    await sleep(1000)
    const url = `https://www.niche.com/k12/search/best-schools/?searchType=school&q=${zip}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    // Strategy 1: __NEXT_DATA__
    const nextData = extractNextData(html)
    if (nextData) {
      const schools = findNicheSchools(nextData)
      if (schools.length > 0) {
        const results = schools
          .map((s) => parseNicheJsonSchool(s as Record<string, unknown>))
          .filter((s): s is NicheSearchResult => s !== null)
        if (results.length > 0) return results
      }
    }

    // Strategy 2: HTML selectors
    const selectors = [
      '[data-testid="search-result"]',
      '.search-result',
      '.school-card',
      '[class*="SearchResult"]',
      '[class*="CardSchool"]',
      'li[class*="card"]',
    ]

    for (const sel of selectors) {
      const cards = $(sel)
      if (cards.length > 0) {
        const results: NicheSearchResult[] = []
        cards.each((_, el) => {
          const parsed = parseNicheHtmlCard($, el)
          if (parsed) results.push(parsed)
        })
        if (results.length > 0) return results
      }
    }

    return []
  } catch (err) {
    console.error(`[Niche] searchNicheByZip failed for ${zip}:`, err)
    return []
  }
}

function parseNicheJsonSchool(item: Record<string, unknown>): NicheSearchResult | null {
  try {
    const name = String(item.name || item.entityName || item.schoolName || '')
    if (!name) return null

    const url = String(item.url || item.nicheUrl || item.pageUrl || '')
    const fullUrl = url.startsWith('http') ? url : url ? `https://www.niche.com${url}` : ''
    const nicheSlug = extractNicheSlug(fullUrl)

    const gradeRaw =
      item.grade ||
      item.overallGrade ||
      item.nicheGrade ||
      (item.grades as any)?.overall ||
      null
    const nicheGrade = gradeRaw ? extractGrade(String(gradeRaw)) : null

    const tuitionRaw =
      item.tuition ||
      item.tuitionAndFees ||
      (item.financials as any)?.tuition ||
      null
    const tuition = tuitionRaw ? String(tuitionRaw) : null

    const enrollmentRaw = item.enrollment || item.studentCount || null
    const enrollment = enrollmentRaw ? parseInt(String(enrollmentRaw)) : null

    return { name, nicheSlug, nicheUrl: fullUrl, nicheGrade, tuition, enrollment }
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNicheHtmlCard(
  $: cheerio.CheerioAPI,
  el: any
): NicheSearchResult | null {
  try {
    const card = $(el)

    const linkEl = card.find('a[href*="/k12/"]').first()
    const href = linkEl.attr('href') || ''
    const fullUrl = href.startsWith('http') ? href : href ? `https://www.niche.com${href}` : ''
    if (!fullUrl) return null

    const nicheSlug = extractNicheSlug(fullUrl)

    const name =
      linkEl.text().trim() ||
      card.find('h2, h3, [class*="name"]').first().text().trim() ||
      ''
    if (!name) return null

    // Grade badge
    const gradeEl = card.find('[class*="grade-badge"], [class*="niche-grade"], [class*="overall-grade"]').first()
    const nicheGrade = gradeEl.text().trim() ? extractGrade(gradeEl.text().trim()) : null

    // Tuition
    const tuitionEl = card.find('[class*="tuition"]').first()
    const tuition = tuitionEl.text().trim() || null

    // Enrollment
    const enrollEl = card.find('[class*="enrollment"]').first()
    const enrollment = parseNumber(enrollEl.text())

    return { name, nicheSlug, nicheUrl: fullUrl, nicheGrade, tuition, enrollment }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// scrapeNicheDetail
// ---------------------------------------------------------------------------

export async function scrapeNicheDetail(nicheUrl: string): Promise<NicheEnrichment | null> {
  if (!nicheUrl) return null
  try {
    await sleep(1000)
    const html = await fetchPage(nicheUrl)
    const $ = cheerio.load(html)

    // Strategy 1: __NEXT_DATA__
    const nextData = extractNextData(html)
    if (nextData) {
      const result = parseNicheDetailFromJson(nextData, nicheUrl)
      if (result) return result
    }

    // Strategy 2: HTML
    return parseNicheDetailFromHtml($, nicheUrl)
  } catch (err) {
    console.error(`[Niche] scrapeNicheDetail failed for ${nicheUrl}:`, err)
    return null
  }
}

function parseNicheDetailFromJson(
  data: Record<string, unknown>,
  nicheUrl: string
): NicheEnrichment | null {
  try {
    const pageProps =
      (data as any)?.props?.pageProps ||
      (data as any)?.pageProps ||
      data

    const school =
      pageProps?.school ||
      pageProps?.entity ||
      pageProps?.data ||
      pageProps

    if (!school) return null

    const gradeRaw =
      school.grade ||
      school.overallGrade ||
      (school.grades as any)?.overall ||
      null
    const nicheGrade = gradeRaw ? extractGrade(String(gradeRaw)) : null

    const tuitionRaw =
      school.tuition ||
      school.tuitionAndFees ||
      (school.financials as any)?.tuition ||
      null
    const tuition = tuitionRaw ? String(tuitionRaw) : null

    const enrollment = school.enrollment ? parseInt(String(school.enrollment)) : null
    const studentTeacherRatio =
      String(school.studentTeacherRatio || school.teacherStudentRatio || '') || null

    const stateRankingRaw =
      school.stateRank ||
      school.stateRanking ||
      (school.rankings as any)?.state ||
      null
    const stateRanking = stateRankingRaw ? String(stateRankingRaw) : null

    const reviewScore = school.reviewScore || school.communityRating || null
    const sentimentScore = reviewScore ? parseFloat(String(reviewScore)) : null

    const themes: string[] = []
    const themesRaw = school.reviewThemes || school.themes || []
    if (Array.isArray(themesRaw)) {
      for (const t of themesRaw) {
        if (typeof t === 'string') themes.push(t)
        else if (t?.name) themes.push(String(t.name))
      }
    }

    return {
      nicheGrade,
      tuition,
      enrollment,
      studentTeacherRatio,
      nicheUrl,
      stateRanking,
      sentimentScore,
      reviewThemes: themes.slice(0, 8),
    }
  } catch {
    return null
  }
}

function parseNicheDetailFromHtml(
  $: cheerio.CheerioAPI,
  nicheUrl: string
): NicheEnrichment | null {
  try {
    // Overall grade
    const gradeEl = $('[class*="overall-grade"], [class*="niche-grade"], [data-testid*="overall-grade"]').first()
    const nicheGrade = gradeEl.text().trim() ? extractGrade(gradeEl.text().trim()) : null

    // Tuition
    const tuitionEl = $('[class*="tuition"], [data-testid*="tuition"]').first()
    const tuition = tuitionEl.text().trim() || null

    // Enrollment
    const enrollEl = $('[class*="enrollment"], [data-testid*="enrollment"]').first()
    const enrollment = parseNumber(enrollEl.text())

    // Student:teacher ratio
    const ratioEl = $('[class*="ratio"], [data-testid*="ratio"]').first()
    const studentTeacherRatio = ratioEl.text().trim() || null

    // State ranking
    const rankEl = $(
      '[class*="state-rank"], [class*="ranking"], [data-testid*="ranking"]'
    ).first()
    const rankText = rankEl.text().trim()
    const stateRanking = rankText || null

    // Review score
    const reviewEl = $('[class*="review-score"], [class*="community-score"], [data-testid*="overall-rating"]').first()
    const reviewText = reviewEl.text().trim()
    const sentimentScore = reviewText ? parseFloat(reviewText) : null

    // Review themes — tag pills
    const themes: string[] = []
    $('[class*="tag-pill"], [class*="review-tag"], [class*="theme"], .niche__tag').each((_, el) => {
      const text = $(el).text().trim()
      if (text && text.length < 60) themes.push(text)
    })

    return {
      nicheGrade,
      tuition,
      enrollment,
      studentTeacherRatio,
      nicheUrl,
      stateRanking,
      sentimentScore: sentimentScore && !isNaN(sentimentScore) ? sentimentScore : null,
      reviewThemes: themes.slice(0, 8),
    }
  } catch (err) {
    console.error('[Niche] HTML detail parse failed:', err)
    return null
  }
}
