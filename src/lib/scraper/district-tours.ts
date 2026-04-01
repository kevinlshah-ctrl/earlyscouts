import * as cheerio from 'cheerio'

export interface ScrapedTourDate {
  districtId: string
  schoolName: string | null    // null = district-wide event
  eventType: 'tour' | 'open_house' | 'tk_k_roundup' | 'info_session' | 'enrollment'
  title: string
  date: string | null          // ISO "2027-01-22"
  time: string | null          // "9:00 AM - 11:00 AM"
  endDate: string | null
  isRecurring: boolean
  recurrenceNote: string | null
  location: string | null
  rsvpRequired: boolean
  rsvpUrl: string | null
  notes: string | null
  sourceUrl: string
  schoolYear: string
}

export interface DistrictConfig {
  id: string
  name: string
  state: string
  tourPageUrl: string | null
  enrollmentUrl: string | null
  permitsUrl: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_NAMES: Record<string, number> = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
}

/**
 * Returns the current school year in "YYYY-YYYY" format.
 * If month >= August (8), the school year is currentYear / currentYear+1.
 * Otherwise it is currentYear-1 / currentYear.
 */
function getCurrentSchoolYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1 // 1-based
  if (month >= 8) {
    return `${year}-${year + 1}`
  }
  return `${year - 1}-${year}`
}

/**
 * Given a year-less date, decides whether to use this year or next year
 * such that the resulting date is in the future or within the next 9 months.
 */
function resolveYear(month: number, day: number): number {
  const now = new Date()
  const currentYear = now.getFullYear()

  const candidateCurrent = new Date(currentYear, month - 1, day)
  const nineMonthsFromNow = new Date(now.getTime() + 9 * 30 * 24 * 60 * 60 * 1000)

  if (candidateCurrent >= now && candidateCurrent <= nineMonthsFromNow) {
    return currentYear
  }
  // Try next year
  return currentYear + 1
}

/**
 * Parses a date string into ISO "YYYY-MM-DD" or returns null.
 * Handles:
 *   "January 22, 2027"
 *   "Jan 22, 2027"
 *   "Jan. 22, 2027"
 *   "January 22"
 *   "1/22/2027"
 *   "01/22/27"
 */
