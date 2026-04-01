/**
 * greatschools.ts — GreatSchools scraper
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

export interface GSSearchResult {
  name: string
  gsId: string
  slug: string
  type: 'public' | 'charter' | 'private'
  grades: string
  city: string
  state: string
  stateAbbr: string
  zip: string
  address: string
  lat: number | null
  lng: number | null
  greatschoolsRating: number | null
  greatschoolsUrl: string
  enrollment: number | null
  district: string | null
}

export interface GSDetailResult {
  name: string
  type: 'public' | 'charter' | 'private'
  grades: string
  enrollment: number | null
  studentTeacherRatio: string | null
  district: string | null
  address: string
  city: string
  state: string
  zip: string
  lat: number | null
  lng: number | null
  website: string | null
  greatschoolsRating: number | null
  mathProficiency: number | null
  readingProficiency: number | null
  demographics: { white: number; hispanic: number; asian: number; black: number; multiracial: number; other: number }
  programs: { gate: boolean; stem: boolean; specialEd: boolean; specialEdDetails: string; dualLanguage: boolean }
  freeReducedLunchPct: number | null
  titleOne: boolean
  sentimentScore: number | null
  sentimentReviewCount: number | null
  sentimentThemes: string[]
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
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Cache-Control': 'max-age=0',
    },
    next: { revalidate: 0 },
  })

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`)
  }
  return res.text()
}

export function makeSlug(name: string, city: string, state: string): string {
  return [name, city, state]
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeType(raw: string): 'public' | 'charter' | 'private' {
  const lower = raw.toLowerCase()
  if (lower.includes('charter')) return 'charter'
  if (lower.includes('private')) return 'private'
  return 'public'
}

function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null
  const cleaned = text.replace(/[^0-9]/g, '')
  const n = parseInt(cleaned)
  return isNaN(n) ? null : n
}

function parsePct(text: string | null | undefined): number | null {
  if (!text) return null
  const m = text.match(/(\d+)/)
  if (!m) return null
  return parseInt(m[1])
}

// Try to extract JSON from embedded __NEXT_DATA__ or window.__ vars
function extractEmbeddedJson(html: string): Record<string, unknown> | null {
  // Strategy 1: __NEXT_DATA__
  const nextDataMatch = html.match(/<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (nextDataMatch) {
    try {
      return JSON.parse(nextDataMatch[1])
    } catch {
      // fall through
    }
  }

  // Strategy 2: window.__DATA__ or window.__INITIAL_STATE__
  const windowVarMatch = html.match(/window\.__(?:DATA|INITIAL_STATE|STATE)__\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/i)
  if (windowVarMatch) {
    try {
      return JSON.parse(windowVarMatch[1])
    } catch {
      // fall through
    }
  }

  return null
}

// Extract GreatSchools gon.search variable (Rails-era data injection)
function extractGonSearch(html: string): { schools: unknown[] } | null {
  const m = html.match(/gon\.search=(\{[\s\S]+?\});(?:gon\.|<\/script>)/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

// Deep-search an object for arrays that look like school lists
function findSchoolsInObject(obj: unknown, depth = 0): unknown[] {
  if (depth > 6) return []
  if (Array.isArray(obj) && obj.length > 0) {
    const first = obj[0]
    if (first && typeof first === 'object' && ('name' in first || 'schoolName' in first)) {
      return obj
    }
  }
  if (obj && typeof obj === 'object') {
    for (const val of Object.values(obj as Record<string, unknown>)) {
      const found = findSchoolsInObject(val, depth + 1)
      if (found.length > 0) return found
    }
  }
  return []
}

function extractStateAbbr(url: string): string {
  // e.g. /california/los-angeles/ → CA
  const stateNames: Record<string, string> = {
    alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
    colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
    hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
    kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
    massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
    missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new-hampshire': 'NH',
    'new-jersey': 'NJ', 'new-mexico': 'NM', 'new-york': 'NY', 'north-carolina': 'NC',
    'north-dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR',
    pennsylvania: 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
    'south-dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT',
    vermont: 'VT', virginia: 'VA', washington: 'WA', 'west-virginia': 'WV',
    wisconsin: 'WI', wyoming: 'WY', 'district-of-columbia': 'DC',
  }
  const m = url.match(/greatschools\.org\/([a-z-]+)\//)
  if (m) return stateNames[m[1]] || m[1].substring(0, 2).toUpperCase()
  return ''
}

// ---------------------------------------------------------------------------
// searchGSByZip
// ---------------------------------------------------------------------------

export async function searchGSByZip(zip: string): Promise<GSSearchResult[]> {
  try {
    await sleep(1000)
    const url = `https://www.greatschools.org/search/search.page?q=${zip}`
    const html = await fetchPage(url)
    const $ = cheerio.load(html)

    // Strategy 1: gon.search (GreatSchools Rails data injection — most reliable)
    const gonData = extractGonSearch(html)
    if (gonData?.schools?.length) {
      console.log(`[GS] gon.search found ${gonData.schools.length} schools for ZIP ${zip}`)
      const results = gonData.schools
        .map((item) => parseGonSchool(item as Record<string, unknown>, zip))
        .filter((s): s is GSSearchResult => s !== null)
      if (results.length > 0) return results
    }

    // Strategy 2: Embedded JSON (__NEXT_DATA__ / window vars)
    const embedded = extractEmbeddedJson(html)
    if (embedded) {
      const schoolsData = findSchoolsInObject(embedded)
      if (schoolsData.length > 0) {
        const results = schoolsData
          .map((item) => parseGSJsonSchool(item as Record<string, unknown>, zip))
          .filter((s): s is GSSearchResult => s !== null)
        if (results.length > 0) return results
      }
    }

    // Strategy 2: HTML selectors (try multiple in order)
    const selectors = [
      '[data-testid="school-card"]',
      '.search-page--school-card',
      '.school-info',
      '.js-school-result',
      '.school-result',
      '[class*="SchoolCard"]',
      '[class*="school-card"]',
    ]

    for (const sel of selectors) {
      const cards = $(sel)
      if (cards.length > 0) {
        const results: GSSearchResult[] = []
        cards.each((_, el) => {
          const parsed = parseGSHtmlCard($, el, zip)
          if (parsed) results.push(parsed)
        })
        if (results.length > 0) return results
      }
    }

    // Strategy 3: Look for any link that goes to a GS school page
    const results: GSSearchResult[] = []
    $('a[href*="/k-12/"]').each((_, el) => {
      const href = $(el).attr('href') || ''
      if (!href.includes('greatschools.org') && !href.startsWith('/')) return
      const fullUrl = href.startsWith('http') ? href : `https://www.greatschools.org${href}`
      const name = $(el).text().trim()
      if (!name || name.length < 3) return
      const stateAbbr = extractStateAbbr(fullUrl)
      const slug = makeSlug(name, '', stateAbbr)
      results.push({
        name,
        gsId: slug,
        slug,
        type: 'public',
        grades: '',
        city: '',
        state: stateAbbr,
        stateAbbr,
        zip,
        address: '',
        lat: null,
        lng: null,
        greatschoolsRating: null,
        greatschoolsUrl: fullUrl,
        enrollment: null,
        district: null,
      })
    })

    return results
  } catch (err) {
    console.error(`[GS] searchGSByZip failed for ${zip}:`, err)
    return []
  }
}

// Parse a school object from gon.search (GreatSchools Rails format)
function parseGonSchool(item: Record<string, unknown>, zip: string): GSSearchResult | null {
  try {
    const name = String(item.name || '')
    if (!name) return null

    const address = item.address as Record<string, unknown> | null
    const city = String(address?.city || '')
    const stateAbbr = String(item.state || 'CA').toUpperCase()
    const schoolZip = String(address?.zip || zip)
    const streetAddress = String(address?.street1 || '')
    const profilePath = (item.links as any)?.profile || ''
    const fullUrl = profilePath
      ? `https://www.greatschools.org${profilePath}`
      : ''

    const rawType = String(item.schoolType || 'public')
    const rating = item.rating != null ? parseInt(String(item.rating)) : null
    const slug = makeSlug(name, city, stateAbbr)

    return {
      name,
      gsId: String(item.id || slug),
      slug,
      type: normalizeType(rawType),
      grades: String(item.gradeLevels || ''),
      city,
      state: stateAbbr,
      stateAbbr,
      zip: schoolZip,
      address: streetAddress,
      lat: item.lat ? parseFloat(String(item.lat)) : null,
      lng: item.lon ? parseFloat(String(item.lon)) : null,
      greatschoolsRating: rating && !isNaN(rating) && rating <= 10 ? rating : null,
      greatschoolsUrl: fullUrl,
      enrollment: item.enrollment ? parseInt(String(item.enrollment)) : null,
      district: String(item.districtName || '') || null,
    }
  } catch {
    return null
  }
}

function parseGSJsonSchool(item: Record<string, unknown>, zip: string): GSSearchResult | null {
  try {
    const name = String(item.name || item.schoolName || '')
    if (!name) return null

    const city = String(item.city || item.locality || '')
    const state = String(item.state || item.stateCode || item.stateName || '')
    const stateAbbr = state.length === 2 ? state.toUpperCase() : state.substring(0, 2).toUpperCase()
    const schoolZip = String(item.zip || item.zipCode || item.postalCode || zip)
    const address = String(item.address || item.street || '')
    const gsUrl = String(item.url || item.greatschoolsUrl || item.pageUrl || '')
    const fullUrl = gsUrl.startsWith('http') ? gsUrl : gsUrl ? `https://www.greatschools.org${gsUrl}` : ''
    const rawType = String(item.type || item.schoolType || item.subtype || 'public')
    const rating = item.rating || item.gsRating || item.overallRating
    const ratingNum = rating ? parseInt(String(rating)) : null

    const latRaw = item.lat || (item.location as any)?.lat
    const lngRaw = item.lon || item.lng || (item.location as any)?.lon || (item.location as any)?.lng

    const slug = makeSlug(name, city, stateAbbr)

    return {
      name,
      gsId: String(item.id || item.gsId || slug),
      slug,
      type: normalizeType(rawType),
      grades: String(item.gradeRange || item.grades || ''),
      city,
      state: stateAbbr,
      stateAbbr,
      zip: schoolZip,
      address,
      lat: latRaw ? parseFloat(String(latRaw)) : null,
      lng: lngRaw ? parseFloat(String(lngRaw)) : null,
      greatschoolsRating: ratingNum && !isNaN(ratingNum) ? ratingNum : null,
      greatschoolsUrl: fullUrl,
      enrollment: item.enrollment ? parseInt(String(item.enrollment)) : null,
      district: String(item.district || item.districtName || '') || null,
    }
  } catch {
    return null
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseGSHtmlCard(
  $: cheerio.CheerioAPI,
  el: any,
  zip: string
): GSSearchResult | null {
  try {
    const card = $(el)

    // Name
    const nameEl = card.find('a[href*="/k-12/"], h2, h3, [class*="name"], [data-testid*="name"]').first()
    const name = nameEl.text().trim() || card.find('a').first().text().trim()
    if (!name || name.length < 2) return null

    // URL
    const linkEl = card.find('a[href*="/k-12/"]').first()
    const href = linkEl.attr('href') || ''
    const fullUrl = href.startsWith('http') ? href : href ? `https://www.greatschools.org${href}` : ''

    const stateAbbr = extractStateAbbr(fullUrl)

    // City
    const cityEl = card.find('[class*="city"], [class*="address"], .address').first()
    const city = cityEl.text().trim().split(',')[0].trim() || ''

    // Type
    const typeEl = card.find('[class*="type"], [class*="school-type"]').first()
    const rawType = typeEl.text().trim() || 'public'

    // Grades
    const gradesEl = card.find('[class*="grade"], [class*="grades"]').first()
    const grades = gradesEl.text().replace(/grades?:?\s*/i, '').trim()

    // Rating
    const ratingEl = card.find('[class*="rating"], [data-testid*="rating"]').first()
    const ratingText = ratingEl.text().trim().replace(/\/10/, '').trim()
    const rating = parseNumber(ratingText)

    const slug = makeSlug(name, city, stateAbbr)

    return {
      name,
      gsId: slug,
      slug,
      type: normalizeType(rawType),
      grades,
      city,
      state: stateAbbr,
      stateAbbr,
      zip,
      address: '',
      lat: null,
      lng: null,
      greatschoolsRating: rating && rating <= 10 ? rating : null,
      greatschoolsUrl: fullUrl,
      enrollment: null,
      district: null,
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// scrapeGSDetail
// ---------------------------------------------------------------------------

// Extract all js-react-on-rails-component blobs into a name→data map.
// Multiple components share the same name (e.g. BasicDataModule) — we keep all as an array.
function extractComponentBlobs(html: string): Map<string, unknown[]> {
  const map = new Map<string, unknown[]>()
  const re = /<script[^>]+class="js-react-on-rails-component"[^>]+data-component-name="([^"]+)"[^>]*>([\s\S]+?)<\/script>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const name = m[1]
      const data = JSON.parse(m[2])
      if (!map.has(name)) map.set(name, [])
      map.get(name)!.push(data)
    } catch { /* skip malformed */ }
  }
  return map
}

