/**
 * scrape-reviews.ts
 * Run with: npx tsx scripts/scrape-reviews.ts [--zip <zip>] [--limit <n>] [--dry-run] [--verbose]
 *
 * Visits GreatSchools (and Niche where available) detail pages for schools
 * already in the DB and extracts individual review text. Stores results in
 * the scraped_reviews table.
 *
 * ── Env vars required ─────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import * as https from 'https'
import * as http from 'http'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const zipArg = args.indexOf('--zip') !== -1 ? args[args.indexOf('--zip') + 1] : null
const limitArg = args.indexOf('--limit') !== -1 ? parseInt(args[args.indexOf('--limit') + 1]) : 50
const dryRun = args.includes('--dry-run')
const verbose = args.includes('--verbose')

// ── Clients ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// ── HTTP helpers ──────────────────────────────────────────────────────────────

function resolveUrl(base: string, location: string): string {
  if (location.startsWith('http://') || location.startsWith('https://')) return location
  try { return new URL(location, base).href } catch { return location }
}

function fetchHtml(url: string, redirects = 0): Promise<string> {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http
    const req = (mod.get as Function)(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      rejectUnauthorized: false,
    }, (res: http.IncomingMessage) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        fetchHtml(resolveUrl(url, res.headers.location), redirects + 1).then(resolve).catch(reject)
        return
      }
      if (res.statusCode === 403 || res.statusCode === 429) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode}`))
        return
      }
      const chunks: Buffer[] = []
      res.on('data', (chunk: Buffer) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

// ── GreatSchools review extraction ────────────────────────────────────────────

interface ScrapedReview {
  source: string
  reviewer_type: string | null
  rating: number | null
  review_text: string
  review_date: string | null
}

function extractGSReviews(html: string): ScrapedReview[] {
  const reviews: ScrapedReview[] = []

  // Strategy 1: __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1])

      // Try several known paths where reviews live in GreatSchools Next.js pages
      const candidates: unknown[] = [
        nextData?.props?.pageProps?.reviews,
        nextData?.props?.pageProps?.school?.reviews,
        nextData?.props?.pageProps?.data?.reviews,
      ]

      for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) {
          for (const r of candidate) {
            const text: string = r.reviewText || r.text || r.body || r.comment || ''
            if (text.length < 20) continue
            const ratingRaw = r.rating ?? r.ratingValue ?? r.score
            const ratingNorm = ratingRaw != null ? Math.round(parseFloat(String(ratingRaw))) : null
            reviews.push({
              source: 'greatschools',
              reviewer_type: r.reviewerType || r.authorType || r.type || null,
              rating: ratingNorm,
              review_text: text.trim().slice(0, 2000),
              review_date: r.created || r.date || r.publishedDate || null,
            })
          }
          if (reviews.length > 0) break
        }
      }

      // Try component-blob approach (GreatSchools uses React Server Components blob per component)
      if (reviews.length === 0) {
        const allComponents: Record<string, unknown[]> = {}
        const blobRe = /"([A-Z][a-zA-Z]+)":\s*(\[[\s\S]*?\])/g
        let bm: RegExpExecArray | null
        while ((bm = blobRe.exec(nextDataMatch[1])) !== null) {
          try { allComponents[bm[1]] = JSON.parse(bm[2]) } catch { /* skip */ }
        }

        // Look for any key that contains review-like objects
        for (const [key, arr] of Object.entries(allComponents)) {
          if (!key.toLowerCase().includes('review')) continue
          if (!Array.isArray(arr)) continue
          for (const item of arr) {
            const obj = item as Record<string, unknown>
            const text = String(obj.text || obj.reviewText || obj.body || '')
            if (text.length >= 20) {
              reviews.push({
                source: 'greatschools',
                reviewer_type: String(obj.reviewerType || obj.type || '') || null,
                rating: obj.rating != null ? Math.round(parseFloat(String(obj.rating))) : null,
                review_text: text.trim().slice(0, 2000),
                review_date: String(obj.created || obj.date || '') || null,
              })
            }
          }
          if (reviews.length > 0) break
        }
      }
    } catch { /* malformed JSON */ }
  }

  // Strategy 2: JSON-LD Review type blocks
  if (reviews.length === 0) {
    const jsonLdRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
    let jm: RegExpExecArray | null
    while ((jm = jsonLdRe.exec(html)) !== null) {
      try {
        const ld = JSON.parse(jm[1])
        const reviewArr: unknown[] = ld['@type'] === 'School' ? (ld.review || []) : []
        for (const r of reviewArr) {
          const obj = r as Record<string, unknown>
          const body = String(obj.reviewBody || obj.description || '')
          if (body.length < 20) continue
          const ratingObj = obj.reviewRating as Record<string, unknown> | undefined
          const ratingVal = ratingObj ? parseFloat(String(ratingObj.ratingValue)) : null
          reviews.push({
            source: 'greatschools',
            reviewer_type: (obj.author as Record<string, unknown>)?.['@type'] === 'Person' ? 'parent' : null,
            rating: ratingVal != null && !isNaN(ratingVal) ? Math.round(ratingVal) : null,
            review_text: body.trim().slice(0, 2000),
            review_date: String(obj.datePublished || '') || null,
          })
        }
        if (reviews.length > 0) break
      } catch { /* skip */ }
    }
  }

  // Strategy 3: HTML — look for review card patterns
  if (reviews.length === 0) {
    // Common GreatSchools review card selectors
    const patterns = [
      /<div[^>]+class="[^"]*review[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<p[^>]+class="[^"]*review-text[^"]*"[^>]*>([\s\S]*?)<\/p>/gi,
      /<div[^>]+data-testid="review[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    ]
    for (const re of patterns) {
      let m: RegExpExecArray | null
      while ((m = re.exec(html)) !== null) {
        const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        if (text.length >= 40 && text.length < 3000) {
          reviews.push({ source: 'greatschools', reviewer_type: null, rating: null, review_text: text.slice(0, 2000), review_date: null })
        }
      }
      if (reviews.length >= 3) break
    }
  }

  return reviews.slice(0, 30)  // cap at 30 per school
}

