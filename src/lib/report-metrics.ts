import type { ReportData, ContentBlock } from '@/lib/types'

// ── Word counting ─────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function wordsFromBlock(block: ContentBlock): number {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
      return countWords(block.text)
    case 'callout':
      return countWords(block.label) + countWords(block.text)
    case 'comparison_table':
      return block.rows.reduce(
        (sum, row) => sum + row.cells.reduce((s, c) => s + countWords(c), 0),
        0
      )
    case 'stats_grid':
      return block.items.reduce(
        (sum, item) =>
          sum + countWords(item.label) + countWords(String(item.value)) + countWords(item.context),
        0
      )
    case 'tour_questions':
      return block.questions.reduce((sum, q) => sum + countWords(q), 0)
    case 'timeline':
      return block.items.reduce((sum, i) => sum + countWords(i.date) + countWords(i.text), 0)
    default:
      return 0
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Estimate read time in minutes at 250 wpm (appropriate for detailed/technical content).
 * Counts words across all sections, alerts, and verdict text.
 */
export function calculateReadTime(reportData: ReportData): number {
  let totalWords = 0

  for (const section of reportData.sections ?? []) {
    totalWords += countWords(section.title ?? '')
    totalWords += countWords(section.subtitle ?? '')
    for (const block of section.content ?? []) {
      totalWords += wordsFromBlock(block)
    }
  }

  for (const alert of reportData.alerts ?? []) {
    totalWords += countWords(alert.title)
    totalWords += countWords(alert.text)
  }

  const verdict = reportData.verdict
  if (verdict) {
    totalWords += countWords(verdict.best_for ?? '')
    for (const p of verdict.paragraphs ?? []) totalWords += countWords(p)
    totalWords += countWords(verdict.consider_alternatives ?? '')
  }

  return Math.max(1, Math.round(totalWords / 250))
}

/**
 * Count distinct sources referenced in the report: district orgs, domains,
 * phone numbers, and related school cross-references.
 */
export function calculateSourceCount(reportData: ReportData): number {
  const fullText = JSON.stringify(reportData).toLowerCase()
  const sources = new Set<string>()

  // Known district / organization identifiers
  const orgs = [
    'lausd', 'smmusd', 'ccusd', 'esusd', 'mbusd', 'hbcsd', 'rbusd',
    'lacoe', 'greatschools', 'schooldigger', 'niche',
    'california department of education', 'ca education code',
    'board policy', 'ccef', 'mbef', 'hbef',
  ]
  for (const org of orgs) {
    if (fullText.includes(org)) sources.add(org)
  }

  // Distinct domains referenced anywhere in the report
  const domainMatches = fullText.match(/[a-z0-9]+\.(?:org|com|net|edu|gov)/g) ?? []
  for (const d of domainMatches) sources.add(d)

  // Phone numbers (each is a distinct contact/source)
  const phoneMatches = JSON.stringify(reportData).match(/\(\d{3}\)\s*\d{3}[-.]?\d{4}/g) ?? []
  for (const p of phoneMatches) sources.add(p)

  // Related schools as cross-references
  for (const rs of reportData.related_schools ?? []) {
    if (rs.name) sources.add(rs.name.toLowerCase())
  }

  return sources.size
}