// Extract a gon.* variable from the page (handles object and array values)
function extractGonVar(html: string, varName: string): unknown | null {
  const idx = html.indexOf(`gon.${varName}=`)
  if (idx === -1) return null
  const start = idx + `gon.${varName}=`.length
  const endIdx = html.indexOf(';gon.', start)
  if (endIdx === -1) return null
  try {
    return JSON.parse(html.substring(start, endIdx))
  } catch {
    return null
  }
}

export async function scrapeGSDetail(gsUrl: string): Promise<GSDetailResult | null> {
  if (!gsUrl) return null
  try {
    await sleep(1000)
    const html = await fetchPage(gsUrl)
    return parseGSDetailFromComponents(html, gsUrl)
  } catch (err) {
    console.error(`[GS] scrapeGSDetail failed for ${gsUrl}:`, err)
    return null
  }
}

function parseGSDetailFromComponents(html: string, gsUrl: string): GSDetailResult | null {
  try {
    const components = extractComponentBlobs(html)

    // ── Basic school info from gon.school ──────────────────────────────────
    const gonSchool = extractGonVar(html, 'school') as Record<string, unknown> | null
    const name = String(gonSchool?.name || '')
    if (!name) return null

    const stateAbbr = extractStateAbbr(gsUrl)

    // ── GS overall rating from ad targeting ───────────────────────────────
    const adTarget = extractGonVar(html, 'ad_set_targeting') as Record<string, unknown> | null
    const gsRating = adTarget?.gs_rating ? parseInt(String(adTarget.gs_rating)) : null
    const addressStr = String(adTarget?.address || '')
    const zipCode = String(adTarget?.zipcode || '')
    const cityStr = String(adTarget?.city_long || adTarget?.City || '')

    // ── Test scores from BarGraphUnified ──────────────────────────────────
    let mathProficiency: number | null = null
    let readingProficiency: number | null = null
    const barBlobs = components.get('BarGraphUnified') || []
    for (const blob of barBlobs) {
      const rows = (blob as any)?.data as Array<{ breakdown: string; value: string }> | undefined
      if (!rows) continue
      for (const row of rows) {
        const val = parseFloat(row.value)
        if (isNaN(val)) continue
        if (row.breakdown === 'Math' && mathProficiency === null) mathProficiency = Math.round(val)
        if ((row.breakdown === 'English' || row.breakdown === 'Reading') && readingProficiency === null)
          readingProficiency = Math.round(val)
      }
      if (mathProficiency !== null && readingProficiency !== null) break
    }

    // ── Demographics from StudentDemographics component ───────────────────
    const demographics = { white: 0, hispanic: 0, asian: 0, black: 0, multiracial: 0, other: 0 }
    let freeReducedLunchPct: number | null = null
    const demoBlobs = components.get('StudentDemographics') || []
    for (const blob of demoBlobs) {
      const data = (blob as any)?.data
      if (!data) continue
      // Ethnicity
      const ethRows = data.ethnicity_data as Array<{ breakdown: string; value: string }> | undefined
      if (ethRows) {
        for (const row of ethRows) {
          const val = Math.round(parseFloat(row.value))
          const key = row.breakdown.toLowerCase()
          if (key === 'white') demographics.white = val
          else if (key.includes('hispanic') || key.includes('latino')) demographics.hispanic = val
          else if (key === 'asian') demographics.asian = val
          else if (key.includes('black') || key.includes('african')) demographics.black = val
          else if (key.includes('two or more') || key.includes('multi')) demographics.multiracial = val
        }
      }
      // FRL from subgroups
      const subgroups = data.subgroups_data?.value as Array<{ breakdown: string; school_value: number }> | undefined
      if (subgroups) {
        const frlRow = subgroups.find((r) =>
          r.breakdown.toLowerCase().includes('low-income') || r.breakdown.toLowerCase().includes('economically')
        )
        if (frlRow) freeReducedLunchPct = Math.round(frlRow.school_value)
      }
      break
    }
    // Fallback: gon.ethnicity for demographics
    if (demographics.white === 0 && demographics.hispanic === 0) {
      const gonEth = extractGonVar(html, 'ethnicity') as Array<{ breakdown: string; school_value: number }> | null
      if (gonEth) {
        for (const row of gonEth) {
          const val = Math.round(row.school_value)
          const key = row.breakdown.toLowerCase()
          if (key === 'white') demographics.white = val
          else if (key.includes('hispanic') || key.includes('latino')) demographics.hispanic = val
          else if (key === 'asian') demographics.asian = val
          else if (key.includes('black') || key.includes('african')) demographics.black = val
          else if (key.includes('two or more') || key.includes('multi')) demographics.multiracial = val
        }
      }
    }

    // ── Student:teacher ratio from MixedViz ───────────────────────────────
    let studentTeacherRatio: string | null = null
    const mixedBlobs = components.get('MixedViz') || []
    for (const blob of mixedBlobs) {
      const rows = (blob as any)?.data as Array<{ label: string; value: number | string }> | undefined
      if (!rows) continue
      const ratioRow = rows.find((r) => r.label?.toLowerCase().includes('students per teacher'))
      if (ratioRow) {
        studentTeacherRatio = `${ratioRow.value}:1`
        break
      }
    }

    // ── Programs from CoursesAndProgramsModal ─────────────────────────────
    let gate = false, stem = false, dualLanguage = false, specialEd = false
    let specialEdDetails = ''
    const coursesBlobs = components.get('CoursesAndProgramsModal') || []
    for (const blob of coursesBlobs) {
      const cats = (blob as any)?.categories as Array<{ key: string; items: Array<{ key: string; display_text: string }> }> | undefined
      if (!cats) continue
      for (const cat of cats) {
        for (const item of cat.items || []) {
          const k = item.key.toLowerCase()
          if (k.includes('gifted') || k.includes('gate')) gate = true
          if (k.includes('stem') || k.includes('science')) stem = true
          if (k.includes('dual') || k.includes('bilingual')) dualLanguage = true
          if (k.includes('special')) { specialEd = true; specialEdDetails = item.display_text }
        }
      }
      break
    }
    // Also scan page text for programs not in modal
    const pageText = html.toLowerCase()
    if (!gate && (pageText.includes('gifted') || pageText.includes('gate program'))) gate = true
    if (!stem && pageText.includes('stem')) stem = true
    if (!dualLanguage && (pageText.includes('dual language') || pageText.includes('bilingual program'))) dualLanguage = true

    // ── Sentiment from JSON-LD ─────────────────────────────────────────────
    let sentimentScore: number | null = null
    let sentimentReviewCount: number | null = null
    const jsonLdRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    let jsonLdMatch: RegExpExecArray | null
    const jsonLdBlocks: string[] = []
    while ((jsonLdMatch = jsonLdRe.exec(html)) !== null) jsonLdBlocks.push(jsonLdMatch[1])

    for (const block of jsonLdBlocks) {
      try {
        const ld = JSON.parse(block)
        if (ld['@type'] === 'School' && ld.aggregateRating) {
          sentimentScore = parseFloat(String(ld.aggregateRating.ratingValue))
          sentimentReviewCount = parseInt(String(ld.aggregateRating.reviewCount))
          break
        }
      } catch { /* skip */ }
    }

    // ── Review themes from TopicalReviewSummary ───────────────────────────
    const themes: string[] = []
    const topicalBlobs = components.get('TopicalReviewSummary') || []
    for (const blob of topicalBlobs) {
      const topics = (blob as any)?.topics as string[] | undefined
      if (topics) themes.push(...topics)
      break
    }

    // ── Title I from page text ─────────────────────────────────────────────
    const titleOne = pageText.includes('title i') || pageText.includes('title 1')

    // ── Website from JSON-LD sameAs ────────────────────────────────────────
    let website: string | null = null
    for (const block of jsonLdBlocks) {
      try {
        const ld = JSON.parse(block)
        if (ld['@type'] === 'School' && Array.isArray(ld.sameAs)) {
          website = ld.sameAs.find((u: string) =>
            !u.includes('facebook.com') && !u.includes('twitter.com') && u.startsWith('http')
          ) || null
          break
        }
      } catch { /* skip */ }
    }

    console.log(`[GS] Parsed detail for "${name}": math=${mathProficiency}%, reading=${readingProficiency}%, FRL=${freeReducedLunchPct}%, ratio=${studentTeacherRatio}, reviews=${sentimentReviewCount}`)

    return {
      name,
      type: normalizeType(String(adTarget?.type || 'public')),
      grades: '',        // not reliably available on detail page — kept from search result
      enrollment: null,  // not on detail page — kept from search result
      studentTeacherRatio,
      district: null,    // kept from search result
      address: addressStr,
      city: cityStr,
      state: stateAbbr,
      zip: zipCode,
      lat: null,
      lng: null,
      website,
      greatschoolsRating: gsRating,
      mathProficiency,
      readingProficiency,
      demographics,
      programs: { gate, stem, specialEd, specialEdDetails, dualLanguage },
      freeReducedLunchPct,
      titleOne,
      sentimentScore,
      sentimentReviewCount,
      sentimentThemes: themes.slice(0, 8),
    }
  } catch (err) {
    console.error('[GS] parseGSDetailFromComponents failed:', err)
    return null
  }
}

