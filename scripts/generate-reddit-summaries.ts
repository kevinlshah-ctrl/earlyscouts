/**
 * generate-reddit-summaries.ts
 * Run with: npx tsx scripts/generate-reddit-summaries.ts [--zip <zip>] [--school <id>] [--force] [--verbose]
 *
 * For each school with 3+ Reddit mentions, calls Claude to generate a
 * structured sentiment summary and stores it in reddit_summaries.
 *
 * ── Env vars required ─────────────────────────────────────────────────────────
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const args = process.argv.slice(2)
const zipArg    = args.indexOf('--zip')    !== -1 ? args[args.indexOf('--zip')    + 1] : null
const schoolArg = args.indexOf('--school') !== -1 ? args[args.indexOf('--school') + 1] : null
const forceRefresh = args.includes('--force')
const verbose   = args.includes('--verbose')
const MIN_MENTIONS = 3
const MODEL = 'claude-sonnet-4-6'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicKey = process.env.ANTHROPIC_API_KEY
if (!supabaseUrl || !supabaseKey) { console.error('Missing Supabase env vars'); process.exit(1) }
if (!anthropicKey) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1) }

const supabase = createClient(supabaseUrl, supabaseKey)
const anthropic = new Anthropic({ apiKey: anthropicKey })

interface MentionRow {
  school_id: string
  subreddit: string
  post_title: string | null
  post_url: string
  post_text: string | null
  post_score: number | null
  relevant_comments: { text: string; score: number }[] | null
}

interface RedditSummaryResult {
  themes: string[]
  summary: string
  overall_sentiment: 'positive' | 'negative' | 'mixed' | 'neutral'
  notable_threads: { title: string; url: string; score: number }[]
}

async function generateSummary(schoolName: string, mentions: MentionRow[]): Promise<RedditSummaryResult> {
  const mentionText = mentions.map((m, i) => {
    const comments = (m.relevant_comments || []).map(c => `  - ${c.text}`).join('\n')
    return `Thread ${i + 1} [r/${m.subreddit}, score: ${m.post_score ?? 0}]\nTitle: ${m.post_title || '(no title)'}\n${m.post_text?.slice(0, 800) || '(link post)'}\nTop comments:\n${comments || '  (none)'}`
  }).join('\n\n---\n\n')

  const prompt = `Analyze these ${mentions.length} Reddit threads mentioning ${schoolName}.

Return ONLY a JSON object:
{
  "themes": ["theme 1", "theme 2", "theme 3", "theme 4"],
  "summary": "2-3 sentence summary of what Reddit parents think",
  "overall_sentiment": "positive|negative|mixed|neutral",
  "notable_threads": [{"title": "...", "url": "...", "score": 0}]
}

Rules:
- themes: 3-5 specific, concrete phrases (not vague). Quotes welcome: "Pickup is chaos"
- summary: honest, specific, cite subreddits if relevant. Start with the school name.
- overall_sentiment: one word from the list
- notable_threads: top 3 threads by score, include actual URL from input

Threads:
${mentionText}`

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })
  const msg = await stream.finalMessage()
  const raw = msg.content.find(b => b.type === 'text')?.text ?? '{}'
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim()
  const parsed = JSON.parse(cleaned) as RedditSummaryResult

  if (!Array.isArray(parsed.themes)) parsed.themes = []
  if (!Array.isArray(parsed.notable_threads)) parsed.notable_threads = []
  if (typeof parsed.summary !== 'string') parsed.summary = ''
  if (!['positive', 'negative', 'mixed', 'neutral'].includes(parsed.overall_sentiment)) {
    parsed.overall_sentiment = 'neutral'
  }

  return parsed
}

async function main() {
  console.log('=== Reddit Summary Generator ===')
  console.log(`Model: ${MODEL}`)
  if (forceRefresh) console.log('FORCE REFRESH')
  console.log()

  const { error: tableErr } = await supabase.from('reddit_summaries').select('school_id').limit(1)
  if (tableErr) {
    console.error('reddit_summaries table not found:', tableErr.message)
    console.error('Run supabase/migrations/006_reddit.sql first.')
    process.exit(1)
  }

  // Find schools with enough mentions
  let query = supabase.from('reddit_mentions').select('school_id, schools(name, zip)')
  if (zipArg) {
    const { data: zipSchools } = await supabase.from('schools').select('id').eq('zip', zipArg)
    const ids = (zipSchools || []).map((s: { id: string }) => s.id)
    if (ids.length === 0) { console.log('No schools for zip:', zipArg); process.exit(0) }
    query = query.in('school_id', ids)
  }
  if (schoolArg) query = query.eq('school_id', schoolArg)

  const { data: allMentions } = await query
  if (!allMentions) { console.log('No mentions found.'); process.exit(0) }

  // Count per school
  const countMap = new Map<string, { count: number; name: string; zip: string }>()
  for (const r of allMentions as { school_id: string; schools: { name: string; zip: string } | null }[]) {
    const ex = countMap.get(r.school_id)
    if (ex) { ex.count++ }
    else countMap.set(r.school_id, { count: 1, name: r.schools?.name ?? r.school_id, zip: r.schools?.zip ?? '' })
  }

  const eligible = Array.from(countMap.entries())
    .filter(([, v]) => v.count >= MIN_MENTIONS)
    .sort((a, b) => b[1].count - a[1].count)

  console.log(`${eligible.length} schools with ${MIN_MENTIONS}+ Reddit mentions`)
  console.log()

  let generated = 0, skipped = 0, errors = 0

  for (const [schoolId, info] of eligible) {
    // Check if refresh needed
    if (!forceRefresh) {
      const { data: existing } = await supabase
        .from('reddit_summaries')
        .select('next_refresh_at, mention_count')
        .eq('school_id', schoolId)
        .maybeSingle()

      if (existing && new Date(existing.next_refresh_at) > new Date()) {
        const countChange = Math.abs(info.count - (existing.mention_count || 0)) / Math.max(existing.mention_count || 1, 1)
        if (countChange <= 0.2) {
          if (verbose) console.log(`  ${info.name} — up to date, skipping`)
          skipped++
          continue
        }
      }
    }

    console.log(`Generating: ${info.name} (${info.count} mentions)`)

    const { data: mentions } = await supabase
      .from('reddit_mentions')
      .select('school_id, subreddit, post_title, post_url, post_text, post_score, relevant_comments')
      .eq('school_id', schoolId)
      .order('post_score', { ascending: false })
      .limit(20)

    if (!mentions || mentions.length < MIN_MENTIONS) { skipped++; continue }

    try {
      const result = await generateSummary(info.name, mentions as MentionRow[])
      if (verbose) {
        console.log(`  sentiment: ${result.overall_sentiment}`)
        console.log(`  themes: ${result.themes.join(', ')}`)
      }

      const subreddits = Array.from(new Set((mentions as MentionRow[]).map(m => m.subreddit)))

      const { error: upsertErr } = await supabase.from('reddit_summaries').upsert({
        school_id: schoolId,
        themes: result.themes,
        summary: result.summary,
        overall_sentiment: result.overall_sentiment,
        mention_count: info.count,
        subreddits_found: subreddits,
        notable_threads: result.notable_threads,
        generated_at: new Date().toISOString(),
        next_refresh_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: 'school_id' })

      if (upsertErr) { console.error(`  Save error: ${upsertErr.message}`); errors++ }
      else { generated++; console.log(`  ✓ Saved`) }
    } catch (e) {
      console.error(`  Failed: ${(e as Error).message}`)
      errors++
    }

    await new Promise(r => setTimeout(r, 300))
  }

  console.log()
  console.log('=== Results ===')
  console.log(`  Generated: ${generated}`)
  console.log(`  Skipped:   ${skipped}`)
  if (errors) console.log(`  Errors:    ${errors}`)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
