export interface TourDateInput {
  schoolName: string
  title: string
  date: string | null       // ISO date "2027-01-22"
  time: string | null       // "9:00 AM - 11:00 AM"
  address: string
  rsvpUrl: string | null
  notes: string | null
}

/**
 * Converts a 12-hour time string like "9:00 AM" or "10:30 AM" to
 * a 4-digit 24-hour string like "0900" or "1030".
 */
function timeTo24(timeStr: string): string {
  const cleaned = timeStr.trim().toUpperCase()
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/)
  if (!match) return '0000'

  let hours = parseInt(match[1], 10)
  const minutes = match[2] ? parseInt(match[2], 10) : 0
  const meridiem = match[3]

  if (meridiem === 'AM') {
    if (hours === 12) hours = 0
  } else {
    if (hours !== 12) hours += 12
  }

  return String(hours).padStart(2, '0') + String(minutes).padStart(2, '0')
}

/**
 * Adds one hour to a 4-digit 24-hour time string like "0900" → "1000".
 */
function addOneHour(time4: string): string {
  const hours = parseInt(time4.slice(0, 2), 10)
  const minutes = time4.slice(2)
  const newHours = (hours + 1) % 24
  return String(newHours).padStart(2, '0') + minutes
}

/**
 * Builds a Google Calendar "TEMPLATE" URL for a school tour event.
 * Returns empty string if no date is provided.
 */
export function generateGCalLink(input: TourDateInput): string {
  if (!input.date) return ''

  const { schoolName, title, date, time, address, rsvpUrl, notes } = input

  // Build the dates param
  const isoDate = date.replace(/-/g, '') // "20270122"
  let datesParam: string

  if (time) {
    // Try to parse a range "9:00 AM - 11:00 AM"
    const rangeMatch = time.match(/^(.+?)\s*[-–]\s*(.+)$/)
    if (rangeMatch) {
      const start4 = timeTo24(rangeMatch[1].trim())
      const end4 = timeTo24(rangeMatch[2].trim())
      datesParam = `${isoDate}T${start4}00/${isoDate}T${end4}00`
    } else {
      // Single time — end = start + 1 hour
      const start4 = timeTo24(time.trim())
      const end4 = addOneHour(start4)
      datesParam = `${isoDate}T${start4}00/${isoDate}T${end4}00`
    }
  } else {
    // All-day event: end date is the next day in Google Calendar convention
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 1)
    const endIso = endDate.toISOString().split('T')[0].replace(/-/g, '')
    datesParam = `${isoDate}/${endIso}`
  }

  // Build details text
  const detailsLines: string[] = [
    title,
    '',
    `Location: ${address}`,
  ]
  if (rsvpUrl) {
    detailsLines.push(`RSVP: ${rsvpUrl}`)
  }
  if (notes) {
    detailsLines.push('', notes)
  }
  detailsLines.push('', 'Added via EarlyScouts')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `School Tour: ${schoolName} — ${title}`,
    dates: datesParam,
    details: detailsLines.join('\n'),
    location: address,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * Formats an ISO date and optional time into a human-readable string.
 *
 * Examples:
 *   "2027-01-22", "9:00 AM - 11:00 AM" → "Jan 22, 2027 · 9:00 AM – 11:00 AM"
 *   "2027-01-22", null                 → "Jan 22, 2027"
 *   null, null                          → "By appointment"
 */
export function formatTourDate(isoDate: string | null, time: string | null): string {
  if (!isoDate) return 'By appointment'

  // Parse the ISO date without timezone shifting by treating it as local
  const [year, month, day] = isoDate.split('-').map(Number)
  const dateObj = new Date(year, month - 1, day)

  const formatted = dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  if (!time) return formatted

  // Normalize en-dash vs hyphen in time ranges
  const normalizedTime = time.replace(/\s*-\s*/, ' – ')

  return `${formatted} · ${normalizedTime}`
}