function extractNicheReviews(html: string): ScrapedReview[] {
  const reviews: ScrapedReview[] = []

  // Niche uses __NEXT_DATA__ or similar JSON blobs
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (nextDataMatch) {
    try {
      const nd = JSON.parse(nextDataMatch[1])
      const candidates = [
        nd?.props?.pageProps?.reviews,
        nd?.props?.pageProps?.school?.reviews,
        nd?.props?.pageProps?.data?.reviews,
      ]
      for (const arr of candidates) {
        if (!Array.isArray(arr) || arr.length === 0) continue
        for (const r of arr) {
          const text = String(r.body || r.text || r.reviewText || '')
          if (text.length < 20) continue
          const ratingRaw = r.overallRating ?? r.rating ?? r.ratingValue
          const ratingNorm = ratingRaw != null ? Math.round(parseFloat(String(ratingRaw))) : null
          const reviewerType = r.reviewerType || r.authorType || null
          reviews.push({
            source: 'niche',
            reviewer_type: reviewerType,
            rating: ratingNorm,
            review_text: text.trim().slice(0, 2000),
            review_date: r.created || r.date || null,
          })
        }
        if (reviews.length > 0) break
      }
    } catch { /* skip */ }
  }

  // Niche HTML fallback
  if (reviews.length === 0) {
    const re = /<div[^>]+class="[^"]*review__text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null) {
      const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      if (text.length >= 40) reviews.push({ source: 'niche', reviewer_type: null, rating: null, review_text: text.slice(0, 2000), review_date: null })
    }
  }

  return reviews.slice(0, 30)
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Review Text Scraper ===')
  if (dryRun) console.log('DRY RUN — no data will be written')
  console.log()

  // Verify table
  const { error: tableErr } = await supabase.from('scraped_reviews').select('id').limit(1)
  if (tableErr) {
    console.error('scraped_reviews table not found:', tableErr.message)
    console.error('Run supabase/migrations/005_review_summaries.sql first.')
    process.exit(1)
  }

  // Load schools with a GreatSchools URL
  let query = supabase
    .from('schools')
    .select('id, name, state, zip, greatschools_url, niche_url')
    .not('greatschools_url', 'is', null)
    .order('greatschools_rating', { ascending: false, nullsFirst: false })
    .limit(limitArg)

  if (zipArg) query = query.eq('zip', zipArg)

  const { data: schools, error: schoolErr } = await query
  if (schoolErr) { console.error('Load schools failed:', schoolErr.message); process.exit(1) }

  const schoolList = (schools || []) as { id: string; name: string; state: string; zip: string; greatschools_url: string | null; niche_url: string | null }[]
  console.log(`Processing ${schoolList.length} schools`)
  console.log()

  let totalSaved = 0
  let scraped = 0
  let skipped = 0

  for (const school of schoolList) {
    // Skip if we already have reviews scraped recently
    const { count } = await supabase
      .from('scraped_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school.id)

    if ((count ?? 0) >= 5) {
      if (verbose) console.log(`  ${school.name} — skipping (${count} reviews already stored)`)
      skipped++
      continue
    }

    console.log(`Scraping: ${school.name} (${school.zip})`)
    const reviews: ScrapedReview[] = []

    // GreatSchools
    if (school.greatschools_url) {
      try {
        const html = await fetchHtml(school.greatschools_url)
        const gsReviews = extractGSReviews(html)
        if (verbose) console.log(`  GS: ${gsReviews.length} reviews`)
        reviews.push(...gsReviews)
      } catch (e) {
        if (verbose) console.log(`  GS fetch failed: ${(e as Error).message}`)
      }
      // Small delay to avoid rate-limiting
      await new Promise((r) => setTimeout(r, 800))
    }

    // Niche
    if (school.niche_url && reviews.length < 10) {
      try {
        const html = await fetchHtml(school.niche_url)
        const nicheReviews = extractNicheReviews(html)
        if (verbose) console.log(`  Niche: ${nicheReviews.length} reviews`)
        reviews.push(...nicheReviews)
      } catch (e) {
        if (verbose) console.log(`  Niche fetch failed: ${(e as Error).message}`)
      }
      await new Promise((r) => setTimeout(r, 800))
    }

    console.log(`  Found ${reviews.length} reviews`)

    if (reviews.length === 0) continue
    if (dryRun) { console.log('  DRY RUN — would save'); scraped++; continue }

    // Delete old reviews for this school and re-insert fresh
    await supabase.from('scraped_reviews').delete().eq('school_id', school.id)

    const rows = reviews.map((r) => ({ school_id: school.id, ...r }))
    const { error: insErr } = await supabase.from('scraped_reviews').insert(rows)
    if (insErr) {
      console.error(`  Save error: ${insErr.message}`)
    } else {
      totalSaved += reviews.length
      scraped++
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Schools scraped: ${scraped}`)
  console.log(`  Schools skipped: ${skipped}`)
  console.log(`  Reviews saved:   ${totalSaved}`)
  if (!dryRun && scraped > 0) {
    console.log()
    console.log('Next step: npx tsx scripts/generate-review-summaries.ts')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