function parseDateString(text: string): string | null {
  const t = text.trim()

  // Named month: "January 22, 2027" | "Jan 22, 2027" | "Jan. 22, 2027" | "January 22"
  const namedMonthPattern = /\b([A-Za-z]+\.?)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/
  const namedMatch = t.match(namedMonthPattern)
  if (namedMatch) {
    const monthKey = namedMatch[1].replace(/\.$/, '').toLowerCase()
    const monthNum = MONTH_NAMES[monthKey]
    if (monthNum) {
      const day = parseInt(namedMatch[2], 10)
      const year = namedMatch[3] ? parseInt(namedMatch[3], 10) : resolveYear(monthNum, day)
      if (day >= 1 && day <= 31) {
        return `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
  }

  // Numeric: "1/22/2027" | "01/22/27"
  const numericPattern = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/
  const numericMatch = t.match(numericPattern)
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10)
    const day = parseInt(numericMatch[2], 10)
    let year = parseInt(numericMatch[3], 10)
    if (year < 100) {
      year += year >= 50 ? 1900 : 2000
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

/**
 * Parses a time string into a normalized form like "9:00 AM" or
 * "9:00 AM - 11:00 AM". Returns null if no time found.
 *
 * Handles: "9:00 AM", "9am", "9:00 AM - 11:00 AM", "9-11am", "10:30am"
 */
function parseTimeString(text: string): string | null {
  const t = text.trim()

  // Range with explicit AM/PM on each side: "9:00 AM - 11:00 AM"
  const rangeExplicit = t.match(
    /(\d{1,2}(?::\d{2})?)\s*(AM|PM)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i
  )
  if (rangeExplicit) {
    const start = normalizeTime(rangeExplicit[1], rangeExplicit[2].toUpperCase())
    const end = normalizeTime(rangeExplicit[3], rangeExplicit[4].toUpperCase())
    return `${start} - ${end}`
  }

  // Range sharing AM/PM: "9-11am" or "9:00-11:00am"
  const rangeShared = t.match(/(\d{1,2}(?::\d{2})?)\s*[-–]\s*(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i)
  if (rangeShared) {
    const meridiem = rangeShared[3].toUpperCase() as 'AM' | 'PM'
    const start = normalizeTime(rangeShared[1], meridiem)
    const end = normalizeTime(rangeShared[2], meridiem)
    return `${start} - ${end}`
  }

  // Single time: "9:00 AM" | "9am" | "10:30am"
  const single = t.match(/(\d{1,2}(?::\d{2})?)\s*(AM|PM)/i)
  if (single) {
    return normalizeTime(single[1], single[2].toUpperCase() as 'AM' | 'PM')
  }

  return null
}

/**
 * Normalizes a time fragment into "H:MM AM/PM" format.
 */
function normalizeTime(timePart: string, meridiem: string): string {
  const colonIdx = timePart.indexOf(':')
  let hours: string
  let minutes: string
  if (colonIdx !== -1) {
    hours = timePart.slice(0, colonIdx)
    minutes = timePart.slice(colonIdx + 1).padStart(2, '0')
  } else {
    hours = timePart
    minutes = '00'
  }
  return `${parseInt(hours, 10)}:${minutes} ${meridiem}`
}

/**
 * Infers the event type from a title or surrounding context string.
 */
function detectEventType(
  text: string
): 'tour' | 'open_house' | 'tk_k_roundup' | 'info_session' | 'enrollment' {
  const lower = text.toLowerCase()
  if (lower.includes('roundup')) return 'tk_k_roundup'
  if (lower.includes('open house')) return 'open_house'
  if (lower.includes('info') || lower.includes('information')) return 'info_session'
  if (lower.includes('tour')) return 'tour'
  return 'enrollment'
}

// ---------------------------------------------------------------------------
// Extraction strategies
// ---------------------------------------------------------------------------

const EVENT_KEYWORDS = ['tour', 'open house', 'roundup', 'info night', 'info session', 'enrollment', 'campus', 'visit']
const DATE_PATTERN = /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:\d{4})?\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/gi

/**
 * Strategy A: Extract events from JSON-LD Event schema blocks.
 */
function extractFromJsonLd(
  $: cheerio.CheerioAPI,
  districtId: string,
  sourceUrl: string,
  schoolYear: string
): ScrapedTourDate[] {
  const results: ScrapedTourDate[] = []

  $('script[type="application/ld+json"]').each((_i, el) => {
    try {
      const raw = $(el).html() || ''
      const json = JSON.parse(raw)

      const items: unknown[] = Array.isArray(json)
        ? json
        : json['@graph']
          ? json['@graph']
          : [json]

      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const obj = item as Record<string, unknown>
        if (obj['@type'] !== 'Event') continue

        const name = typeof obj['name'] === 'string' ? obj['name'] : ''
        if (!name) continue

        const startDateRaw = typeof obj['startDate'] === 'string' ? obj['startDate'] : null
        const endDateRaw = typeof obj['endDate'] === 'string' ? obj['endDate'] : null

        let date: string | null = null
        let time: string | null = null

        if (startDateRaw) {
          if (startDateRaw.includes('T')) {
            // Has time component
            const [datePart, timePart] = startDateRaw.split('T')
            date = datePart
            if (timePart) {
              time = parseTimeString(timePart.replace(/[+-]\d{2}:\d{2}$|Z$/, ''))
            }
          } else {
            date = parseDateString(startDateRaw)
          }
        }

        const locationRaw = obj['location']
        let location: string | null = null
        if (typeof locationRaw === 'string') {
          location = locationRaw
        } else if (locationRaw && typeof locationRaw === 'object') {
          const loc = locationRaw as Record<string, unknown>
          location = typeof loc['name'] === 'string' ? loc['name'] : null
        }

        const urlRaw = obj['url']
        const rsvpUrl = typeof urlRaw === 'string' ? urlRaw : null

        results.push({
          districtId,
          schoolName: null,
          eventType: detectEventType(name),
          title: name,
          date,
          time,
          endDate: endDateRaw ? (endDateRaw.split('T')[0] ?? null) : null,
          isRecurring: false,
          recurrenceNote: null,
          location,
          rsvpRequired: rsvpUrl !== null,
          rsvpUrl,
          notes: typeof obj['description'] === 'string' ? obj['description'] : null,
          sourceUrl,
          schoolYear,
        })
      }
    } catch {
      // Malformed JSON-LD — skip silently
    }
  })

  return results
}

/**
 * Strategy B: Find date patterns in text nodes; look ±200 chars for event keywords.
 */
function extractFromTextNodes(
  $: cheerio.CheerioAPI,
  districtId: string,
  sourceUrl: string,
  schoolYear: string
): ScrapedTourDate[] {
  const results: ScrapedTourDate[] = []

  // Collect all text content from the page body
  const bodyText = $('body').text()

  // Reset regex lastIndex
  DATE_PATTERN.lastIndex = 0

  let match: RegExpExecArray | null
  while ((match = DATE_PATTERN.exec(bodyText)) !== null) {
    const matchIndex = match.index
    const surrounding = bodyText.slice(
      Math.max(0, matchIndex - 200),
      Math.min(bodyText.length, matchIndex + 200)
    )

    const lowerSurround = surrounding.toLowerCase()
    const hasKeyword = EVENT_KEYWORDS.some((kw) => lowerSurround.includes(kw))
    if (!hasKeyword) continue

    const date = parseDateString(match[0])
    if (!date) continue

    // Extract time from surrounding text
    const time = parseTimeString(surrounding) // returns null if not found

    // Find a nearby heading or bold text for the title
    let title = ''
    $('h1, h2, h3, h4, b, strong').each((_i, el) => {
      const headingText = $(el).text().trim()
      if (!headingText) return
      const lowerHeading = headingText.toLowerCase()
      if (EVENT_KEYWORDS.some((kw) => lowerHeading.includes(kw))) {
        if (!title) title = headingText
      }
    })

    if (!title) {
      // Fallback: use first event keyword found in surrounding text
      for (const kw of EVENT_KEYWORDS) {
        if (lowerSurround.includes(kw)) {
          title = kw.charAt(0).toUpperCase() + kw.slice(1)
          break
        }
      }
    }

    if (!title) title = 'School Event'

    results.push({
      districtId,
      schoolName: null,
      eventType: detectEventType(title + ' ' + surrounding),
      title,
      date,
      time,
      endDate: null,
      isRecurring: false,
      recurrenceNote: null,
      location: null,
      rsvpRequired: false,
      rsvpUrl: null,
      notes: null,
      sourceUrl,
      schoolYear,
    })
  }

  return results
}

/**
 * Strategy C: Parse <table> rows and <li> items that contain date patterns.
 */
function extractFromTableAndLists(
  $: cheerio.CheerioAPI,
  districtId: string,
  sourceUrl: string,
  schoolYear: string
): ScrapedTourDate[] {
  const results: ScrapedTourDate[] = []

  const candidates: string[] = []

  // Table rows
  $('tr').each((_i, el) => {
    candidates.push($(el).text())
  })

  // List items
  $('li').each((_i, el) => {
    candidates.push($(el).text())
  })

  for (const text of candidates) {
    DATE_PATTERN.lastIndex = 0
    const dateMatch = DATE_PATTERN.exec(text)
    if (!dateMatch) continue

    const lowerText = text.toLowerCase()
    const hasKeyword = EVENT_KEYWORDS.some((kw) => lowerText.includes(kw))
    if (!hasKeyword) continue

    const date = parseDateString(dateMatch[0])
    if (!date) continue

    const time = parseTimeString(text)

    // Use first event keyword as title basis if no better heading
    let title = ''
    for (const kw of EVENT_KEYWORDS) {
      if (lowerText.includes(kw)) {
        title = kw.charAt(0).toUpperCase() + kw.slice(1)
        break
      }
    }
    if (!title) title = 'School Event'

    // Check for RSVP URL
    results.push({
      districtId,
      schoolName: null,
      eventType: detectEventType(title + ' ' + text),
      title,
      date,
      time,
      endDate: null,
      isRecurring: false,
      recurrenceNote: null,
      location: null,
      rsvpRequired: lowerText.includes('rsvp'),
      rsvpUrl: null,
      notes: null,
      sourceUrl,
      schoolYear,
    })
  }

  return results
}

/**
 * Deduplicates an array of ScrapedTourDate by title+date.
 */
function deduplicateEvents(events: ScrapedTourDate[]): ScrapedTourDate[] {
  const seen = new Set<string>()
  return events.filter((e) => {
    const key = `${e.title.toLowerCase().trim()}|${e.date ?? 'null'}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Scrapes tour/event dates from a single district's web pages.
 */
export async function scrapeDistrictTours(config: DistrictConfig): Promise<ScrapedTourDate[]> {
  const url = config.tourPageUrl ?? config.enrollmentUrl
  if (!url) return []

  let html: string
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; EarlyScoutsBot/1.0; +https://earlyscouts.com/bot)',
      },
    })
    if (!response.ok) {
      console.error(`[Tours] ${config.id}: HTTP ${response.status} — ${url}`)
      return []
    }
    html = await response.text()
  } catch (err) {
    console.error(`[Tours] ${config.id}: fetch failed — ${err}`)
    return []
  }

  const $ = cheerio.load(html)
  const schoolYear = getCurrentSchoolYear()

  const strategyA = extractFromJsonLd($, config.id, url, schoolYear)
  const strategyB = extractFromTextNodes($, config.id, url, schoolYear)
  const strategyC = extractFromTableAndLists($, config.id, url, schoolYear)

  const combined = [...strategyA, ...strategyB, ...strategyC]
  const unique = deduplicateEvents(combined)

  return unique
}

/**
 * Scrapes all districts in parallel. One district failing does not affect others.
 */
export async function scrapeAllDistricts(configs: DistrictConfig[]): Promise<ScrapedTourDate[]> {
  const settled = await Promise.allSettled(
    configs.map((config) =>
      scrapeDistrictTours(config)
        .then((events) => {
          console.log(`[Tours] ${config.id}: ${events.length} events found`)
          return events
        })
        .catch((err) => {
          console.error(`[Tours] ${config.id}: failed — ${err}`)
          return [] as ScrapedTourDate[]
        })
    )
  )

  const all: ScrapedTourDate[] = []
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      all.push(...result.value)
    }
  }
  return all
}
