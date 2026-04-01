/**
 * scrape-reddit.ts
 * Run with: npx tsx scripts/scrape-reddit.ts [--zip <zip>] [--school <id>] [--limit <n>] [--dry-run] [--verbose]
 *
 * Searches Reddit for mentions of schools using the public JSON API
 * (no OAuth required — Reddit exposes search via .json endpoints).
 * Stores relevant posts + comments in reddit_mentions table.
 *
 * ── Env vars required ─────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * ── Rate limiting ─────────────────────────────────────────────────────────────
 * Reddit's public API allows ~1 req/sec without OAuth. The script enforces
 * a 1.2s delay between requests to stay well within limits.
 */

import { createClient } from '@supabase/supabase-js'
import * as https from 'https'

// ── Args ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const zipArg   = args.indexOf('--zip')    !== -1 ? args[args.indexOf('--zip')    + 1] : null
const schoolArg = args.indexOf('--school') !== -1 ? args[args.indexOf('--school') + 1] : null
const limitArg  = args.indexOf('--limit')  !== -1 ? parseInt(args[args.indexOf('--limit') + 1]) : 50
const dryRun   = args.includes('--dry-run')
const verbose  = args.includes('--verbose')
const MIN_SCORE = -5  // ignore heavily downvoted posts

// ── Clients ───────────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase env vars'); process.exit(1) }
const supabase = createClient(supabaseUrl, supabaseKey)

// ── Subreddits by state ───────────────────────────────────────────────────────

const STATE_SUBREDDITS: Record<string, string[]> = {
  CA: ['LAParents', 'LosAngeles', 'SantaMonica', 'bayarea', 'sanfrancisco', 'sandiego'],
  NY: ['nyc', 'NYCParents', 'brooklyn', 'manhattan'],
  TX: ['Austin', 'houston', 'dallas'],
  WA: ['Seattle', 'SeattleWA'],
  IL: ['chicago'],
  CO: ['Denver', 'ColoradoSprings'],
  DC: ['washingtondc', 'nova'],
}
const NATIONAL_SUBREDDITS = ['Parenting', 'Mommit', 'daddit', 'Teachers', 'education']

function getSubreddits(state: string): string[] {
  return [...(STATE_SUBREDDITS[state] || []), ...NATIONAL_SUBREDDITS]
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'EarlyScouts/1.0 (school research tool; contact@earlyscouts.com)',
        'Accept': 'application/json',
      },
    }, (res) => {
      if (res.statusCode === 429) { res.resume(); reject(new Error('Rate limited')); return }
      if (res.statusCode === 403) { res.resume(); reject(new Error('Forbidden')); return }
      if ((res.statusCode || 0) >= 400) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return }
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))) }
        catch (e) { reject(e) }
      })
      res.on('error', reject)
    })
    req.on('error', reject)
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')) })
  })
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)) }

// ── Reddit post parsing ───────────────────────────────────────────────────────

interface RedditComment { text: string; score: number; author: string }

interface RedditPost {
  id: string
  subreddit: string
  title: string
  url: string
  selftext: string
  score: number
  num_comments: number
  created_utc: number
}

function extractPosts(data: unknown, schoolName: string): RedditPost[] {
  const posts: RedditPost[] = []
  try {
    const listing = (data as { data: { children: unknown[] } }).data?.children || []
    const lowerName = schoolName.toLowerCase()
    for (const child of listing) {
      const post = (child as { data: RedditPost }).data
      if (!post?.id) continue
      if (post.score < MIN_SCORE) continue
      // Relevance check — post must mention the school name somewhere
      const searchable = `${post.title} ${post.selftext}`.toLowerCase()
      if (!searchable.includes(lowerName.split(' ')[0]) && !searchable.includes(lowerName)) continue
      posts.push(post)
    }
  } catch { /* skip malformed */ }
  return posts
}

