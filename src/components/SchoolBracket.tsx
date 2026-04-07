'use client'

import { useRef, useState, useEffect } from 'react'
import type { School } from '@/lib/types'
import SchoolPreviewModal from './SchoolPreviewModal'

/* ── Level classification ── */
function getLevel(school: School): 'elementary' | 'middle-high' | 'guide' {
  const g = (school.grades || '').toLowerCase()
  if (school.enrollment === 0 || g === '') return 'guide'
  if (g.includes('k') || g.includes('tk')) return 'elementary'
  if (
    g.includes('6') || g.includes('7') || g.includes('8') ||
    g.includes('9') || g.includes('10') || g.includes('11') || g.includes('12')
  ) return 'middle-high'
  return 'elementary'
}

function isHigh(school: School): boolean {
  const g = (school.grades || '').toLowerCase()
  return g.includes('9') || g.includes('10') || g.includes('11') || g.includes('12')
}

function shortDistrict(d: string): string {
  if (d.includes('Los Angeles')) return 'LAUSD'
  if (d.includes('Santa Monica')) return 'SMMUSD'
  if (d.includes('Culver City')) return 'CCUSD'
  return d
}

function getFeedsTo(school: School): string | null {
  if (!school.reportData?.sections) return null
  for (const section of school.reportData.sections) {
    for (const block of section.content) {
      if (block.type === 'feeder_flow') {
        const flow = block as any
        const middle = flow.schools?.find((s: any) => s.level === 'middle')
        if (middle) return middle.name
      }
    }
  }
  return null
}

function getTag(school: School): string {
  const p = school.programs
  if (p?.dualLanguage) return 'Dual Language'
  if (p?.gate) return 'GATE Program'
  if (p?.stem) return 'STEM'
  if (school.type === 'charter') return 'Charter'
  if (school.keyInsight?.toLowerCase().includes('magnet')) return 'Magnet'
  if (school.titleOne) return 'Title I'
  const gs = school.ratings.greatSchools
  if (gs && gs >= 9) return 'Top Rated'
  if (gs && gs >= 8) return 'High Performing'
  return 'Neighborhood'
}

function isPermitOption(school: School, majorDistrict: string): boolean {
  return school.district !== majorDistrict && school.district !== ''
}

function ratingClasses(r: number | null): string {
  if (!r) return 'bg-gray-100 text-gray-400'
  if (r >= 8) return 'bg-scout-green/10 text-scout-green'
  if (r >= 6) return 'bg-honey/10 text-honey'
  return 'bg-peach/10 text-peach'
}

function tagClasses(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('dual') || t.includes('language')) return 'bg-sky/10 text-sky'
  if (t.includes('gate') || t.includes('gifted')) return 'bg-honey/10 text-honey'
  if (t.includes('stem') || t.includes('magnet')) return 'bg-mint/10 text-scout-green'
  if (t.includes('charter')) return 'bg-lavender/10 text-lavender'
  if (t.includes('title')) return 'bg-peach/10 text-peach'
  if (t.includes('top') || t.includes('high per')) return 'bg-scout-green/10 text-scout-green'
  if (t.includes('permit')) return 'bg-peach/10 text-peach'
  return 'bg-gray-100 text-gray-500'
}

const LEVEL_CONFIG = {
  elementary:    { icon: '🏫', label: 'Elementary Schools',               color: 'text-scout-green' },
  'middle-high': { icon: '🎓', label: 'Middle & High Schools',            color: 'text-sky' },
  guide:         { icon: '📋', label: 'Guides & Playbooks',               color: 'text-peach' },
  permits:       { icon: '🔄', label: 'Transfer, Permit & Charter Options', color: 'text-peach' },
}

/* ── School Card ── */
function BracketCard({ school, onClick }: { school: School; onClick: () => void }) {
  const tag = getTag(school)
  const feedsTo = getLevel(school) === 'elementary' ? getFeedsTo(school) : null
  const rating = school.ratings.greatSchools
  const isGuide = getLevel(school) === 'guide'

  return (
    <div className="relative flex-shrink-0 w-[210px] snap-start">
      <button
        onClick={onClick}
        className="w-full bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-scout-green/50 hover:shadow-sm transition-all"
      >
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-sm font-semibold text-charcoal leading-snug line-clamp-2 flex-1">
            {school.name}
          </h3>
          {rating !== null && rating > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${ratingClasses(rating)}`}>
              {rating}/10
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-2">
          {isGuide ? (
            <>{school.reportData?.sections?.length || 0} chapters</>
          ) : (
            <>{shortDistrict(school.district)}{school.grades ? ` · ${school.grades}` : ''}</>
          )}
        </p>

        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tagClasses(tag)}`}>
          {tag}
        </span>

        {feedsTo && (
          <p className="text-[10px] text-gray-400 mt-2">Feeds → {feedsTo}</p>
        )}
      </button>

    </div>
  )
}

/* ── Scroll arrow button (desktop only) ── */
function ScrollArrow({
  direction,
  onClick,
  visible,
}: {
  direction: 'left' | 'right'
  onClick: () => void
  visible: boolean
}) {
  if (!visible) return null
  return (
    <button
      onClick={onClick}
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      className={`
        hidden md:flex absolute top-1/2 -translate-y-1/2 z-20
        w-8 h-8 items-center justify-center
        bg-white border border-gray-200 rounded-full shadow-md
        text-gray-500 hover:text-charcoal hover:border-gray-300 hover:shadow-lg
        transition-all duration-150
        opacity-0 group-hover:opacity-100
        ${direction === 'left' ? '-left-3' : '-right-3'}
      `}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {direction === 'left'
          ? <polyline points="9 11 5 7 9 3" />
          : <polyline points="5 3 9 7 5 11" />
        }
      </svg>
    </button>
  )
}

