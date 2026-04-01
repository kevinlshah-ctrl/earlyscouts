/**
 * scrape-board-meetings.ts
 * Run with: npx tsx scripts/scrape-board-meetings.ts [--district <id>] [--dry-run] [--verbose]
 *
 * Scrapes school board meeting minutes, extracts parent-relevant insights
 * using Claude API, and stores results in board_meetings + board_insights tables.
 *
 * ── Env vars required ─────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import configs from '../src/data/board-meeting-configs.json'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const districtArg = args.indexOf('--district') !== -1 ? args[args.indexOf('--district') + 1] : null
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')

// ── Clients ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!anthropicKey) {
  console.error('Missing ANTHROPIC_API_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: anthropicKey })

// ── Types ─────────────────────────────────────────────────────────────────────

interface DistrictConfig {
  id: string
  name: string
  state: string
  boardUrl: string
  minutesListUrl: string
  format: string
  scrapeMethod: string
  linkPattern: string
  maxMeetings: number
  disabled?: boolean
  _note?: string
}

interface MinutesLink {
  url: string
  title: string
  date: string | null
}

interface InsightRaw {
  school_name: string | null
  category: string
  headline: string
  detail: string
  sentiment: 'positive' | 'neutral' | 'negative'
  impact_level: 'high' | 'medium' | 'low'
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function resolveUrl(base: string, location: string): string {
  if (location.startsWith('http://') || location.startsWith('https://')) return location
  try {
    return new URL(location, base).href
  } catch {
    return location
  }
}

function fetchText(url: string, redirects = 0): Promise<string> {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/pdf,*/*',
      },
      rejectUnauthorized: false,
    } as Parameters<typeof https.get>[1], (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        fetchText(resolveUrl(url, res.headers.location), redirects + 1).then(resolve).catch(reject)
        return
      }
      if (res.statusCode === 403 || res.statusCode === 401) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode} (access denied) — site blocks automated access`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)) })
  })
}

function fetchBuffer(url: string, redirects = 0): Promise<Buffer> {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = mod.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      rejectUnauthorized: false,
    } as Parameters<typeof https.get>[1], (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        fetchBuffer(resolveUrl(url, res.headers.location), redirects + 1).then(resolve).catch(reject)
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(60000, () => { req.destroy(); reject(new Error(`Timeout fetching ${url}`)) })
  })
}

// ── HTML link scraper ─────────────────────────────────────────────────────────

function resolveRelativeUrl(href: string, baseUrl: string): string {
  if (href.startsWith('//')) return 'https:' + href
  if (href.startsWith('http')) return href
  try {
    return new URL(href, baseUrl).href
  } catch {
    return href
  }
}

function googleDriveToDownloadUrl(url: string): string {
  // Convert Google Drive viewer URL to direct download/export URL
  // https://drive.google.com/file/d/GUID/view?... → https://drive.google.com/uc?export=download&id=GUID
  const match = url.match(/drive\.google\.com\/file\/d\/([^/?]+)/)
  if (match) {
    return `https://drive.google.com/uc?export=download&id=${match[1]}`
  }
  return url
}

function extractLinksFromHtml(html: string, baseUrl: string, pattern: string): MinutesLink[] {
  const links: MinutesLink[] = []
  const seen = new Set<string>()

  // Match <a href="...">...</a> — use a more permissive regex that handles varied quoting
  const anchorRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,300}?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1].trim()
    const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    if (!href || href.startsWith('#') || href.startsWith('javascript')) continue

    const lhref = href.toLowerCase()
    const ltext = text.toLowerCase()
    if (!lhref.includes(pattern) && !ltext.includes(pattern)) continue

    let fullUrl = resolveRelativeUrl(href, baseUrl)

    // Convert Google Drive viewer links to downloadable form
    if (fullUrl.includes('drive.google.com')) {
      fullUrl = googleDriveToDownloadUrl(fullUrl)
    }

    if (seen.has(fullUrl)) continue
    seen.add(fullUrl)

    // Try to extract date from text or surrounding context
    let date: string | null = null
    const dateMatch = text.match(/(\w+\.?\s+\d{1,2},?\s*\d{4})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{4}-\d{2}-\d{2})/)
    if (dateMatch) {
      try {
        const d = new Date(dateMatch[0])
        if (!isNaN(d.getTime())) {
          date = d.toISOString().split('T')[0]
        }
      } catch {}
    }

    links.push({ url: fullUrl, title: text || 'Board Meeting Minutes', date })
  }

  return links
}

// ── PDF text extraction ───────────────────────────────────────────────────────

async function extractPdfText(buf: Buffer): Promise<string> {
  // pdf-parse@1.x exports a CJS function — require() is most reliable
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>
  const result = await pdfParse(buf)
  return result.text || ''
}

// ── Fetch and extract text from a minutes document ────────────────────────────

