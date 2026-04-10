'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import type { School, TourDate, AcademicsData, SubjectAcademics, BoardInsight, DistrictIntelData, ReviewSummary, ReviewSummaryResponse, RedditSummary, RedditSummaryResponse } from '@/lib/types'
import { generateGCalLink, formatTourDate } from '@/lib/tour-calendar'
import type { RelatedSchool, RelatedSchoolsResponse } from '@/app/api/schools/[id]/related/route'
import SchoolReport from '@/components/SchoolReport'
import FollowButton from '@/components/FollowButton'
import { getNeighborhoodForSlug } from '@/data/neighborhood-schools'

type Tab = 'overview' | 'report' | 'academics' | 'intel' | 'feeder' | 'community' | 'programs' | 'enrollment'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'report', label: 'Full Report' },
  { id: 'academics', label: 'Academics' },
  { id: 'intel', label: 'District Intel' },
  { id: 'feeder', label: 'Feeder Map' },
  { id: 'community', label: 'Community' },
  { id: 'programs', label: 'Programs' },
  { id: 'enrollment', label: 'Enrollment' },
]

function StatBox({ label, value }: { label: string; value: string | number | boolean }) {
  const display =
    typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value ?? 'N/A'
  return (
    <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-1">
      <span className="text-xs font-mono uppercase tracking-widest text-gray-400">{label}</span>
      <span className="text-lg font-semibold text-charcoal">{String(display)}</span>
    </div>
  )
}