/* ── Horizontal scroll row with desktop arrow nav ── */
function LevelRow({
  icon, label, color, count, schools, onSelectSchool,
}: {
  icon: string
  label: string
  color: string
  count: number
  schools: School[]
  onSelectSchool: (s: School) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  function updateArrows() {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
  }

  // Check scroll state on mount (and whenever school list changes)
  useEffect(() => {
    updateArrows()
  }, [schools])

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-base">{icon}</span>
        <span className={`text-xs font-mono uppercase tracking-widest font-bold ${color}`}>{label}</span>
        <span className="text-xs text-gray-400">{count} with reports</span>
      </div>

      {/* group enables opacity transition on arrow buttons via group-hover */}
      <div className="group relative">
        <ScrollArrow direction="left"  visible={canScrollLeft}  onClick={() => scrollBy(-440)} />
        <ScrollArrow direction="right" visible={canScrollRight} onClick={() => scrollBy(440)}  />

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {schools.map((s) => (
            <BracketCard key={s.id} school={s} onClick={() => onSelectSchool(s)} />
          ))}
          {/* Trailing spacer keeps last card clear of the right fade */}
          <div className="w-10 shrink-0" aria-hidden />
        </div>

        {/* Right-edge gradient fade — always present as a scroll affordance */}
        <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-[#FFFAF6] to-transparent pointer-events-none" />
      </div>
    </div>
  )
}

/* ── Down arrow connector ── */
function DownArrow() {
  return (
    <div className="flex justify-center py-1">
      <span className="text-xl text-gray-200">↓</span>
    </div>
  )
}

/* ── Main Bracket Component ── */
interface SchoolBracketProps {
  schools: School[]
  locationLabel?: string
}

export default function SchoolBracket({
  schools,
  locationLabel = 'Your area',
}: SchoolBracketProps) {
  const [previewSchool, setPreviewSchool] = useState<School | null>(null)

  const elementary: School[] = []
  const middleHigh: School[] = []
  const guides: School[] = []

  const districtCounts: Record<string, number> = {}
  for (const s of schools) {
    const d = s.district || 'Unknown'
    districtCounts[d] = (districtCounts[d] || 0) + 1
  }
  const majorDistrict = Object.entries(districtCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

  for (const s of schools) {
    const level = getLevel(s)
    if (level === 'guide') guides.push(s)
    else if (level === 'middle-high') middleHigh.push(s)
    else elementary.push(s)
  }

  elementary.sort((a, b) => (b.ratings.greatSchools || 0) - (a.ratings.greatSchools || 0))
  middleHigh.sort((a, b) => {
    const aHigh = isHigh(a) ? 1 : 0
    const bHigh = isHigh(b) ? 1 : 0
    if (aHigh !== bHigh) return aHigh - bHigh
    return (b.ratings.greatSchools || 0) - (a.ratings.greatSchools || 0)
  })

  const permitSchools = elementary.filter((s) => isPermitOption(s, majorDistrict))
  const neighborhoodElementary = elementary.filter((s) => !isPermitOption(s, majorDistrict))

  const hasElementary = neighborhoodElementary.length > 0
  const hasMiddleHigh = middleHigh.length > 0

  return (
    <div>
      <div className="mb-4">
        <p className="text-sm text-gray-500">
          {locationLabel} &middot; click any school for a preview
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Only showing schools with analyst-written deep-dive reports
        </p>
      </div>

      {hasElementary && (
        <LevelRow
          icon={LEVEL_CONFIG.elementary.icon}
          label={LEVEL_CONFIG.elementary.label}
          color={LEVEL_CONFIG.elementary.color}
          count={neighborhoodElementary.length}
          schools={neighborhoodElementary}
          onSelectSchool={setPreviewSchool}
        />
      )}

      {hasElementary && hasMiddleHigh && <DownArrow />}

      {hasMiddleHigh && (
        <LevelRow
          icon={LEVEL_CONFIG['middle-high'].icon}
          label={LEVEL_CONFIG['middle-high'].label}
          color={LEVEL_CONFIG['middle-high'].color}
          count={middleHigh.length}
          schools={middleHigh}
          onSelectSchool={setPreviewSchool}
        />
      )}

      {permitSchools.length > 0 && (
        <div className="mt-4">
          <LevelRow
            icon={LEVEL_CONFIG.permits.icon}
            label={LEVEL_CONFIG.permits.label}
            color={LEVEL_CONFIG.permits.color}
            count={permitSchools.length}
            schools={permitSchools}
            onSelectSchool={setPreviewSchool}
          />
        </div>
      )}

      {guides.length > 0 && (
        <div className="mt-4">
          <LevelRow
            icon={LEVEL_CONFIG.guide.icon}
            label={LEVEL_CONFIG.guide.label}
            color={LEVEL_CONFIG.guide.color}
            count={guides.length}
            schools={guides}
            onSelectSchool={setPreviewSchool}
          />
        </div>
      )}

      <SchoolPreviewModal school={previewSchool} onClose={() => setPreviewSchool(null)} />
    </div>
  )
}