async function fetchTopComments(postId: string, subreddit: string): Promise<RedditComment[]> {
  try {
    const url = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=10&depth=1`
    const data = await fetchJson(url)
    await delay(1200)
    const commentListing = (data as unknown[])[1] as { data: { children: unknown[] } }
    const children = commentListing?.data?.children || []
    const comments: RedditComment[] = []
    for (const child of children) {
      const c = (child as { kind: string; data: { body: string; score: number; author: string } }).data
      if (!c?.body || c.body === '[deleted]' || c.body === '[removed]') continue
      if (c.score < 1) continue
      comments.push({ text: c.body.trim().slice(0, 500), score: c.score, author: c.author })
    }
    return comments.slice(0, 5)
  } catch {
    return []
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== Reddit Mention Scraper ===')
  if (dryRun) console.log('DRY RUN — no data will be written')
  console.log()

  // Verify table
  const { error: tableErr } = await supabase.from('reddit_mentions').select('id').limit(1)
  if (tableErr) {
    console.error('reddit_mentions table not found:', tableErr.message)
    console.error('Run supabase/migrations/006_reddit.sql first.')
    process.exit(1)
  }

  // Load schools
  let query = supabase
    .from('schools')
    .select('id, name, city, state, zip')
    .order('greatschools_rating', { ascending: false, nullsFirst: false })
    .limit(limitArg)

  if (zipArg) query = (query as typeof query).eq('zip', zipArg)
  if (schoolArg) query = (query as typeof query).eq('id', schoolArg)

  const { data: schools, error: schoolErr } = await query
  if (schoolErr) { console.error('Load schools failed:', schoolErr.message); process.exit(1) }

  const schoolList = (schools || []) as { id: string; name: string; city: string; state: string; zip: string }[]
  console.log(`Processing ${schoolList.length} schools`)
  console.log()

  let totalMentions = 0
  let scraped = 0
  let skipped = 0

  for (const school of schoolList) {
    // Skip if already scraped recently (within 30 days)
    const { count } = await supabase
      .from('reddit_mentions')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', school.id)
      .gte('scraped_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    if ((count ?? 0) > 0) {
      if (verbose) console.log(`  ${school.name} — skipping (scraped recently, ${count} mentions)`)
      skipped++
      continue
    }

    const subreddits = getSubreddits(school.state)
    const queries = [
      `"${school.name}"`,
      `${school.name} ${school.city}`,
    ]

    console.log(`Searching: ${school.name} (${school.city}, ${school.state})`)

    const seenIds = new Set<string>()
    const newMentions: object[] = []

    for (const q of queries) {
      for (const sr of subreddits) {
        const url = `https://www.reddit.com/r/${sr}/search.json?q=${encodeURIComponent(q)}&sort=relevance&limit=10&restrict_sr=on&t=all`
        try {
          const data = await fetchJson(url)
          await delay(1200)
          const posts = extractPosts(data, school.name)
          if (verbose && posts.length > 0) console.log(`  r/${sr} "${q}": ${posts.length} posts`)

          for (const post of posts) {
            if (seenIds.has(post.id)) continue
            seenIds.add(post.id)

            // Check if already in DB
            const { count: existing } = await supabase
              .from('reddit_mentions')
              .select('id', { count: 'exact', head: true })
              .eq('reddit_post_id', post.id)

            if ((existing ?? 0) > 0) continue

            // Fetch top comments
            const comments = await fetchTopComments(post.id, post.subreddit || sr)

            newMentions.push({
              school_id: school.id,
              reddit_post_id: post.id,
              subreddit: post.subreddit || sr,
              post_title: post.title?.slice(0, 300),
              post_url: `https://www.reddit.com${post.url || `/r/${sr}/comments/${post.id}`}`,
              post_text: post.selftext?.slice(0, 2000) || null,
              post_score: post.score,
              comment_count: post.num_comments,
              post_created_at: post.created_utc ? new Date(post.created_utc * 1000).toISOString() : null,
              relevant_comments: comments,
              scraped_at: new Date().toISOString(),
            })
          }
        } catch (e) {
          if (verbose) console.log(`  r/${sr} error: ${(e as Error).message}`)
          await delay(2000)  // back off on error
        }
      }
    }

    console.log(`  Found ${newMentions.length} new mentions`)

    if (newMentions.length === 0) { continue }
    if (dryRun) { console.log('  DRY RUN — would save'); scraped++; continue }

    const { error: insErr } = await supabase.from('reddit_mentions').insert(newMentions)
    if (insErr) {
      console.error(`  Save error: ${insErr.message}`)
    } else {
      totalMentions += newMentions.length
      scraped++
      console.log(`  ✓ Saved`)
    }
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Schools processed: ${scraped}`)
  console.log(`  Schools skipped:   ${skipped}`)
  console.log(`  Mentions saved:    ${totalMentions}`)
  if (!dryRun && scraped > 0) {
    console.log()
    console.log('Next step: npx tsx scripts/generate-reddit-summaries.ts')
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
