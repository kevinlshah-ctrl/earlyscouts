/**
 * generate-school-report.ts
 *
 * Generates a comprehensive 2500-3500 word HTML school profile report for each
 * school using Claude Opus with web search. Stores the result in schools.deep_report
 * and extracted photo URLs in schools.photos.
 *
 * Run with:
 *   npx tsx scripts/generate-school-report.ts
 *   npx tsx scripts/generate-school-report.ts --school "Mar Vista Elementary"
 *   npx tsx scripts/generate-school-report.ts --zip 90066
 *   npx tsx scripts/generate-school-report.ts --force     (regenerate existing reports)
 *   npx tsx scripts/generate-school-report.ts --dry-run   (print prompt, no DB writes)
 *   npx tsx scripts/generate-school-report.ts --limit 5
 *
 * Env vars required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 *
 * Env vars optional:
 *   GOOGLE_MAPS_API_KEY  — enables live Street View images at the top of each report
 *
 * SQL prerequisites (run once in Supabase):
 *   alter table schools add column if not exists deep_report text;
 *   alter table schools add column if not exists photos jsonb default '[]';
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// ── Args ──────────────────────────────────────────────────────────────────────

const args         = process.argv.slice(2)
const dryRun       = args.includes('--dry-run')
const forceRefresh = args.includes('--force')
const schoolIdx    = args.indexOf('--school')
const schoolFilter = schoolIdx !== -1 ? args[schoolIdx + 1] : null
const zipIdx       = args.indexOf('--zip')
const zipFilter    = zipIdx !== -1 ? args[zipIdx + 1] : null
const limitIdx     = args.indexOf('--limit')
const limitArg     = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : 200

// ── Clients ───────────────────────────────────────────────────────────────────

const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey    = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicKey   = process.env.ANTHROPIC_API_KEY
const googleMapsKey  = process.env.GOOGLE_MAPS_API_KEY || null

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!anthropicKey) {
  console.error('Missing ANTHROPIC_API_KEY')
  process.exit(1)
}

const supabase  = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: anthropicKey })

const MODEL = 'claude-sonnet-4-20250514'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchoolRow {
  id: string
  name: string
  city: string
  state: string
  zip: string
  address: string | null
  district: string | null
  website: string | null
  math_proficiency: number | null
  reading_proficiency: number | null
  free_reduced_lunch_pct: number | null
  grades: string | null
  enrollment: number | null
  student_teacher_ratio: string | null
  type: string
  deep_report: string | null
  photos: PhotoItem[] | null
}

interface PhotoItem {
  url: string
  caption: string
  section: string
}

interface NearbySchool {
  id: string
  name: string
  city: string
  zip: string
  type: string
  grades: string | null
  math_proficiency: number | null
  reading_proficiency: number | null
  greatschools_rating: number | null
}

interface AssessmentRow {
  school_year: string
  subject: string
  grade_level: string
  subgroup: string
  pct_proficient: number | null
  students_tested: number | null
}

interface ReviewSummaryRow {
  summary: string | null
  positives: string[] | null
  concerns: string[] | null
  themes: string[] | null
  vibe: string | null
  review_count: number | null
}

interface FeederMapRow {
  feeds_into: string[] | null
  feeds_from: string[] | null
}

// ── Street View ───────────────────────────────────────────────────────────────

/**
 * Builds the Street View HTML block prepended to every report.
 * If GOOGLE_MAPS_API_KEY is set, renders a live <img>.
 * Otherwise writes a <!-- comment --> so the URL is stored and can be activated
 * later by adding the key.
 */
function buildStreetViewBlock(school: SchoolRow): string {
  const address = school.address
    ? `${school.address}, ${school.city}, ${school.state}`
    : `${school.name}, ${school.city}, ${school.state}`

  const encodedAddress = encodeURIComponent(address)
  const baseUrl = `https://maps.googleapis.com/maps/api/streetview?size=780x400&location=${encodedAddress}`

  if (googleMapsKey) {
    const src = `${baseUrl}&key=${googleMapsKey}`
    return `<div class="street-view-block">` +
      `<img src="${src}" alt="${school.name} campus street view" class="street-view-img" loading="lazy" />` +
      `<p class="photo-caption">Street view of ${school.name} · ${school.city}</p>` +
      `</div>\n\n`
  }

  // No key yet — store the URL as a comment so it can be activated later
  const placeholderUrl = `${baseUrl}&key=GOOGLE_MAPS_API_KEY`
  return `<!-- STREET_VIEW_PLACEHOLDER: ${placeholderUrl} -->\n\n`
}