async function fetchMinutesText(link: MinutesLink, format: string): Promise<string> {
  if (format === 'pdf' || link.url.toLowerCase().includes('.pdf')) {
    const buf = await fetchBuffer(link.url)
    return extractPdfText(buf)
  } else {
    const html = await fetchText(link.url)
    // Strip HTML tags for plain text
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// ── Claude extraction ─────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are an expert at reading school board meeting minutes and extracting information that parents and families would find relevant.

Extract insights that directly affect schools, students, and families. Focus on:
- Construction, renovation, or facility changes at specific schools
- Budget cuts or additions affecting specific programs or schools
- New or discontinued programs (STEM, arts, sports, language immersion, etc.)
- Staffing changes (principal, teacher, support staff)
- Policy changes affecting enrollment, discipline, or academics
- Safety or security updates
- Enrollment numbers, boundary changes, or capacity issues
- Grants, awards, or recognitions

Return a JSON array of insight objects. Each object must have:
- school_name: string or null (null = district-wide, not school-specific)
- category: one of "construction" | "budget" | "programs" | "staffing" | "policy" | "enrollment" | "safety" | "other"
- headline: string (one crisp sentence, ≤120 chars, parent-friendly)
- detail: string (1-3 sentences with specifics — dates, dollar amounts, grades affected)
- sentiment: "positive" | "neutral" | "negative" (from a parent's perspective)
- impact_level: "high" | "medium" | "low" (how much does this affect day-to-day family life)

Only include genuine, specific insights. Skip procedural items (committee appointments, consent calendars, public comments without substance). Aim for 5-15 insights per meeting.

Respond ONLY with valid JSON array, no markdown, no explanation.`

async function extractInsightsWithClaude(
  text: string,
  districtName: string,
  meetingDate: string | null
): Promise<InsightRaw[]> {
  // Trim to ~80K chars to avoid token limits (board minutes rarely need more)
  const trimmed = text.slice(0, 80000)

  const userPrompt = `District: ${districtName}
Meeting date: ${meetingDate ?? 'unknown'}

Board meeting minutes text:
---
${trimmed}
---

Extract parent-relevant insights as a JSON array.`

  if (verbose) console.log(`  [Claude] Sending ${trimmed.length} chars for extraction...`)

  const stream = anthropic.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    system: EXTRACTION_SYSTEM,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const msg = await stream.finalMessage()
  const raw = msg.content.find((b) => b.type === 'text')?.text ?? '[]'

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return []
    return parsed as InsightRaw[]
  } catch (e) {
    console.error('  [Claude] Failed to parse JSON response:', (e as Error).message)
    if (verbose) console.error('  Raw:', raw.slice(0, 500))
    return []
  }
}

// ── School matching ───────────────────────────────────────────────────────────

function normalizeSchoolName(name: string): string {
  return name
    .toLowerCase()
    .replace(/elementary|middle|high|school|academy|charter|magnet/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchSchoolId(
  schoolName: string | null,
  dbSchools: { id: string; name: string }[]
): string | null {
  if (!schoolName) return null
  const norm = normalizeSchoolName(schoolName)
  if (!norm) return null

  // Exact normalized match
  for (const s of dbSchools) {
    if (normalizeSchoolName(s.name) === norm) return s.id
  }

  // Partial word overlap ≥ 50%
  const words = norm.split(' ').filter(Boolean)
  let bestMatch: string | null = null
  let bestScore = 0
  for (const s of dbSchools) {
    const sWords = normalizeSchoolName(s.name).split(' ').filter(Boolean)
    const overlap = words.filter((w) => sWords.includes(w)).length
    const score = overlap / Math.max(words.length, sWords.length)
    if (score > bestScore && score >= 0.5) {
      bestScore = score
      bestMatch = s.id
    }
  }
  return bestMatch
}

// ── Per-district processing ───────────────────────────────────────────────────

async function processDistrict(cfg: DistrictConfig, dbSchools: { id: string; name: string }[]) {
  console.log(`\n── ${cfg.name} (${cfg.id}) ──`)

  // 1. Fetch the board minutes list page
  let html: string
  try {
    html = await fetchText(cfg.minutesListUrl)
  } catch (e) {
    console.error(`  Failed to fetch list page: ${(e as Error).message}`)
    return
  }

  // 2. Extract links to meeting minutes
  const links = extractLinksFromHtml(html, cfg.minutesListUrl, cfg.linkPattern)
  console.log(`  Found ${links.length} minutes links`)

  if (links.length === 0) {
    console.log('  No links found — skipping')
    return
  }

  // Take most recent N meetings
  const toProcess = links.slice(0, cfg.maxMeetings)

  for (const link of toProcess) {
    console.log(`  Meeting: ${link.title.slice(0, 60)} | ${link.date ?? 'no date'}`)
    if (verbose) console.log(`    URL: ${link.url}`)

    // Check if already in DB
    const { data: existing } = await supabase
      .from('board_meetings')
      .select('id, processed')
      .eq('district_id', cfg.id)
      .eq('source_url', link.url)
      .maybeSingle()

    if (existing?.processed) {
      console.log('    Already processed — skipping')
      continue
    }

    // 3. Fetch and extract text
    let text = ''
    try {
      text = await fetchMinutesText(link, cfg.format)
      if (verbose) console.log(`    Extracted ${text.length} chars`)
    } catch (e) {
      console.error(`    Failed to extract text: ${(e as Error).message}`)
      continue
    }

    if (text.length < 200) {
      console.log('    Text too short — skipping')
      continue
    }

    if (dryRun) {
      console.log(`    DRY RUN — would extract insights from ${text.length} chars`)
      continue
    }

    // 4. Upsert board_meetings row
    let meetingId: number
    if (existing) {
      meetingId = existing.id
      await supabase
        .from('board_meetings')
        .update({ raw_text: text.slice(0, 100000), meeting_date: link.date })
        .eq('id', meetingId)
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('board_meetings')
        .insert({
          district_id: cfg.id,
          district_name: cfg.name,
          meeting_date: link.date,
          title: link.title,
          source_url: link.url,
          format: cfg.format,
          raw_text: text.slice(0, 100000),
        })
        .select('id')
        .single()

      if (insErr || !inserted) {
        console.error(`    Failed to insert meeting: ${insErr?.message}`)
        continue
      }
      meetingId = inserted.id
    }

    // 5. Extract insights via Claude
    let insights: InsightRaw[] = []
    try {
      insights = await extractInsightsWithClaude(text, cfg.name, link.date)
      console.log(`    Claude extracted ${insights.length} insights`)
    } catch (e) {
      console.error(`    Claude extraction failed: ${(e as Error).message}`)
      await supabase.from('board_meetings').update({ processed: true, processed_at: new Date().toISOString() }).eq('id', meetingId)
      continue
    }

    // 6. Match school names to IDs and upsert insights
    let saved = 0
    for (const insight of insights) {
      // Validate required fields
      if (!insight.headline || !insight.category) continue

      const schoolId = matchSchoolId(insight.school_name, dbSchools)

      const { error: iErr } = await supabase.from('board_insights').insert({
        meeting_id: meetingId,
        district_id: cfg.id,
        school_id: schoolId,
        school_name: insight.school_name,
        category: insight.category,
        headline: insight.headline.slice(0, 200),
        detail: insight.detail,
        sentiment: insight.sentiment ?? 'neutral',
        impact_level: insight.impact_level ?? 'low',
        meeting_date: link.date,
        district_name: cfg.name,
        source_url: link.url,
      })

      if (iErr) {
        if (verbose) console.error(`    Insert insight error: ${iErr.message}`)
      } else {
        saved++
      }
    }
    console.log(`    Saved ${saved} insights`)

    // 7. Mark meeting as processed
    await supabase
      .from('board_meetings')
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq('id', meetingId)
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Board Meeting Minutes Scraper + AI Extractor ===')
  if (dryRun) console.log('DRY RUN — no data will be written')
  if (districtArg) console.log(`Filtering to district: ${districtArg}`)
  console.log()

  // Verify tables exist
  const { error: tableErr } = await supabase.from('board_meetings').select('id').limit(1)
  if (tableErr) {
    console.error('board_meetings table not found:', tableErr.message)
    console.error('Run supabase/migrations/004_board_meetings.sql first.')
    process.exit(1)
  }

  // Load all schools for name matching
  const { data: dbSchools, error: schoolErr } = await supabase
    .from('schools')
    .select('id, name')

  if (schoolErr) {
    console.error('Could not load schools:', schoolErr.message)
    process.exit(1)
  }

  const schools = (dbSchools || []) as { id: string; name: string }[]
  console.log(`Loaded ${schools.length} schools for name matching`)

  // Filter configs
  const allConfigs = configs as DistrictConfig[]
  const toRun = districtArg
    ? allConfigs.filter((c) => c.id === districtArg)
    : allConfigs.filter((c) => !c.disabled)

  if (toRun.length === 0 && districtArg) {
    console.error(`No district config found for: ${districtArg}`)
    process.exit(1)
  }

  const skipped = allConfigs.filter((c) => c.disabled && !districtArg)
  if (skipped.length > 0) {
    console.log(`Skipping ${skipped.length} disabled district(s): ${skipped.map((c) => c.id).join(', ')}`)
    console.log('(Use --district <id> to force-run a disabled district)')
    console.log()
  }

  if (toRun.length === 0) {
    console.log('No enabled districts to process.')
    process.exit(0)
  }

  for (const cfg of toRun) {
    await processDistrict(cfg, schools)
  }

  console.log('\n=== Done ===')
  if (!dryRun) {
    console.log('Board insights are now available in /api/schools/{id}/district-intel')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