function parseGSDetailFromJson(data: Record<string, unknown>, gsUrl: string): GSDetailResult | null {
  try {
    // Navigate common structures
    const pageProps =
      (data as any)?.props?.pageProps ||
      (data as any)?.pageProps ||
      (data as any)?.school ||
      data

    const school = pageProps?.school || pageProps?.schoolData || pageProps
    if (!school?.name) return null

    const demographics = {
      white: parsePct(school.demographics?.white || school.ethnicity?.white) || 0,
      hispanic: parsePct(school.demographics?.hispanic || school.ethnicity?.hispanic) || 0,
      asian: parsePct(school.demographics?.asian || school.ethnicity?.asian) || 0,
      black: parsePct(school.demographics?.black || school.ethnicity?.black) || 0,
      multiracial: parsePct(school.demographics?.multiracial || school.ethnicity?.twoOrMore) || 0,
      other: parsePct(school.demographics?.other) || 0,
    }

    return {
      name: String(school.name || ''),
      type: normalizeType(String(school.type || school.schoolType || 'public')),
      grades: String(school.gradeRange || school.grades || ''),
      enrollment: school.enrollment ? parseInt(String(school.enrollment)) : null,
      studentTeacherRatio: String(school.studentTeacherRatio || school.teacherStudentRatio || '') || null,
      district: String(school.district?.name || school.districtName || '') || null,
      address: String(school.address || school.street || ''),
      city: String(school.city || school.locality || ''),
      state: String(school.state || school.stateCode || ''),
      zip: String(school.zip || school.zipCode || school.postalCode || ''),
      lat: school.lat ? parseFloat(String(school.lat)) : null,
      lng: school.lon ? parseFloat(String(school.lon)) : null,
      website: String(school.website || school.websiteUrl || '') || null,
      greatschoolsRating: school.rating ? parseInt(String(school.rating)) : null,
      mathProficiency: parsePct(school.testScores?.math || school.mathProficiency),
      readingProficiency: parsePct(school.testScores?.reading || school.readingProficiency),
      demographics,
      programs: {
        gate: Boolean(school.programs?.gate || school.gifted),
        stem: Boolean(school.programs?.stem || school.stem),
        specialEd: Boolean(school.programs?.specialEd || school.specialEducation),
        specialEdDetails: String(school.programs?.specialEdDetails || ''),
        dualLanguage: Boolean(school.programs?.dualLanguage || school.dualLanguage),
      },
      freeReducedLunchPct: parsePct(school.freeReducedLunch || school.lowIncome),
      titleOne: Boolean(school.titleOne || school.title1),
      sentimentScore: school.communityRating ? parseFloat(String(school.communityRating)) : null,
      sentimentReviewCount: school.reviewCount ? parseInt(String(school.reviewCount)) : null,
      sentimentThemes: [],
    }
  } catch {
    return null
  }
}