// ── Photo extraction ──────────────────────────────────────────────────────────

/**
 * Parses <img> tags from Claude's HTML output and returns structured photo objects.
 * Skips Street View images and data URIs. Infers section from the nearest preceding <h2>.
 */
function extractPhotos(html: string): PhotoItem[] {
  const photos: PhotoItem[] = []

  // Match every <img ...> tag — capture everything inside the tag
  const imgTagRegex = /<img\s([^>]+?)(?:\s*\/)?>/gi
  let tagMatch: RegExpExecArray | null

  while ((tagMatch = imgTagRegex.exec(html)) !== null) {
    const attrs = tagMatch[1]

    // Extract src
    const srcMatch = attrs.match(/src=["']([^"']+)["']/i)
    if (!srcMatch) continue
    const url = srcMatch[1]

    // Skip non-http, data URIs, and Street View images
    if (!url.startsWith('http')) continue
    if (url.includes('maps.googleapis.com/maps/api/streetview')) continue

    // Extract alt text
    const altMatch = attrs.match(/alt=["']([^"']*)["']/i)
    const altText = altMatch?.[1]?.trim() || ''

    // Find caption: check figcaption or p.caption immediately after the img
    const afterImg = html.slice(tagMatch.index + tagMatch[0].length, tagMatch.index + tagMatch[0].length + 400)
    const figcaptionMatch = afterImg.match(/^\s*(?:<\/figure>\s*)?<figcaption[^>]*>([^<]+)<\/figcaption>/i)
    const pCaptionMatch   = afterImg.match(/^\s*<p[^>]*class=["'][^"']*caption[^"']*["'][^>]*>([^<]+)<\/p>/i)
    const caption = figcaptionMatch?.[1]?.trim()
      || pCaptionMatch?.[1]?.trim()
      || altText
      || 'Photo'

    // Determine which <h2> section this image is in
    const beforeImg = html.slice(0, tagMatch.index)
    const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi
    let h2Match: RegExpExecArray | null
    let section = 'overview'
    while ((h2Match = h2Regex.exec(beforeImg)) !== null) {
      // Strip any inner tags (e.g. <span>) from h2 text
      section = h2Match[1].replace(/<[^>]+>/g, '').trim().toLowerCase()
    }

    photos.push({ url, caption, section })
  }

  return photos
}

// ── Context builders ──────────────────────────────────────────────────────────

function buildAssessmentContext(rows: AssessmentRow[]): string {
  if (rows.length === 0) return 'No state assessment data available for this school.'

  const byYear = new Map<string, AssessmentRow[]>()
  for (const row of rows) {
    const yr = byYear.get(row.school_year) || []
    yr.push(row)
    byYear.set(row.school_year, yr)
  }

  const years = Array.from(byYear.keys()).sort().reverse().slice(0, 2)
  const latestYear = years[0]
  const priorYear  = years[1]

  const lines: string[] = []

  for (const subject of ['math', 'ela'] as const) {
    const label = subject === 'math' ? 'Math' : 'ELA (Reading/Writing)'
    const latestRows = (byYear.get(latestYear) || []).filter(r => r.subject === subject)
    const priorRows  = priorYear ? (byYear.get(priorYear) || []).filter(r => r.subject === subject) : []

    if (latestRows.length === 0) continue

    const allStudents = latestRows.find(r => r.grade_level === 'all' && r.subgroup === 'all')
    const priorAll    = priorRows.find(r => r.grade_level === 'all' && r.subgroup === 'all')
    if (!allStudents) continue

    const pct    = allStudents.pct_proficient !== null ? Math.round(allStudents.pct_proficient) : null
    const tested = allStudents.students_tested

    lines.push(`\n${label} (${latestYear}):`)
    lines.push(`  Overall: ${pct !== null ? `${pct}% proficient` : 'N/A'} (${tested ?? '?'} students tested)`)

    if (priorAll?.pct_proficient != null && pct !== null) {
      const change = Math.round((pct - priorAll.pct_proficient) * 10) / 10
      lines.push(`  Year-over-year change: ${change > 0 ? '+' : ''}${change} percentage points vs ${priorYear}`)
    }

    const gradeRows = latestRows
      .filter(r => r.grade_level !== 'all' && r.subgroup === 'all' && r.pct_proficient !== null)
      .sort((a, b) => {
        const order = ['3','4','5','6','7','8','11']
        return order.indexOf(a.grade_level) - order.indexOf(b.grade_level)
      })
    if (gradeRows.length > 0) {
      lines.push(`  By grade: ${gradeRows.map(r => `Grade ${r.grade_level}: ${Math.round(r.pct_proficient!)}%`).join(', ')}`)
    }

    const subgroupLabels: Record<string, string> = {
      white: 'White', hispanic: 'Hispanic/Latino', asian: 'Asian',
      black: 'Black/African American', low_income: 'Low-Income', english_learner: 'English Learners',
    }
    const subgroupRows = latestRows.filter(r =>
      r.grade_level === 'all' && r.subgroup !== 'all' && r.subgroup in subgroupLabels && r.pct_proficient !== null
    )
    if (subgroupRows.length > 0) {
      lines.push(`  By subgroup: ${subgroupRows.map(r => `${subgroupLabels[r.subgroup]}: ${Math.round(r.pct_proficient!)}%`).join(', ')}`)
    }
  }

  return lines.join('\n').trim() || 'No detailed assessment breakdown available.'
}

function buildReviewContext(summary: ReviewSummaryRow | null): string {
  if (!summary || !summary.summary) {
    return 'No aggregated parent review data available for this school yet.'
  }
  const lines = [
    `Review count: ${summary.review_count ?? 'Unknown'}`,
    `Overall vibe: ${summary.vibe ?? 'N/A'}`,
    ``,
    `Summary: ${summary.summary}`,
  ]
  if (summary.positives?.length) {
    lines.push(``, `What parents consistently praise:`)
    summary.positives.forEach(p => lines.push(`  - ${p}`))
  }
  if (summary.concerns?.length) {
    lines.push(``, `What parents consistently flag as concerns:`)
    summary.concerns.forEach(c => lines.push(`  - ${c}`))
  }
  if (summary.themes?.length) {
    lines.push(``, `Recurring themes: ${summary.themes.join(', ')}`)
  }
  return lines.join('\n')
}

function buildFeederContext(feeder: FeederMapRow | null): string {
  if (!feeder || (!feeder.feeds_into?.length && !feeder.feeds_from?.length)) {
    return 'Feeder pipeline data not yet loaded for this school. Research this via web search.'
  }
  const lines: string[] = []
  if (feeder.feeds_from?.length)  lines.push(`Feeder elementaries (schools whose students come here): ${feeder.feeds_from.join(', ')}`)
  if (feeder.feeds_into?.length) lines.push(`Feeds into (where students go next): ${feeder.feeds_into.join(', ')}`)
  return lines.join('\n') || 'No feeder data.'
}

function buildComparisonContext(nearby: NearbySchool[]): string {
  if (nearby.length === 0) return 'Research nearby schools in the same neighborhood via web search for comparison.'
  const lines = nearby.map(s => {
    const math = s.math_proficiency != null ? `Math ${Math.round(s.math_proficiency)}%` : 'Math N/A'
    const ela  = s.reading_proficiency != null ? `ELA ${Math.round(s.reading_proficiency)}%` : 'ELA N/A'
    const gs   = s.greatschools_rating != null ? ` · GS ${s.greatschools_rating}/10` : ''
    return `  - ${s.name} (${s.type}, ${s.city}, Grades ${s.grades ?? '?'}): ${math}, ${ela}${gs}`
  })
  return `Nearby schools parents in this area also consider:\n${lines.join('\n')}`
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
  school: SchoolRow,
  assessmentCtx: string,
  reviewCtx: string,
  feederCtx: string,
  comparisonCtx: string,
): string {
  return `You are writing a comprehensive 2500-3500 word school profile report for parents considering ${school.name} in ${school.city}, ${school.state}. This report is the core product of SchoolScout, a paid school research platform. It must feel like getting advice from a well-informed friend who spent hours researching, not like reading a school brochure or a data dump.

Research this school thoroughly using web search. Visit the school's own website. Search for the principal's name and background. Look for recent news, construction projects, partnerships, and any notable developments on ca.gov, the school's district site, and local news.

Also search for photos of this school. Find: 1) A photo of the school building or campus from the school's own website or Google, 2) If there's a construction or renovation project, find architectural renderings or project photos, 3) Find the principal's photo if available on the school website. For each photo found, include it in the HTML report using an <img> tag with the source URL and a descriptive caption in a <p class="photo-caption"> immediately after the img. Place the campus photo near the top of the report (just before or after the first paragraph of The Parent's Overview), construction renderings in the construction section, and the principal photo in the leadership section. Only include photos from reliable, publicly accessible sources (school websites, district sites, official project pages). Do not include photos from sites that likely block hotlinking.

Write the report in HTML using h2 and h3 tags for sections. Use this exact structure:

<h2>The Parent's Overview</h2>
3-4 paragraphs. What is this school actually like? What kind of families does it attract? What's the vibe? What is the school known for in the neighborhood? Be specific about demographics, parent involvement culture, and what makes this school distinctive (or not). Start with what would make a parent interested, then give the honest caveats. Write this like a knowledgeable local parent would describe it at a dinner party.

<h2>Academic Performance Decoded</h2>
Don't just restate numbers. INTERPRET them. How does this school compare to the district average? To the state? What do the trends over 3 years tell us? Break down grade-level differences if data exists. Address the equity gap between demographic groups honestly. What should parents of different student groups specifically know? Include the actual percentages but wrap them in narrative context like 'Math proficiency at 86% means your child is in a school that performs 2.5x above the LAUSD average.'

Here is the assessment data for this school:
${assessmentCtx}

<h2>Teaching, Leadership, and School Culture</h2>
Who is the principal? What is their reputation among parents? What is the school's teaching philosophy (from their website)? Is it traditional, progressive, project-based, Montessori-influenced? What do reviews say about teacher quality? Are there specific grade levels where quality is notably better or worse? What enrichment programs exist and how are they funded? What partnerships does the school have?

<h2>What's Happening at ${school.name}</h2>
Any construction projects, campus upgrades, legal issues, new programs, staffing changes, partnerships, or notable developments. Research ca.gov, the district site, and local news. If there's a major construction project, describe it in detail including budget, what's changing, and why it matters for incoming families. If nothing notable is found, write a brief section noting the school's stability.

<h2>The Feeder Pipeline</h2>
Where do students go after this school? Research the feeder middle school(s) and high school. What are their test scores and reputations? Is the transition a step up, step down, or lateral move? What do experienced parents typically do, go with the default feeder or look for alternatives? What are the alternatives? This section is critical because parents are choosing a K-12 pipeline, not just an elementary school.

Here is the feeder pipeline data from our database:
${feederCtx}

<h2>What Parents Actually Say</h2>
Synthesize themes from reviews. Organize into Strengths (what parents consistently praise) and Concerns (what parents consistently flag). Be specific. Use the tone of 'multiple parents report...' not 'one reviewer said...' End with 2-3 specific questions the parent should ask during their school tour based on the concerns raised.

Here is the aggregated review data from our platform:
${reviewCtx}

<h2>How It Compares</h2>
Compare to 3-4 nearby schools that parents in this zip code also consider. Don't just list numbers in a table. Write narrative comparisons: 'If you're choosing between X and Y, here's what to consider...' Cover the key tradeoffs: test scores, programs, school culture, feeder pipeline, admission process (lottery vs. neighborhood vs. transfer).

Here are nearby schools from our database:
${comparisonCtx}

<h2>Enrollment, Tours, and Practical Info</h2>
Tour schedule if available (from web search), enrollment process (neighborhood school vs. lottery vs. transfer), TK/K eligibility dates, after-school options, contact information. Link to the school's website${school.website ? ` (${school.website})` : ''}.

<h2>The Bottom Line</h2>
A direct, honest 2-paragraph assessment. Then two subsections:
<h3>Best For:</h3> one sentence on who this school is ideal for.
<h3>Consider Alternatives If:</h3> one sentence on who should look elsewhere, and where.

CRITICAL TONE RULES:
- Write like a knowledgeable parent advisor, not a brochure
- No marketing language, no superlatives, no 'amazing' or 'wonderful'
- Be honest about weaknesses. Parents trust honesty.
- Use specific details from your web research, not generic statements
- No em dashes
- Every section should have enough depth that a parent spends 2-3 minutes reading it
- The total report should take 15-20 minutes to read thoroughly
- Output ONLY the HTML report starting with <h2>. No preamble, no markdown fences, no commentary.`
}

// ── Claude call with web search ───────────────────────────────────────────────

async function callClaudeWithSearch(prompt: string): Promise<string> {
  type MsgParam = { role: 'user' | 'assistant'; content: Anthropic.MessageParam['content'] }
  const messages: MsgParam[] = [{ role: 'user', content: prompt }]

  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: 16000,
        tools: [{ type: 'web_search_20260209', name: 'web_search', allowed_callers: ['direct'] }] as Parameters<typeof anthropic.messages.create>[0]['tools'],
        messages,
      },
      { timeout: 180000 },
    )

    if (response.stop_reason === 'end_turn') {
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
    }

    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content as Anthropic.MessageParam['content'] })
      continue
    }

    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  }

  return ''
}