function CheckRow({ label, checked, detail }: { label: string; checked: boolean; detail?: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50">
      <span className={`text-lg shrink-0 mt-0.5 ${checked ? 'text-scout-green' : 'text-gray-300'}`}>
        {checked ? '✓' : '✗'}
      </span>
      <div>
        <span className={`text-sm font-medium ${checked ? 'text-charcoal' : 'text-gray-400'}`}>
          {label}
        </span>
        {detail && checked && (
          <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  )
}

// ── Academics helper components ───────────────────────────────────────────────

function ProficiencyBar({ pct, color = 'bg-scout-green' }: { pct: number | null; color?: string }) {
  if (pct === null) return <span className="text-xs text-gray-300 font-mono">—</span>
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-0">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-charcoal w-9 text-right shrink-0">{Math.round(pct)}%</span>
    </div>
  )
}

function YoyBadge({ change }: { change: number | null }) {
  if (change === null) return null
  const positive = change > 0
  const neutral = change === 0
  return (
    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${neutral ? 'text-gray-400' : positive ? 'text-scout-green bg-scout-green/10' : 'text-red-500 bg-red-50'}`}>
      {positive ? '+' : ''}{change} pts
    </span>
  )
}

function AcademicsOverviewPanel({
  academics,
  onDeepDive,
}: {
  academics: AcademicsData
  onDeepDive: () => void
}) {
  const subjects: { key: 'math' | 'ela'; label: string; color: string }[] = [
    { key: 'math', label: 'Math', color: 'bg-scout-green' },
    { key: 'ela', label: 'Reading', color: 'bg-sky' },
  ]

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-5">
      {subjects.map(({ key, label, color }) => {
        const data: SubjectAcademics | null = academics[key]
        if (!data) return null
        return (
          <div key={key} className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-charcoal">{label}</span>
              <div className="flex items-center gap-2">
                {data.pctProficient !== null && (
                  <span className="text-sm font-bold text-charcoal">{Math.round(data.pctProficient)}%</span>
                )}
                <YoyBadge change={data.yoyChange} />
              </div>
            </div>
            {data.pctProficient !== null && (
              <div className="bg-gray-100 rounded-full h-2">
                <div className={`${color} h-2 rounded-full`} style={{ width: `${Math.min(data.pctProficient, 100)}%` }} />
              </div>
            )}
            {/* Mini trend */}
            {data.trend.length >= 2 && (
              <p className="text-xs text-gray-400 font-mono">
                {data.trend.map((t) => `${Math.round(t.pctProficient ?? 0)}%`).join(' → ')}
                {' '}{(data.trend[data.trend.length - 1].pctProficient ?? 0) > (data.trend[0].pctProficient ?? 0) ? '📈' : (data.trend[data.trend.length - 1].pctProficient ?? 0) < (data.trend[0].pctProficient ?? 0) ? '📉' : ''}
              </p>
            )}
          </div>
        )
      })}
      <button
        onClick={onDeepDive}
        className="text-xs font-semibold text-scout-green hover:opacity-80 transition-opacity self-start"
      >
        See grade-by-grade &amp; subgroup breakdown →
      </button>
    </div>
  )
}

function AcademicsDeepDive({ academics }: { academics: AcademicsData }) {
  const [activeSubject, setActiveSubject] = useState<'math' | 'ela'>('math')
  const data: SubjectAcademics | null = academics[activeSubject]

  // Equity gap: diff between highest and lowest subgroup proficiency (excluding 'all')
  const subgroupPcts = (data?.bySubgroup ?? [])
    .filter((s) => s.subgroup !== 'all' && s.pctProficient !== null)
    .map((s) => s.pctProficient as number)
  const equityGap =
    subgroupPcts.length >= 2
      ? Math.round(Math.max(...subgroupPcts) - Math.min(...subgroupPcts))
      : null

  const highSubgroup = data?.bySubgroup.find((s) => s.pctProficient === Math.max(...subgroupPcts))
  const lowSubgroup = data?.bySubgroup.find((s) => s.pctProficient === Math.min(...subgroupPcts))

  // Alerts: subgroups 10+ pts below school average
  const allPct = data?.pctProficient ?? null
  const alerts = data?.bySubgroup
    .filter((s) => s.subgroup !== 'all' && s.pctProficient !== null && allPct !== null && allPct - s.pctProficient! >= 10)
    .sort((a, b) => (allPct! - b.pctProficient!) - (allPct! - a.pctProficient!)) ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Subject toggle */}
      <div className="flex gap-2">
        {(['math', 'ela'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSubject(s)}
            className={`text-sm font-semibold px-4 py-2 rounded-full transition-colors ${
              activeSubject === s ? 'bg-charcoal text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-charcoal'
            }`}
          >
            {s === 'math' ? 'Math' : 'Reading / ELA'}
          </button>
        ))}
      </div>

      {!data ? (
        <p className="text-sm text-gray-400">No {activeSubject} data available.</p>
      ) : (
        <>
          {/* Overall + YoY */}
          <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono uppercase tracking-widest text-gray-400">
                All Students · {data.schoolYear}
              </span>
              <YoyBadge change={data.yoyChange} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-charcoal">
                {data.pctProficient !== null ? `${Math.round(data.pctProficient)}%` : 'N/A'}
              </span>
              <span className="text-sm text-gray-500">proficient or above</span>
            </div>
            {data.studentsTested !== null && (
              <span className="text-xs text-gray-400">{data.studentsTested.toLocaleString()} students tested</span>
            )}

            {/* Multi-year trend */}
            {data.trend.length >= 2 && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
                  Multi-year trend
                </p>
                <div className="flex items-end gap-3 flex-wrap">
                  {data.trend.map((t, i) => (
                    <div key={t.schoolYear} className="flex flex-col items-center gap-1">
                      <span className="text-sm font-bold text-charcoal">
                        {t.pctProficient !== null ? `${Math.round(t.pctProficient)}%` : '—'}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">{t.schoolYear.slice(2)}</span>
                      {i < data.trend.length - 1 && (
                        <span className="text-gray-300 self-center">→</span>
                      )}
                    </div>
                  ))}
                  {data.trend.length >= 2 && (() => {
                    const first = data.trend[0].pctProficient
                    const last = data.trend[data.trend.length - 1].pctProficient
                    if (first === null || last === null) return null
                    return <span className="text-lg">{last > first ? '📈' : last < first ? '📉' : ''}</span>
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Grade breakdown */}
          {data.byGrade.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">
                By Grade Level
              </h3>
              <div className="flex flex-col gap-2">
                {data.byGrade.map((g) => (
                  <div key={g.grade} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10 shrink-0">
                      {g.grade === 'all' ? 'All' : `${g.grade}${['11','12'].includes(g.grade) ? 'th' : ['3','4','5','6','7','8'].includes(g.grade) ? 'rd/th' : ''}`}
                    </span>
                    <ProficiencyBar
                      pct={g.pctProficient}
                      color={activeSubject === 'math' ? 'bg-scout-green' : 'bg-sky'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subgroup breakdown */}
          {data.bySubgroup.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-mono uppercase tracking-widest text-gray-400">
                Score by Student Group
              </h3>
              <div className="flex flex-col gap-2">
                {data.bySubgroup.map((sg) => (
                  <div key={sg.subgroup} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 shrink-0 leading-tight">{sg.label}</span>
                    <ProficiencyBar
                      pct={sg.pctProficient}
                      color={sg.subgroup === 'all' ? 'bg-charcoal' : activeSubject === 'math' ? 'bg-scout-green' : 'bg-sky'}
                    />
                    {sg.yoyChange !== null && (
                      <span className={`text-xs font-mono w-14 shrink-0 text-right ${sg.yoyChange > 0 ? 'text-scout-green' : sg.yoyChange < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                        {sg.yoyChange > 0 ? '+' : ''}{sg.yoyChange}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Equity analysis */}
              {(equityGap !== null || alerts.length > 0) && (
                <div className="pt-3 border-t border-gray-50 flex flex-col gap-2">
                  {equityGap !== null && highSubgroup && lowSubgroup && (
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Equity gap: {equityGap} pts</span>
                      {' '}({highSubgroup.label} {Math.round(highSubgroup.pctProficient ?? 0)}% vs {lowSubgroup.label} {Math.round(lowSubgroup.pctProficient ?? 0)}%)
                    </p>
                  )}
                  {alerts.map((sg) => (
                    <p key={sg.subgroup} className="text-xs text-amber-600">
                      ⚠️ {sg.label} scores {Math.round(allPct! - sg.pctProficient!)} pts below school average
                      {sg.yoyChange !== null && sg.yoyChange > 0 && (
                        <span className="text-scout-green"> · improving {sg.yoyChange > 0 ? '+' : ''}{sg.yoyChange} pts YoY</span>
                      )}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── District Intel components ─────────────────────────────────────────────────

function getDomain(url: string): string | null {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
}

const CATEGORY_ICONS: Record<string, string> = {
  construction: '🏗️',
  budget: '💰',
  programs: '📚',
  staffing: '👤',
  policy: '📋',
  enrollment: '🎒',
  safety: '🛡️',
  other: '📌',
}

const IMPACT_COLORS: Record<string, string> = {
  high: 'bg-red-50 border-red-200',
  medium: 'bg-amber-50 border-amber-200',
  low: 'bg-gray-50 border-gray-100',
}

const SENTIMENT_DOT: Record<string, string> = {
  positive: 'bg-scout-green',
  neutral: 'bg-gray-300',
  negative: 'bg-red-400',
}

function InsightCard({ insight }: { insight: BoardInsight }) {
  const icon = CATEGORY_ICONS[insight.category] ?? '📌'
  const impactClass = IMPACT_COLORS[insight.impact_level] ?? 'bg-gray-50 border-gray-100'
  const sentimentDot = SENTIMENT_DOT[insight.sentiment] ?? 'bg-gray-300'
  const dateStr = insight.meeting_date
    ? new Date(insight.meeting_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <div className={`border rounded-xl p-4 flex flex-col gap-2 ${impactClass}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-gray-400 capitalize">
              {insight.category}
            </span>
            {insight.impact_level === 'high' && (
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                High Impact
              </span>
            )}
            <span className={`w-2 h-2 rounded-full shrink-0 ${sentimentDot}`} title={insight.sentiment} />
          </div>
          <p className="text-sm font-semibold text-charcoal leading-snug">{insight.headline}</p>
          {insight.source_url?.startsWith('http') && (
            <p className="text-xs text-gray-400 mt-0.5">via {getDomain(insight.source_url)}</p>
          )}
          {insight.detail && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{insight.detail}</p>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-gray-100/60">
        <span className="text-xs text-gray-400 font-mono">
          {dateStr ?? 'Date unknown'}
          {insight.school_name && insight.school_id && (
            <span className="ml-2 text-charcoal">· {insight.school_name}</span>
          )}
        </span>
        {insight.source_url?.startsWith('http') && (
          <a
            href={insight.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-charcoal transition-colors"
          >
            Source →
          </a>
        )}
      </div>
    </div>
  )
}

function DistrictIntelTab({ intel, schoolName }: { intel: DistrictIntelData; schoolName: string }) {
  if (!intel.hasData) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
        <div className="text-3xl">🏛️</div>
        <h3 className="font-serif text-lg text-charcoal">No district intel yet</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Board meeting minutes for this district haven't been scraped yet.
          Run the board meeting scraper to populate this section.
        </p>
        <p className="text-xs text-gray-400 font-mono">
          npx tsx scripts/scrape-board-meetings.ts
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {intel.districtName && (
        <p className="text-xs font-mono text-gray-400">
          District: {intel.districtName} · Sourced from board meeting minutes
        </p>
      )}

      {/* School-specific insights */}
      {intel.insights.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="font-serif text-xl text-charcoal">
            What's happening at {schoolName}
          </h3>
          <div className="flex flex-col gap-3">
            {intel.insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* District-wide insights */}
      {intel.districtInsights.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="font-serif text-xl text-charcoal">
            District-wide news
          </h3>
          <p className="text-sm text-gray-500 -mt-2">
            These items affect all schools in the district.
          </p>
          <div className="flex flex-col gap-3">
            {intel.districtInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scout Analysis ────────────────────────────────────────────────────────────

function ScoutAnalysis({ academics }: { academics: AcademicsData }) {
  const math = academics.math
  const ela  = academics.ela
  if (!math && !ela) return null

  const sentences: string[] = []

  if (math?.pctProficient != null) {
    const pct   = Math.round(math.pctProficient)
    const level = pct >= 75 ? 'strong' : pct >= 50 ? 'solid' : pct >= 30 ? 'moderate' : 'below average'
    let s = `Math proficiency is ${level} at ${pct}%`
    if (math.yoyChange != null && Math.abs(math.yoyChange) >= 2) {
      s += `, ${math.yoyChange > 0 ? 'up' : 'down'} ${Math.abs(math.yoyChange)} points from last year`
    }
    sentences.push(s + '.')
  }

  if (ela?.pctProficient != null) {
    const pct = Math.round(ela.pctProficient)
    let s = `Reading proficiency is ${pct}%`
    if (ela.trend.length >= 3) {
      const first = ela.trend[0].pctProficient
      const last  = ela.trend[ela.trend.length - 1].pctProficient
      if (first != null && last != null) {
        const delta = Math.round(last - first)
        if (Math.abs(delta) >= 3) {
          s += `, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} points over ${ela.trend.length} years`
        }
      }
    }
    sentences.push(s + '.')
  }

  // Equity gap — use math if available, else ELA
  const subject = math ?? ela
  if (subject) {
    const byGroup = subject.bySubgroup.filter((s) => s.subgroup !== 'all' && s.pctProficient != null)
    if (byGroup.length >= 2) {
      const hi  = byGroup.reduce((a, b) => (a.pctProficient! > b.pctProficient! ? a : b))
      const lo  = byGroup.reduce((a, b) => (a.pctProficient! < b.pctProficient! ? a : b))
      const gap = Math.round(hi.pctProficient! - lo.pctProficient!)
      if (gap >= 15) {
        sentences.push(
          `There is a ${gap}-point equity gap between ${hi.label} (${Math.round(hi.pctProficient!)}%) and ${lo.label} (${Math.round(lo.pctProficient!)}%) students.`
        )
      }
    }
  }

  if (sentences.length === 0) return null

  return (
    <div className="border-l-4 border-scout-green pl-5 py-2 bg-white rounded-r-xl">
      <p className="text-xs font-mono uppercase tracking-widest text-scout-green mb-2">Scout Analysis</p>
      <p className="font-serif italic text-charcoal text-sm leading-relaxed">{sentences.join(' ')}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SchoolDetailPage({ serverGrantedAccess = false }: { serverGrantedAccess?: boolean }) {
  const params = useParams()
  const slug = params?.slug as string
  const [schoolsHref, setSchoolsHref] = useState(() => {
    const h = getNeighborhoodForSlug(slug)
    return h ? `/schools?q=${h}` : '/schools'
  })
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('schoolsFilter')
      if (saved) setSchoolsHref(`/schools?q=${saved}`)
    } catch {}
  }, [])

  const [school, setSchool] = useState<School | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<Tab>('overview')
  const [tourDates, setTourDates] = useState<TourDate[]>([])
  const [toursLoading, setToursLoading] = useState(false)
  const [academics, setAcademics] = useState<AcademicsData | null>(null)
  const [districtIntel, setDistrictIntel] = useState<DistrictIntelData | null>(null)
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null)
  const [reviewSummaryLoading, setReviewSummaryLoading] = useState(false)
  const [reviewSummaryStale, setReviewSummaryStale] = useState(false)
  const [redditSummary, setRedditSummary] = useState<RedditSummary | null>(null)
  const [related, setRelated] = useState<RelatedSchoolsResponse | null>(null)
  useEffect(() => {
    if (!slug) return
    fetch(`/api/schools/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data) => {
        setSchool(data)
        setLoading(false)
        if (data?.name) document.title = `${data.name} | EarlyScouts`
      })
      .catch(() => {
        setSchool(null)
        setLoading(false)
      })
    // Fetch academics eagerly (feeds Overview + Academics tab)
    fetch(`/api/schools/${slug}/academics`)
      .then((r) => r.json())
      .then((data: AcademicsData) => { if (data.hasData) setAcademics(data) })
      .catch(() => {})
    // Fetch district intel eagerly (feeds Intel tab)
    fetch(`/api/schools/${slug}/district-intel`)
      .then((r) => r.json())
      .then((data: DistrictIntelData) => setDistrictIntel(data))
      .catch(() => {})
    // Fetch review summary eagerly — returns from cache instantly when available
    setReviewSummaryLoading(true)
    fetch(`/api/schools/${slug}/reviews`)
      .then((r) => r.json())
      .then((data: ReviewSummaryResponse) => {
        if (data.hasData && data.summary) {
          setReviewSummary(data.summary)
          setReviewSummaryStale(!!data.stale)
        }
        setReviewSummaryLoading(false)
      })
      .catch(() => { setReviewSummaryLoading(false) })
    // Fetch Reddit summary eagerly (cached, fast)
    fetch(`/api/schools/${slug}/reddit`)
      .then((r) => r.json())
      .then((data: RedditSummaryResponse) => {
        if (data.hasData && data.summary) setRedditSummary(data.summary)
      })
      .catch(() => {})
    // Fetch related schools (nearby + feeder)
    fetch(`/api/schools/${slug}/related`)
      .then((r) => r.json())
      .then((data: RelatedSchoolsResponse) => setRelated(data))
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    if (!slug) return
    setToursLoading(true)
    fetch(`/api/schools/${slug}/tour-dates`)
      .then((r) => r.json())
      .then((data) => {
        setTourDates(data.tourDates || [])
        setToursLoading(false)
      })
      .catch(() => {
        setTourDates([])
        setToursLoading(false)
      })
  }, [slug])

  // IntersectionObserver — highlights the active nav tab as user scrolls
  useEffect(() => {
    if (!school) return
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter((e) => e.isIntersecting)
        if (intersecting.length === 0) return
        const topmost = intersecting.reduce((a, b) =>
          a.boundingClientRect.top < b.boundingClientRect.top ? a : b
        )
        setActiveSection(topmost.target.id as Tab)
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 }
    )
    TABS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [school])

  if (loading) {
    return (
      <main>
        <Nav />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-400 font-mono text-sm">Loading...</div>
        </div>
        <Footer />
      </main>
    )
  }

  if (!school) {
    return (
      <main>
        <Nav />
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <div className="text-4xl">🔍</div>
          <h1 className="font-serif text-2xl text-charcoal">School not found</h1>
          <Link href={schoolsHref} className="text-scout-green hover:underline text-sm">
            Back to Schools
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  // If structured report data exists, render the full report page
  if (school.reportData) {
    return <SchoolReport school={school} serverGrantedAccess={serverGrantedAccess} />
  }

  const typeLabel: Record<string, string> = {
    public: 'Public',
    magnet: 'Magnet',
    charter: 'Charter',
    private: 'Private',
  }

  const typeColors: Record<string, string> = {
    public: 'bg-sky/20 text-sky',
    magnet: 'bg-mint/20 text-scout-green',
    charter: 'bg-lavender/20 text-lavender',
    private: 'bg-peach/20 text-peach',
  }

  const trendColors: Record<string, string> = {
    rising: 'text-scout-green',
    stable: 'text-honey',
    declining: 'text-red-400',
  }

  const trendDot: Record<string, string> = {
    rising: 'bg-scout-green',
    stable: 'bg-honey',
    declining: 'bg-red-400',
  }

  return (
    <main>
      <Nav />

      {/* School header */}
      <section className="bg-charcoal py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href={schoolsHref} className="text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
            &larr; Back to Schools
          </Link>
          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${typeColors[school.type]}`}>
                  {typeLabel[school.type]}
                </span>
                {school.ratings.greatSchools !== null && (
                  <span className="text-xs font-mono bg-scout-green/20 text-scout-green px-2 py-0.5 rounded-full">
                    GreatSchools {school.ratings.greatSchools}/10
                  </span>
                )}
                {school.ratings.niche !== null && (
                  <span className="text-xs font-mono bg-sky/20 text-sky px-2 py-0.5 rounded-full">
                    Niche {school.ratings.niche}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-white mb-1">{school.name}</h1>
              <p className="text-gray-400 text-sm">
                {school.address} &middot; Grades {school.grades} &middot; {school.enrollment.toLocaleString()} students
              </p>
            </div>
            <div className="shrink-0 mt-1">
              <FollowButton slug={school.slug} schoolName={school.name} variant="dark" />
            </div>
          </div>
        </div>
      </section>

      {/* Sticky scroll nav */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth' })}
                className={`text-sm font-medium px-5 py-4 border-b-2 whitespace-nowrap transition-colors ${
                  activeSection === tab.id
                    ? 'border-scout-green text-scout-green'
                    : 'border-transparent text-gray-500 hover:text-charcoal'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Playbook banner */}
      <div className="bg-scout-green px-4 py-2.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <p className="text-white text-sm">
            <span className="font-semibold">New:</span>{' '}
            The LA School Selection Playbook: your step-by-step guide to navigating school options
          </p>
          <Link
            href="/guides/playbook"
            className="shrink-0 text-white text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Read the guide →
          </Link>
        </div>
      </div>

      {/* Long scroll content */}
      <div className="bg-cream px-4">
        <div className="max-w-4xl mx-auto">

          {/* SECTION: OVERVIEW */}
          <section id="overview" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-8">
              {/* Key Insight */}
              <div className="border-l-4 border-scout-green pl-5 py-2">
                <p className="text-xs font-mono uppercase tracking-widest text-scout-green mb-2">
                  Scout Insight
                </p>
                <p className="font-serif italic text-charcoal text-lg leading-relaxed">
                  {school.keyInsight}
                </p>
              </div>

              {/* Stats grid */}
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-4">Quick stats</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatBox label="Enrollment" value={school.enrollment.toLocaleString()} />
                  <StatBox label="Student:Teacher" value={school.studentTeacherRatio} />
                  <StatBox label="Free/Reduced Lunch" value={`${school.freeReducedLunchPct}%`} />
                  <StatBox label="Title I" value={school.titleOne} />
                </div>
              </div>

              {/* Demographics */}
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-3">Demographics</h2>
                <div className="bg-white border border-gray-100 rounded-xl p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'White', pct: school.demographics.white },
                      { label: 'Hispanic', pct: school.demographics.hispanic },
                      { label: 'Asian', pct: school.demographics.asian },
                      { label: 'Black', pct: school.demographics.black },
                      { label: 'Multiracial', pct: school.demographics.multiracial },
                      { label: 'Other', pct: school.demographics.other },
                    ].map((d) => (
                      <div key={d.label} className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">{d.label}</span>
                          <span className="text-xs font-mono text-charcoal">{d.pct}%</span>
                        </div>
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-scout-green h-1.5 rounded-full"
                            style={{ width: `${d.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Academic Performance (enhanced if DOE data available, simple bars if not) */}
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-4">Academic Performance</h2>
                {academics ? (
                  <AcademicsOverviewPanel academics={academics} onDeepDive={() => document.getElementById('academics')?.scrollIntoView({ behavior: 'smooth' })} />
                ) : (
                  <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-3">
                    {school.academics.mathProficiency !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 shrink-0">Math</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-scout-green h-2 rounded-full" style={{ width: `${school.academics.mathProficiency}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{school.academics.mathProficiency}%</span>
                      </div>
                    )}
                    {school.academics.readingProficiency !== null && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-14 shrink-0">Reading</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-sky h-2 rounded-full" style={{ width: `${school.academics.readingProficiency}%` }} />
                        </div>
                        <span className="text-xs text-gray-500 w-10 text-right">{school.academics.readingProficiency}%</span>
                      </div>
                    )}
                    {school.academics.mathProficiency === null && school.academics.readingProficiency === null && (
                      <p className="text-sm text-gray-400">Academic performance data not yet available for this school.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Ratings */}
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-4">Ratings</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {school.ratings.greatSchools !== null && (
                    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-scout-green flex items-center justify-center text-white font-bold text-2xl">
                        {school.ratings.greatSchools}
                      </div>
                      <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                        GreatSchools (out of 10)
                      </span>
                    </div>
                  )}
                  {school.ratings.niche !== null && (
                    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-sky flex items-center justify-center text-white font-bold text-2xl">
                        {school.ratings.niche}
                      </div>
                      <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                        Niche Grade
                      </span>
                    </div>
                  )}
                  {school.ratings.stateRanking !== null && (
                    <div className="bg-white border border-gray-100 rounded-xl p-5 flex flex-col items-center gap-2 text-center">
                      <div className="text-2xl">🏆</div>
                      <span className="text-sm font-semibold text-charcoal">
                        {school.ratings.stateRanking}
                      </span>
                      <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                        State Ranking
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financials */}
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-4">Financials</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatBox
                    label="Tuition"
                    value={
                      school.financials.tuition !== null
                        ? `$${school.financials.tuition.toLocaleString()}/yr`
                        : 'Public (Free)'
                    }
                  />
                  <StatBox
                    label="Expected Donation"
                    value={school.financials.expectedDonation ?? 'None listed'}
                  />
                  <StatBox label="PTA Active" value={school.financials.ptaActive} />
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: FULL REPORT */}
          <section id="report" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="font-serif text-2xl text-charcoal mb-2">Full Report</h2>
                  <p className="text-gray-500 text-sm">
                    Comprehensive research report written by Scout AI.
                  </p>
                </div>
                {school.deepReport && (
                  <span className="text-xs font-mono bg-scout-green/10 text-scout-green px-3 py-1 rounded-full shrink-0">
                    Scout Research
                  </span>
                )}
              </div>

              {school.deepReport ? (
                <div className="deep-report bg-white border border-gray-100 rounded-2xl p-6 sm:p-8">
                  <div dangerouslySetInnerHTML={{ __html: school.deepReport }} />
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
                  <div className="text-3xl">📄</div>
                  <h3 className="font-serif text-lg text-charcoal">Full Report Coming Soon</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    We're generating a comprehensive research report for this school.
                    Run <code className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded">npx tsx scripts/generate-school-report.ts --school &quot;{school.name}&quot;</code> to generate it.
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: ACADEMICS */}
          <section id="academics" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-serif text-2xl text-charcoal mb-1">Deep Academics</h2>
                {academics?.source && (
                  <p className="text-xs font-mono text-gray-400">
                    Source: {academics.source} · {academics.schoolYear}
                  </p>
                )}
              </div>

              {academics?.hasData && <ScoutAnalysis academics={academics} />}

              {!academics?.hasData ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col items-center gap-3 text-center">
                  <div className="text-3xl">📊</div>
                  <h3 className="font-serif text-lg text-charcoal">No detailed assessment data yet</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    State DOE test score data for this school hasn't been imported yet.
                    Data comes from the California CAASPP (Smarter Balanced) assessment program.
                  </p>
                  {school.state === 'CA' && (
                    <p className="text-xs text-gray-400 font-mono">CA CAASPP data: run import-ca-assessments script to load.</p>
                  )}
                </div>
              ) : (
                <AcademicsDeepDive academics={academics} />
              )}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: DISTRICT INTEL */}
          <section id="intel" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-serif text-2xl text-charcoal mb-1">District Intel</h2>
                <p className="text-sm text-gray-500">
                  What&rsquo;s happening at the board level: construction, budget, programs, and policy changes that affect your family.
                </p>
              </div>
              {districtIntel ? (
                <DistrictIntelTab intel={districtIntel} schoolName={school.name} />
              ) : (
                <div className="text-sm text-gray-400 font-mono py-4">Loading district intel...</div>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: FEEDER MAP */}
          <section id="feeder" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-serif text-2xl text-charcoal mb-2">Feeder Map</h2>
                <p className="text-gray-500 text-sm">
                  Where students typically come from, and where they go next.
                </p>
              </div>

              {(!Array.isArray(school.feederMap.feedsFrom) || school.feederMap.feedsFrom.length === 0) &&
              (!Array.isArray(school.feederMap.feedsInto) || school.feederMap.feedsInto.length === 0) ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-3">🗺️</div>
                  <p className="font-mono text-sm">Feeder map coming soon</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  {/* Feeds From */}
                  {Array.isArray(school.feederMap.feedsFrom) && school.feederMap.feedsFrom.length > 0 && (
                    <div className="w-full max-w-lg">
                      <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3 text-center">
                        Commonly feeds from
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {school.feederMap.feedsFrom.map((s) => (
                          <span
                            key={s}
                            className="bg-sky/10 border border-sky/30 text-sky text-sm px-3 py-1.5 rounded-lg"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Arrow down */}
                  {Array.isArray(school.feederMap.feedsFrom) && school.feederMap.feedsFrom.length > 0 && (
                    <div className="text-gray-300 text-2xl">&#8595;</div>
                  )}

                  {/* This school */}
                  <div className="bg-scout-green text-white px-8 py-4 rounded-2xl text-center shadow-md">
                    <p className="font-serif text-lg">{school.name}</p>
                    <p className="text-xs text-green-200 font-mono mt-1">Grades {school.grades}</p>
                  </div>

                  {/* Arrow down */}
                  {Array.isArray(school.feederMap.feedsInto) && school.feederMap.feedsInto.length > 0 && (
                    <div className="text-gray-300 text-2xl">&#8595;</div>
                  )}

                  {/* Feeds Into */}
                  {Array.isArray(school.feederMap.feedsInto) && school.feederMap.feedsInto.length > 0 && (
                    <div className="w-full max-w-lg">
                      <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3 text-center">
                        Typically feeds into
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {school.feederMap.feedsInto.map((s) => (
                          <span
                            key={s}
                            className="bg-peach/10 border border-peach/30 text-peach text-sm px-3 py-1.5 rounded-lg"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: COMMUNITY */}
          <section id="community" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-10">

              {/* ── Section 1: AI Review Summary ── */}
              <div>
                <h2 className="font-serif text-2xl text-charcoal mb-1">What Parents Are Saying</h2>
                <p className="text-gray-500 text-sm mb-6">
                  AI-analyzed from public reviews on GreatSchools and Niche.
                </p>

                {reviewSummaryLoading ? (
                  <div className="text-sm text-gray-400 font-mono py-4">Analyzing reviews...</div>
                ) : reviewSummary ? (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="bg-charcoal text-white text-sm font-semibold px-4 py-2 rounded-full capitalize">
                        {reviewSummary.vibe}
                      </div>
                      <span className="text-xs text-gray-400 font-mono">
                        Based on {reviewSummary.reviewCount} reviews
                        {reviewSummary.sources.length > 0 && ` · ${reviewSummary.sources.join(', ')}`}
                      </span>
                      {reviewSummaryStale && (
                        <span className="text-xs text-amber-500 font-mono">· cached</span>
                      )}
                    </div>
                    <div className="bg-white border border-gray-100 rounded-2xl p-6">
                      <p className="text-sm leading-relaxed text-charcoal">{reviewSummary.summary}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
                        <h3 className="text-xs font-mono uppercase tracking-widest text-scout-green">What parents praise</h3>
                        <ul className="flex flex-col gap-2">
                          {reviewSummary.positives.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                              <span className="text-scout-green shrink-0 mt-0.5">✓</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3">
                        <h3 className="text-xs font-mono uppercase tracking-widest text-amber-500">Common concerns</h3>
                        <ul className="flex flex-col gap-2">
                          {reviewSummary.concerns.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-charcoal">
                              <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>{c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    {reviewSummary.themes.length > 0 && (
                      <div>
                        <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Frequently mentioned topics</h3>
                        <div className="flex flex-wrap gap-2">
                          {reviewSummary.themes.map((theme, i) => (
                            <span key={i} className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-full">{theme}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-400">Read full reviews:</span>
                      {school.greatschoolsUrl && (
                        <a href={school.greatschoolsUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-scout-green hover:opacity-80 transition-opacity">GreatSchools →</a>
                      )}
                      {school.nicheUrl && (
                        <a href={school.nicheUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-sky hover:opacity-80 transition-opacity">Niche →</a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="bg-white border border-gray-100 rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-5xl font-bold text-charcoal">{school.sentiment.score.toFixed(1)}</div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={`text-xl ${star <= Math.round(school.sentiment.score) ? 'text-honey' : 'text-gray-200'}`}>&#9733;</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{school.sentiment.reviewCount} reviews</span>
                      </div>
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${trendDot[school.sentiment.trend]}`} />
                          <span className={`text-sm font-semibold capitalize ${trendColors[school.sentiment.trend]}`}>{school.sentiment.trend}</span>
                          <span className="text-xs text-gray-400">sentiment trend</span>
                        </div>
                      </div>
                    </div>
                    {school.sentiment.themes.length > 0 && (
                      <div>
                        <h3 className="font-serif text-xl text-charcoal mb-3">Top themes</h3>
                        <div className="flex flex-wrap gap-2">
                          {school.sentiment.themes.map((theme) => (
                            <span key={theme} className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-full">{theme}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 font-mono">
                      Data sourced from GreatSchools, Niche, and public review platforms. Last updated {school.lastUpdated}.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Section 2: Reddit Sentiment ── */}
              {redditSummary && (
                <div className="border-t border-gray-100 pt-8">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <h2 className="font-serif text-xl text-charcoal">What Reddit Says</h2>
                      <p className="text-xs text-gray-400 font-mono mt-1">
                        Based on {redditSummary.mentionCount} mentions across{' '}
                        {redditSummary.subredditsFound.map(s => `r/${s}`).join(', ')}
                      </p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${
                      redditSummary.overallSentiment === 'positive' ? 'bg-scout-green/10 text-scout-green' :
                      redditSummary.overallSentiment === 'negative' ? 'bg-red-50 text-red-500' :
                      redditSummary.overallSentiment === 'mixed' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{redditSummary.overallSentiment}</span>
                  </div>

                  <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-4">
                    <p className="text-sm leading-relaxed text-charcoal">{redditSummary.summary}</p>
                  </div>

                  {redditSummary.themes.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {redditSummary.themes.map((theme, i) => (
                        <span key={i} className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-1.5 rounded-full">{theme}</span>
                      ))}
                    </div>
                  )}

                  {redditSummary.notableThreads.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Top threads</h3>
                      <div className="flex flex-col gap-2">
                        {redditSummary.notableThreads.map((thread, i) => (
                          <a
                            key={i}
                            href={thread.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-gray-200 transition-colors group"
                          >
                            <span className="text-xs font-mono text-gray-400 mt-0.5 shrink-0">↗</span>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-charcoal group-hover:text-scout-green transition-colors line-clamp-2">{thread.title}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-400 shrink-0">▲ {thread.score}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: PROGRAMS */}
          <section id="programs" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-serif text-2xl text-charcoal mb-2">Programs</h2>
                <p className="text-gray-500 text-sm">
                  Specialized programs and services available at this school.
                </p>
              </div>

              <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col divide-y divide-gray-50">
                <CheckRow
                  label="GATE (Gifted and Talented Education)"
                  checked={school.programs.gate}
                />
                <CheckRow
                  label="STEM Program"
                  checked={school.programs.stem}
                />
                <CheckRow
                  label="Special Education Services"
                  checked={school.programs.specialEd}
                  detail={school.programs.specialEdDetails}
                />
                <CheckRow
                  label="Dual Language Program"
                  checked={school.programs.dualLanguage}
                />
              </div>
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* SECTION: ENROLLMENT */}
          <section id="enrollment" className="py-12 scroll-mt-28">
            <div className="flex flex-col gap-8">
              <div>
                <h2 className="font-serif text-2xl text-charcoal mb-2">Enrollment Information</h2>
                <p className="text-gray-500 text-sm">
                  Key dates, tour schedule, and admission details for this school.
                </p>
              </div>

              {/* Transfer & Permits banner */}
              {(school.district?.toLowerCase().includes('los angeles unified') || school.district?.toLowerCase().includes('lausd')) && (
                <div className="flex gap-4 bg-sky/5 border-l-4 border-sky rounded-r-xl p-5">
                  <span className="text-sky text-xl shrink-0 mt-0.5">ℹ</span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal mb-1">Inter-District Permits (LAUSD)</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Live outside LAUSD? You may be able to attend this school via inter-district permit.
                      LAUSD's outgoing permit window runs <strong>February 1 through April 30</strong> each year.
                    </p>
                    <Link href="/guides/playbook#permits" className="text-xs font-semibold text-sky mt-2 inline-block hover:opacity-80 transition-opacity">
                      Permit guide in the Playbook &rarr;
                    </Link>
                  </div>
                </div>
              )}
              {(school.district?.toLowerCase().includes('santa monica') || school.district?.toLowerCase().includes('smmusd')) && (
                <div className="flex gap-4 bg-sky/5 border-l-4 border-sky rounded-r-xl p-5">
                  <span className="text-sky text-xl shrink-0 mt-0.5">ℹ</span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal mb-1">Inter-District Permits (SMMUSD)</p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Live outside Santa Monica-Malibu? SMMUSD accepts inter-district permit applications
                      starting <strong>June 23</strong> each year. Approval is subject to space availability.
                    </p>
                    <Link href="/guides/playbook#smmusd" className="text-xs font-semibold text-sky mt-2 inline-block hover:opacity-80 transition-opacity">
                      Transfer guide in the Playbook &rarr;
                    </Link>
                  </div>
                </div>
              )}

              {/* Tour dates section */}
              <div>
                <h3 className="font-serif text-xl text-charcoal mb-4">Upcoming Tours &amp; Open Houses</h3>
                {toursLoading ? (
                  <div className="text-sm text-gray-400 font-mono py-4">Loading tour dates...</div>
                ) : tourDates.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {tourDates.map((tour) => {
                      const eventIcons: Record<string, string> = {
                        tour: '🏫',
                        open_house: '🚪',
                        tk_k_roundup: '🎒',
                        info_session: 'ℹ️',
                        enrollment: '📋',
                      }
                      const icon = eventIcons[tour.event_type] || '📅'
                      const dateStr = formatTourDate(tour.date, tour.time)
                      const gcalLink = generateGCalLink({
                        schoolName: school.name,
                        title: tour.title,
                        date: tour.date,
                        time: tour.time,
                        address: tour.location || school.address,
                        rsvpUrl: tour.rsvp_url,
                        notes: tour.notes,
                      })
                      return (
                        <div
                          key={tour.id}
                          className="bg-white border border-gray-100 rounded-2xl p-5 flex flex-col gap-3"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-xl shrink-0 mt-0.5">{icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-charcoal text-sm">{tour.title}</p>
                              <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
                              {tour.location && (
                                <p className="text-xs text-gray-400 mt-0.5">{tour.location}</p>
                              )}
                              {tour.is_recurring && tour.recurrence_note && (
                                <p className="text-xs text-lavender mt-0.5">{tour.recurrence_note}</p>
                              )}
                              {tour.rsvp_required && (
                                <span className="inline-block mt-1 text-xs font-mono bg-peach/10 text-peach px-2 py-0.5 rounded-full">
                                  RSVP required
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-50">
                            {gcalLink && (
                              <a
                                href={gcalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-charcoal border border-gray-200 hover:border-charcoal px-3 py-1.5 rounded-full transition-colors"
                              >
                                Add to Calendar 📅
                              </a>
                            )}
                            {tour.rsvp_url && (
                              <a
                                href={tour.rsvp_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-semibold text-white bg-scout-green hover:opacity-90 px-3 py-1.5 rounded-full transition-opacity"
                              >
                                RSVP &rarr;
                              </a>
                            )}
                            <a
                              href={tour.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 transition-colors"
                            >
                              Source &rarr;
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-2xl p-6 flex flex-col gap-3">
                    <p className="text-sm text-gray-600">
                      No upcoming tours found for this school.
                    </p>
                    <p className="text-xs text-gray-400">
                      Many schools announce tours in October–January. We check district pages weekly during tour season.
                    </p>
                    {school.website && (
                      <a
                        href={school.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-scout-green hover:opacity-80 transition-opacity self-start"
                      >
                        Visit School Website for Tour Info &rarr;
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Key enrollment dates */}
              <div>
                <h3 className="font-serif text-xl text-charcoal mb-4">Admission Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                      Enrollment Opens
                    </span>
                    <p className="text-base font-semibold text-charcoal mt-1">
                      {school.enrollment_info.enrollmentOpens}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                      Neighborhood Preference
                    </span>
                    <p className="text-base font-semibold text-charcoal mt-1">
                      {school.enrollment_info.neighborhoodPercent}
                    </p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-5">
                    <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
                      Permit / Open Enrollment
                    </span>
                    <p className="text-base font-semibold text-charcoal mt-1">
                      {school.enrollment_info.permitPercent}
                    </p>
                  </div>
                </div>
              </div>

              {/* Website & map links */}
              <div className="flex flex-wrap gap-3">
                {school.website && (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold text-scout-green border border-scout-green/30 hover:border-scout-green px-4 py-2 rounded-full transition-colors"
                  >
                    Visit School Website &rarr;
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-sky border border-sky/30 hover:border-sky px-4 py-2 rounded-full transition-colors"
                >
                  View on Google Maps &rarr;
                </a>
              </div>

              <p className="text-xs text-gray-400">
                Address: {school.address}
              </p>
            </div>
          </section>

        </div>
      </div>

      {/* ── Parents Also Researched ─────────────────────────────────────────── */}
      {related && (related.nearby.length > 0 || related.feederInto.length > 0 || related.feederFrom.length > 0) && (
        <div className="bg-white border-t border-gray-100 py-12 px-4">
          <div className="max-w-4xl mx-auto flex flex-col gap-8">

            {/* Nearby schools */}
            {related.nearby.length > 0 && (
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-4 pl-4 border-l-4 border-scout-green">
                  Parents in {school.zip} also researched
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {related.nearby.map((s) => (
                    <RelatedSchoolCard key={s.id} school={s} />
                  ))}
                </div>
              </div>
            )}

            {/* Feeder pipeline */}
            {(related.feederInto.length > 0 || related.feederFrom.length > 0) && (
              <div>
                <h2 className="font-serif text-xl text-charcoal mb-4 pl-4 border-l-4 border-scout-green">
                  In the feeder pipeline
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {related.feederFrom.map((s) => (
                    <RelatedSchoolCard key={s.id} school={s} label="Feeds from" />
                  ))}
                  {related.feederInto.map((s) => (
                    <RelatedSchoolCard key={s.id} school={s} label="Feeds into" />
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}

// ── Related school card ───────────────────────────────────────────────────────

function RelatedSchoolCard({ school, label }: { school: RelatedSchool; label?: string }) {
  const typeColors: Record<string, string> = {
    public:  'bg-sky/20 text-sky',
    magnet:  'bg-mint/20 text-scout-green',
    charter: 'bg-lavender/20 text-lavender',
    private: 'bg-peach/20 text-peach',
  }
  const typeLabels: Record<string, string> = {
    public: 'Public', magnet: 'Magnet', charter: 'Charter', private: 'Private',
  }

  return (
    <Link
      href={`/schools/${school.slug}`}
      className="flex-shrink-0 w-56 bg-gray-50 hover:bg-white border border-gray-100 hover:border-gray-200 hover:shadow-sm rounded-2xl p-4 flex flex-col gap-2 transition-all"
    >
      {label && (
        <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">{label}</span>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${typeColors[school.type] || 'bg-gray-100 text-gray-500'}`}>
          {typeLabels[school.type] || school.type}
        </span>
        {school.greatschoolsRating !== null && (
          <span className="text-xs font-mono bg-scout-green/10 text-scout-green px-2 py-0.5 rounded-full">
            GS {school.greatschoolsRating}/10
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-charcoal leading-snug line-clamp-2">{school.name}</p>
      {school.keyInsight && (
        <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{school.keyInsight}</p>
      )}
    </Link>
  )
}