function parseGSDetailFromHtml($: cheerio.CheerioAPI, gsUrl: string): GSDetailResult | null {
  try {
    // Name
    const name =
      $('h1').first().text().trim() ||
      $('[class*="school-name"]').first().text().trim() ||
      $('[data-testid="school-name"]').first().text().trim() ||
      ''

    if (!name) return null

    // Type
    const typeEl = $('[class*="school-type"], [data-testid="school-type"]').first()
    const rawType = typeEl.text().trim() || 'public'

    // Grades
    const gradesEl = $('[class*="grade-range"], [data-testid*="grade"]').first()
    const grades = gradesEl.text().replace(/grades?:?\s*/i, '').trim()

    // Enrollment
    const enrollmentEl = $('[data-testid="enrollment"], [class*="enrollment"]').first()
    const enrollment = parseNumber(enrollmentEl.text())

    // Address
    const addressEl = $('[class*="address"], address').first()
    const addressText = addressEl.text().replace(/\s+/g, ' ').trim()

    // GS Rating
    const ratingEl = $('[class*="gs-rating"], [data-testid*="overall-rating"], [class*="circle-rating"]').first()
    const ratingText = ratingEl.text().trim()
    const ratingNum = parseNumber(ratingText)

    // Test scores
    const mathEl = $('[data-testid*="math"], [class*="math-proficiency"]').first()
    const readingEl = $('[data-testid*="reading"], [class*="reading-proficiency"]').first()

    // Reviews
    const reviewScoreEl = $('[class*="community-rating"], [data-testid="community-rating"]').first()
    const reviewCountEl = $('[class*="review-count"]').first()

    // Review themes
    const themes: string[] = []
    $('[class*="review-tag"], [class*="theme-tag"]').each((_, el) => {
      const text = $(el).text().trim()
      if (text) themes.push(text)
    })

    // Demographics from text
    const demographics = { white: 0, hispanic: 0, asian: 0, black: 0, multiracial: 0, other: 0 }
    $('[class*="ethnicity"], [class*="demographic"], [data-testid*="ethnicity"]').each((_, el) => {
      const text = $(el).text().toLowerCase()
      const pct = parsePct(text) || 0
      if (text.includes('white')) demographics.white = pct
      else if (text.includes('hispanic') || text.includes('latino')) demographics.hispanic = pct
      else if (text.includes('asian')) demographics.asian = pct
      else if (text.includes('black') || text.includes('african')) demographics.black = pct
      else if (text.includes('multi') || text.includes('two or more')) demographics.multiracial = pct
      else if (text.includes('other')) demographics.other = pct
    })

    // Programs
    const pageText = $('body').text().toLowerCase()
    const programs = {
      gate: pageText.includes('gifted') || pageText.includes('gate'),
      stem: pageText.includes('stem'),
      specialEd: pageText.includes('special education') || pageText.includes('special ed'),
      specialEdDetails: '',
      dualLanguage: pageText.includes('dual language') || pageText.includes('bilingual'),
    }

    // Free/reduced lunch & Title I
    const frlMatch = pageText.match(/(\d+)\s*%\s*(?:free|low.income|reduced)/i)
    const frlPct = frlMatch ? parseInt(frlMatch[1]) : null
    const titleOne = pageText.includes('title i') || pageText.includes('title 1')

    const stateAbbr = extractStateAbbr(gsUrl)

    return {
      name,
      type: normalizeType(rawType),
      grades,
      enrollment,
      studentTeacherRatio: null,
      district: null,
      address: addressText,
      city: '',
      state: stateAbbr,
      zip: '',
      lat: null,
      lng: null,
      website: null,
      greatschoolsRating: ratingNum && ratingNum <= 10 ? ratingNum : null,
      mathProficiency: parsePct(mathEl.text()),
      readingProficiency: parsePct(readingEl.text()),
      demographics,
      programs,
      freeReducedLunchPct: frlPct,
      titleOne,
      sentimentScore: reviewScoreEl.text() ? parseFloat(reviewScoreEl.text().trim()) : null,
      sentimentReviewCount: parseNumber(reviewCountEl.text()),
      sentimentThemes: themes.slice(0, 8),
    }
  } catch (err) {
    console.error('[GS] HTML detail parse failed:', err)
    return null
  }
}