// ── Process one school ────────────────────────────────────────────────────────

async function processSchool(school: SchoolRow): Promise<void> {
  if (school.deep_report && !forceRefresh) {
    console.log(`  SKIP — report exists (use --force to regenerate)`)
    return
  }

  process.stdout.write(`  Fetching context data... `)

  const { data: assessmentRows } = await supabase
    .from('assessment_scores')
    .select('school_year, subject, grade_level, subgroup, pct_proficient, students_tested')
    .eq('school_id', school.id)
    .in('subject', ['math', 'ela'])
    .order('school_year', { ascending: false })
    .limit(200)

  const { data: reviewRow } = await supabase
    .from('review_summaries')
    .select('summary, positives, concerns, themes, vibe, review_count')
    .eq('school_id', school.id)
    .maybeSingle()

  const { data: feederRow } = await supabase
    .from('feeder_maps')
    .select('feeds_into, feeds_from')
    .eq('school_id', school.id)
    .maybeSingle()

  const { data: nearbyRaw } = await supabase
    .from('schools')
    .select('id, name, city, zip, type, grades, math_proficiency, reading_proficiency, greatschools_rating')
    .or(`zip.eq.${school.zip},city.ilike.${school.city}`)
    .neq('id', school.id)
    .not('math_proficiency', 'is', null)
    .limit(6)

  const nearby = (nearbyRaw || []) as NearbySchool[]

  const assessmentCtx = buildAssessmentContext((assessmentRows || []) as AssessmentRow[])
  const reviewCtx     = buildReviewContext(reviewRow as ReviewSummaryRow | null)
  const feederCtx     = buildFeederContext(feederRow as FeederMapRow | null)
  const comparisonCtx = buildComparisonContext(nearby)

  process.stdout.write(`done\n`)

  if (dryRun) {
    const prompt = buildPrompt(school, assessmentCtx, reviewCtx, feederCtx, comparisonCtx)
    const streetView = buildStreetViewBlock(school)
    console.log(`\n  [dry-run] Prompt length: ${prompt.length} chars`)
    console.log(`  Street View: ${streetView.slice(0, 120).replace(/\n/g, ' ')}`)
    console.log(`  Assessment: ${assessmentCtx.slice(0, 100).replace(/\n/g, ' ')}...`)
    console.log(`  Review: ${reviewCtx.slice(0, 80).replace(/\n/g, ' ')}...`)
    console.log(`  Feeder: ${feederCtx.slice(0, 80).replace(/\n/g, ' ')}...`)
    console.log(`  Nearby: ${nearby.length} schools`)
    return
  }

  process.stdout.write(`  Calling Claude (this takes 30-90 seconds)... `)

  let reportHtml = ''
  try {
    const prompt = buildPrompt(school, assessmentCtx, reviewCtx, feederCtx, comparisonCtx)
    reportHtml = await callClaudeWithSearch(prompt)
  } catch (err) {
    console.log(`ERROR: ${(err as Error).message}`)
    return
  }

  if (!reportHtml || reportHtml.length < 500) {
    console.log(`WARN: Response too short (${reportHtml.length} chars), skipping save`)
    return
  }

  // Strip any markdown fences Claude might have added
  reportHtml = reportHtml
    .replace(/^```html\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  // Prepend the Street View block
  const streetViewBlock = buildStreetViewBlock(school)
  const fullHtml = streetViewBlock + reportHtml

  // Extract photos from Claude's HTML (excluding the Street View image)
  const photos = extractPhotos(reportHtml)
  if (photos.length > 0) {
    console.log(`\n  Photos found: ${photos.length}`)
    photos.forEach(p => console.log(`    [${p.section}] ${p.caption} — ${p.url.slice(0, 60)}...`))
    process.stdout.write(`  `)
  }

  // Save to DB
  const { error } = await supabase
    .from('schools')
    .update({
      deep_report: fullHtml,
      photos: photos.length > 0 ? photos : [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', school.id)

  if (error) {
    console.log(`ERROR saving: ${error.message}`)
    return
  }

  console.log(`✓ Saved ${fullHtml.length.toLocaleString()} chars · ${photos.length} photo(s)`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== School Report Generator ===')
  console.log(`Model: ${MODEL}`)
  console.log(`Street View: ${googleMapsKey ? 'enabled (live images)' : 'no key — placeholder comments'}`)
  if (dryRun)       console.log('DRY RUN — no DB writes')
  if (forceRefresh) console.log('FORCE — regenerating existing reports')
  if (schoolFilter) console.log(`Filtering to: "${schoolFilter}"`)
  if (zipFilter)    console.log(`Filtering to zip: ${zipFilter}`)
  console.log()

  let query = supabase
    .from('schools')
    .select('id, name, city, state, zip, address, district, website, math_proficiency, reading_proficiency, free_reduced_lunch_pct, grades, enrollment, student_teacher_ratio, type, deep_report, photos')
    .eq('state', 'CA')
    .order('name')
    .limit(limitArg)

  if (schoolFilter) query = query.ilike('name', `%${schoolFilter}%`)
  if (zipFilter)    query = query.eq('zip', zipFilter)

  const { data: schools, error } = await query
  if (error) {
    console.error('Failed to load schools:', error.message)
    process.exit(1)
  }

  const allSchools = (schools || []) as SchoolRow[]
  if (allSchools.length === 0) {
    console.log('No schools found matching filters.')
    return
  }

  const pending = allSchools.filter(s => !s.deep_report || forceRefresh)
  console.log(`Found ${allSchools.length} schools · ${pending.length} need reports`)
  console.log()

  let generated = 0
  let skipped   = 0
  let errors    = 0

  for (let i = 0; i < allSchools.length; i++) {
    const school = allSchools[i]
    console.log(`[${i + 1}/${allSchools.length}] ${school.name} (${school.city})`)

    if (school.deep_report && !forceRefresh) {
      skipped++
      console.log(`  SKIP — report exists`)
      continue
    }

    try {
      await processSchool(school)
      generated++
    } catch (err) {
      console.log(`  FATAL: ${(err as Error).message}`)
      errors++
    }

    // Generous delay — each report involves multiple web searches
    if (i < allSchools.length - 1) {
      await new Promise((r) => setTimeout(r, 5000))
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Generated: ${generated}`)
  if (skipped) console.log(`  Skipped:   ${skipped}`)
  if (errors)  console.log(`  Errors:    ${errors}`)
  console.log()
  console.log('Reports are in schools.deep_report · photos in schools.photos.')
  console.log('Visit a school detail page → Full Report tab to preview.')
  if (!googleMapsKey) {
    console.log()
    console.log('Tip: set GOOGLE_MAPS_API_KEY to enable live Street View images in reports.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
