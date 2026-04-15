'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { METROS, DEFAULT_METRO } from '@/data/metro-config'
import { SCOUT_TAKES, ZIP_TO_TOWN } from '@/data/neighborhood-scout-takes'
import { getNeighborhoodById } from '@/data/neighborhood-schools'
import type { School } from '@/lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isGuideSlug(slug: string): boolean {
  return slug.includes('playbook') || slug.includes('blueprint')
}

function schoolHref(slug: string): string {
  return isGuideSlug(slug) ? `/guides/${slug}` : `/schools/${slug}`
}

/** Returns true for charter/magnet schools that require lottery or application */
function isAlternativeSchool(school: School): boolean {
  const slug = school.slug
  const name = school.name.toLowerCase()
  return (
    slug.includes('charter') ||
    slug.startsWith('cwc-') ||
    slug.includes('wish-charter') ||
    slug.includes('magnet') ||
    name.includes('charter') ||
    name.includes('cwc') ||
    name.includes('wish') ||
    name.includes('magnet')
  )
}

function shortDistrict(d: string): string {
  if (!d) return ''
  if (d.includes('Los Angeles')) return 'LAUSD'
  if (d.includes('Santa Monica')) return 'SMMUSD'
  if (d.includes('Culver City')) return 'CCUSD'
  return d
}

function getTag(school: School): string {
  const p = school.programs
  if (p?.dualLanguage) return 'Dual Language'
  if (p?.gate) return 'GATE Program'
  if (p?.stem) return 'STEM'
  if (isAlternativeSchool(school)) return 'Charter'
  if (school.keyInsight?.toLowerCase().includes('magnet')) return 'Magnet'
  if (school.titleOne) return 'Title I'
  const gs = school.ratings.greatSchools
  if (gs && gs >= 9) return 'Top Rated'
  if (gs && gs >= 8) return 'High Performing'
  return 'Neighborhood'
}

function ratingClasses(r: number | null): string {
  if (!r) return 'bg-gray-100 text-gray-400'
  if (r >= 8) return 'bg-[#5B9A6F]/10 text-[#5B9A6F]'
  if (r >= 6) return 'bg-[#E8B84B]/10 text-[#E8B84B]'
  return 'bg-[#F2945C]/10 text-[#F2945C]'
}

function tagClasses(tag: string): string {
  const t = tag.toLowerCase()
  if (t.includes('dual') || t.includes('language')) return 'bg-[#6BB3D9]/10 text-[#6BB3D9]'
  if (t.includes('gate') || t.includes('gifted')) return 'bg-[#E8B84B]/10 text-[#E8B84B]'
  if (t.includes('stem') || t.includes('magnet')) return 'bg-[#7ECAB0]/10 text-[#5B9A6F]'
  if (t.includes('charter')) return 'bg-[#A78BCA]/10 text-[#A78BCA]'
  if (t.includes('title')) return 'bg-[#F2945C]/10 text-[#F2945C]'
  if (t.includes('top') || t.includes('high per')) return 'bg-[#5B9A6F]/10 text-[#5B9A6F]'
  return 'bg-gray-100 text-gray-500'
}

function readAreasFromUrl(): string[] {
  if (typeof window === 'undefined') return []
  const area = new URLSearchParams(window.location.search).get('area')
  if (!area) return []
  return area.split(',').filter(id => getNeighborhoodById(id) != null || SCOUT_TAKES[id] != null)
}

// ── School Card (mirrors BracketCard from SchoolBracket) ──────────────────────

function BracketCard({ school }: { school: School }) {
  const tag = getTag(school)
  const rating = school.ratings.greatSchools
  const isGuide = isGuideSlug(school.slug)

  return (
    <div className="flex-shrink-0 w-[210px] snap-start">
      <a
        href={schoolHref(school.slug)}
        className="block bg-white border border-gray-200 rounded-xl p-4 text-left hover:border-[#5B9A6F]/50 hover:shadow-sm transition-all"
      >
        <div className="flex items-start gap-2 mb-2">
          <h3 className="text-sm font-semibold text-[#1A1A2E] leading-snug line-clamp-2 flex-1">
            {school.name}
          </h3>
          {rating !== null && rating > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${ratingClasses(rating)}`}>
              {rating}/10
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400 mb-2">
          {isGuide
            ? 'Step-by-step guide'
            : <>{shortDistrict(school.district)}{school.grades ? ` · ${school.grades}` : ''}</>
          }
        </p>

        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tagClasses(tag)}`}>
          {tag}
        </span>

        <p className="text-xs font-semibold text-[#5B9A6F] mt-3">
          {isGuide ? 'Read Guide →' : 'Read Deep Dive →'}
        </p>
      </a>
    </div>
  )
}

// ── Scroll Arrow (desktop only) ───────────────────────────────────────────────

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
        text-gray-500 hover:text-[#1A1A2E] hover:border-gray-300 hover:shadow-lg
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

// ── Horizontal scroll row ─────────────────────────────────────────────────────

function LevelRow({
  icon,
  label,
  color,
  schools,
}: {
  icon: string
  label: string
  color: string
  schools: School[]
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

  useEffect(() => { updateArrows() }, [schools])

  function doScroll(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }

  if (schools.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2 px-1">
        <span className="text-base">{icon}</span>
        <span className={`text-xs font-mono uppercase tracking-widest font-bold ${color}`}>{label}</span>
      </div>

      <div className="group relative">
        <ScrollArrow direction="left"  visible={canScrollLeft}  onClick={() => doScroll(-440)} />
        <ScrollArrow direction="right" visible={canScrollRight} onClick={() => doScroll(440)} />

        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
        >
          {schools.map(s => <BracketCard key={s.id} school={s} />)}
          <div className="w-10 shrink-0" aria-hidden />
        </div>

        <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-[#FFFAF6] to-transparent pointer-events-none" />
      </div>
    </div>
  )
}

// ── Scout Take Modal ──────────────────────────────────────────────────────────

function PipelineRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[10px] font-mono font-bold text-[#9B9690] uppercase tracking-wider mt-0.5 w-20 shrink-0">
        {label}
      </span>
      <span className="text-xs text-[#3D3A36] leading-snug">{text}</span>
    </div>
  )
}

function ScoutTakeModal({ townId, onClose }: { townId: string; onClose: () => void }) {
  const take = SCOUT_TAKES[townId]
  if (!take) return null

  return (
    <div className="fixed inset-0 z-[200] bg-[#FFFAF6] overflow-y-auto">
      {/* Sticky header */}
      <div className="sticky top-0 bg-[#FFFAF6] border-b border-[#E8E5E1] z-10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-2xl mx-auto">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-[#5B9A6F] font-medium hover:text-[#3d7a52] transition-colors shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="10 4 6 8 10 12" />
            </svg>
            Back to Schools
          </button>
          <div className="w-px h-4 bg-[#E8E5E1]" />
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] leading-none">
            Scout&apos;s Take
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔭</span>
          <h1 className="font-serif text-2xl text-[#1A1A2E] leading-tight">
            {take.title.replace("Scout's Take: ", '')}
          </h1>
        </div>

        {take.paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-[#3D3A36] leading-relaxed">{p}</p>
        ))}

        {/* Pipeline */}
        <div className="bg-white border border-[#E8E5E1] rounded-xl p-4 mt-2">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-3">
            📍 Default Pipeline
          </p>
          <div className="flex flex-col gap-2">
            <PipelineRow label="Elementary" text={take.pipeline.elementary} />
            <div className="ml-[92px] text-[#B0AAA4] text-sm leading-none">↓</div>
            <PipelineRow label="Middle" text={take.pipeline.middle} />
            <div className="ml-[92px] text-[#B0AAA4] text-sm leading-none">↓</div>
            <PipelineRow label="High" text={take.pipeline.high} />
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  )
}

// ── Inline pipeline (compact, shown below the Scout Take link) ────────────────

function InlinePipeline({ townId }: { townId: string }) {
  const take = SCOUT_TAKES[townId]
  if (!take) return null

  return (
    <div className="bg-white border border-[#E8E5E1] rounded-xl px-4 py-3 mb-6">
      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-2">
        📍 Your Default Pipeline
      </p>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <span className="text-[10px] font-mono font-bold text-[#9B9690] uppercase tracking-wider shrink-0 w-20 mt-0.5">
            Elementary
          </span>
          <span className="text-xs text-[#3D3A36] leading-snug">{take.pipeline.elementary}</span>
        </div>
        <div className="ml-[84px] text-[#B0AAA4] text-xs leading-none">↓</div>
        <div className="flex gap-2">
          <span className="text-[10px] font-mono font-bold text-[#9B9690] uppercase tracking-wider shrink-0 w-20 mt-0.5">
            Middle
          </span>
          <span className="text-xs text-[#3D3A36] leading-snug">{take.pipeline.middle}</span>
        </div>
        <div className="ml-[84px] text-[#B0AAA4] text-xs leading-none">↓</div>
        <div className="flex gap-2">
          <span className="text-[10px] font-mono font-bold text-[#9B9690] uppercase tracking-wider shrink-0 w-20 mt-0.5">
            High
          </span>
          <span className="text-xs text-[#3D3A36] leading-snug">{take.pipeline.high}</span>
        </div>
      </div>
    </div>
  )
}

// ── Onboarding Modal ──────────────────────────────────────────────────────────

function OnboardingModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[200]" onClick={onDismiss} />
      <div className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[#5B9A6F]/10 rounded-full flex items-center justify-center shrink-0">
              <span className="text-xl">🏫</span>
            </div>
            <h2 className="font-serif text-2xl text-[#1A1A2E]">Welcome to EarlyScouts</h2>
          </div>
          <p className="text-sm text-[#6E6A65] mb-5">Here&apos;s how to explore LA schools:</p>
          <ul className="flex flex-col gap-3 mb-6">
            {[
              'Select your neighborhood to see schools in your area',
              'Search by school name or ZIP code',
              "Tap Scout's Take for our neighborhood overview",
              'Browse transfer guides for enrollment help',
            ].map(item => (
              <li key={item} className="flex gap-3 text-sm text-[#3D3A36]">
                <span className="w-5 h-5 rounded-full bg-[#5B9A6F]/10 text-[#5B9A6F] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
          <button
            onClick={onDismiss}
            className="w-full bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Got it →
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SchoolsDiscovery({ allSchools }: { allSchools: School[] }) {
  const router = useRouter()
  const metro = DEFAULT_METRO
  const metroConfig = METROS[metro]

  const [activeAreas, setActiveAreas] = useState<Set<string>>(new Set())
  const [expandedRegion, setExpandedRegion] = useState<string | null>(null)
  const [zipInput, setZipInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])
  const [zipNotCovered, setZipNotCovered] = useState(false)
  const [showScoutModal, setShowScoutModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const regionScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollRegionLeft, setCanScrollRegionLeft] = useState(false)
  const [canScrollRegionRight, setCanScrollRegionRight] = useState(false)

  // Read URL on mount + check onboarding + detect mobile
  useEffect(() => {
    const ids = readAreasFromUrl()
    if (ids.length > 0) setActiveAreas(new Set(ids))
    try {
      if (!localStorage.getItem('schoolsOnboarded')) setShowOnboarding(true)
    } catch {}
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Region scroll arrows: check after render and whenever regionChips changes
  useEffect(() => {
    const el = regionScrollRef.current
    if (!el) return
    const update = () => {
      setCanScrollRegionLeft(el.scrollLeft > 8)
      setCanScrollRegionRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    return () => el.removeEventListener('scroll', update)
  })

  // Browser back/forward
  useEffect(() => {
    function onPopState() {
      const ids = readAreasFromUrl()
      setActiveAreas(ids.length > 0 ? new Set(ids) : new Set())
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Persist to sessionStorage for back-nav
  useEffect(() => {
    try {
      const val = Array.from(activeAreas).join(',')
      if (val) sessionStorage.setItem('schoolsFilter', val)
      else sessionStorage.removeItem('schoolsFilter')
    } catch {}
  }, [activeAreas])

  // School name search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const q = searchQuery.toLowerCase()
    setSearchResults(
      allSchools
        .filter(s => s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q))
        .slice(0, 8)
    )
  }, [searchQuery, allSchools])

  // Mobile ZIP auto-search: trigger after 500ms debounce when 5 digits entered
  useEffect(() => {
    if (!isMobile) return
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip)) return
    const timer = setTimeout(() => {
      const town = ZIP_TO_TOWN[zip]
      if (town) {
        selectSingleArea(town)
        const hood = getNeighborhoodById(town)
        if (hood) setExpandedRegion(hood.region)
      } else {
        setZipNotCovered(true)
      }
    }, 500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zipInput, isMobile])

  // ── Actions ──────────────────────────────────────────────────────────────

  function dismissOnboarding() {
    try { localStorage.setItem('schoolsOnboarded', 'true') } catch {}
    setShowOnboarding(false)
  }

  function selectSingleArea(id: string) {
    const next = new Set([id])
    setActiveAreas(next)
    setShowScoutModal(false)
    setZipInput('')
    setZipNotCovered(false)
    window.history.pushState({}, '', `/schools?metro=${metro}&area=${id}`)
  }

  function toggleArea(id: string) {
    setShowScoutModal(false)
    setActiveAreas(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      const areaStr = Array.from(next).join(',')
      window.history.pushState(
        {},
        '',
        next.size > 0 ? `/schools?metro=${metro}&area=${areaStr}` : `/schools?metro=${metro}`
      )
      return next
    })
  }

  function toggleRegion(region: string) {
    setExpandedRegion(prev => prev === region ? null : region)
  }

  function handleZipKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip)) return
    const town = ZIP_TO_TOWN[zip]
    if (town) {
      selectSingleArea(town)
      const hood = getNeighborhoodById(town)
      if (hood) setExpandedRegion(hood.region)
    } else {
      setZipNotCovered(true)
    }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const activeAreaIds = Array.from(activeAreas)
  const singleArea = activeAreaIds.length === 1 ? activeAreaIds[0] : null
  const showScoutTakeLink = singleArea != null && Boolean(SCOUT_TAKES[singleArea])
  const showPipeline = singleArea != null && Boolean(SCOUT_TAKES[singleArea])

  const schoolsBySlug = new Map(allSchools.map(s => [s.slug, s]))

  // Categorize schools for active areas
  const { publicElementary, charterPrivate, middleHigh, guides } = (() => {
    const privateSlugSet = new Set(activeAreaIds.flatMap(id => getNeighborhoodById(id)?.privateSlugs ?? []))
    const elementarySlugs = activeAreaIds.flatMap(id => getNeighborhoodById(id)?.elementarySlugs ?? [])
    const middleSlugs = activeAreaIds.flatMap(id => getNeighborhoodById(id)?.middleSlugs ?? [])
    const highSlugs = activeAreaIds.flatMap(id => getNeighborhoodById(id)?.highSlugs ?? [])
    const guideSlugs = activeAreaIds.flatMap(id => getNeighborhoodById(id)?.playbookSlugs ?? [])

    const pubElem: School[] = []
    const charPriv: School[] = []
    const charPrivSlugs = new Set<string>()
    const midHigh: School[] = []
    const midHighSlugs = new Set<string>()
    const guideList: School[] = []
    const guideSlugsSet = new Set<string>()

    for (const slug of Array.from(new Set(elementarySlugs))) {
      const school = schoolsBySlug.get(slug)
      if (!school) continue
      if (privateSlugSet.has(slug) || isAlternativeSchool(school)) {
        if (!charPrivSlugs.has(slug)) { charPriv.push(school); charPrivSlugs.add(slug) }
      } else {
        pubElem.push(school)
      }
    }
    for (const slug of Array.from(privateSlugSet)) {
      const school = schoolsBySlug.get(slug)
      if (school && !charPrivSlugs.has(slug)) { charPriv.push(school); charPrivSlugs.add(slug) }
    }
    for (const slug of Array.from(new Set([...middleSlugs, ...highSlugs]))) {
      const school = schoolsBySlug.get(slug)
      if (school && !midHighSlugs.has(slug)) { midHigh.push(school); midHighSlugs.add(slug) }
    }
    for (const slug of Array.from(new Set(guideSlugs))) {
      const school = schoolsBySlug.get(slug)
      if (school && !guideSlugsSet.has(slug)) { guideList.push(school); guideSlugsSet.add(slug) }
    }

    const sort = (arr: School[]) => [...arr].sort((a, b) => a.name.localeCompare(b.name))
    return {
      publicElementary: sort(pubElem),
      charterPrivate: sort(charPriv),
      middleHigh: sort(midHigh),
      guides: sort(guideList),
    }
  })()

  // Region chip list (only towns with Scout Takes)
  const regionChips = metroConfig.regions
    .map(region => {
      const towns = Object.keys(SCOUT_TAKES)
        .filter(id => {
          const hood = getNeighborhoodById(id)
          return hood?.region === region && hood?.metro === metro
        })
        .map(id => ({ id, label: getNeighborhoodById(id)!.label }))
      return { region, towns }
    })
    .filter(r => r.towns.length > 0)

  const activeRegions = new Set(
    activeAreaIds
      .map(id => getNeighborhoodById(id)?.region)
      .filter((r): r is string => Boolean(r))
  )

  const hasResults =
    publicElementary.length > 0 ||
    charterPrivate.length > 0 ||
    middleHigh.length > 0 ||
    guides.length > 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#FFFAF6]">
      <Nav />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="px-4 pt-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-3xl text-[#1A1A2E]">Schools</h1>
        </div>
      </section>

      {/* ── Region + Town Selector ───────────────────────────────────────── */}
      <section className="px-4 pb-5">
        <div className="max-w-5xl mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-3">
            Select your area
          </p>

          {/* Region pills — horizontal scroll with desktop arrows */}
          <div className="relative">
            {/* Left arrow + fade */}
            {canScrollRegionLeft && (
              <div className="hidden md:flex absolute left-0 top-0 bottom-2 z-10 items-center">
                <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#FFFAF6] to-transparent pointer-events-none" />
                <button
                  onClick={() => regionScrollRef.current?.scrollBy({ left: -300, behavior: 'smooth' })}
                  className="relative z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[#D4D0CC] shadow-sm text-[#5B9A6F] hover:border-[#5B9A6F] transition-all"
                  aria-label="Scroll regions left"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="8 2 4 6 8 10" />
                  </svg>
                </button>
              </div>
            )}

            <div
              ref={regionScrollRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {regionChips.map(({ region }) => {
                const isActive = activeRegions.has(region)
                const isOpen = expandedRegion === region
                return (
                  <button
                    key={region}
                    onClick={() => toggleRegion(region)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white shadow-sm'
                        : 'bg-white border-[#E8E5E1] text-[#3D3A36] hover:border-[#5B9A6F] hover:text-[#5B9A6F]'
                    }`}
                  >
                    {region}
                    <svg
                      width="10" height="10" viewBox="0 0 10 10" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    >
                      <polyline points="2 3 5 7 8 3" />
                    </svg>
                  </button>
                )
              })}
              <div className="w-4 shrink-0" aria-hidden />
            </div>

            {/* Right arrow + fade */}
            {canScrollRegionRight && (
              <div className="hidden md:flex absolute right-0 top-0 bottom-2 z-10 items-center">
                <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#FFFAF6] to-transparent pointer-events-none" />
                <button
                  onClick={() => regionScrollRef.current?.scrollBy({ left: 300, behavior: 'smooth' })}
                  className="relative z-10 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-[#D4D0CC] shadow-sm text-[#5B9A6F] hover:border-[#5B9A6F] transition-all"
                  aria-label="Scroll regions right"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 2 8 6 4 10" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Town chips for expanded region — horizontal scroll */}
          {expandedRegion && (
            <div
              className="flex gap-2 overflow-x-auto pt-2 pb-2 scrollbar-hide"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              {regionChips.find(r => r.region === expandedRegion)?.towns.map(({ id, label }) => {
                const isActive = activeAreas.has(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleArea(id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white'
                        : 'bg-[#FAFAFA] border-[#D4D0CC] text-[#3D3A36] hover:border-[#5B9A6F]'
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          )}

          {/* Active area pills with × */}
          {activeAreas.size > 0 && (
            <div className="flex flex-wrap gap-2 items-center mt-2 mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9B9690]">Showing:</span>
              {activeAreaIds.map(id => {
                const hood = getNeighborhoodById(id)
                if (!hood) return null
                return (
                  <button
                    key={id}
                    onClick={() => toggleArea(id)}
                    className="flex items-center gap-1 bg-[#5B9A6F] text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#4a8a5e] transition-colors"
                  >
                    {hood.label}
                    <span className="ml-0.5 opacity-70 text-sm leading-none">×</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* ZIP + name search */}
          <div className="flex flex-col gap-1.5 mt-3">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder={isMobile ? 'ZIP code' : 'ZIP + Enter'}
                value={zipInput}
                onChange={e => { setZipInput(e.target.value); setZipNotCovered(false) }}
                onKeyDown={handleZipKey}
                className="w-32 border border-[#D4D0CC] rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] bg-white outline-none focus:border-[#5B9A6F] transition-colors"
              />
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search by school name"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setZipNotCovered(false) }}
                  onBlur={() => setTimeout(() => setSearchResults([]), 150)}
                  className="w-full border border-[#D4D0CC] rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] bg-white outline-none focus:border-[#5B9A6F] transition-colors"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E8E5E1] rounded-xl shadow-lg z-30 overflow-hidden">
                    {searchResults.map(s => (
                      <button
                        key={s.id}
                        onMouseDown={() => router.push(schoolHref(s.slug))}
                        className="w-full text-left px-4 py-3 hover:bg-[#F0FAF4] border-b border-[#F0EDE8] last:border-0 transition-colors"
                      >
                        <p className="text-sm font-medium text-[#1A1A2E]">{s.name}</p>
                        <p className="text-xs text-[#9B9690]">{s.city} · {s.zip}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {zipNotCovered && (
              <p className="text-xs text-[#9B9690]">
                We don&apos;t cover that area yet.{' '}
                <a href="mailto:hello@earlyscouts.com?subject=Coverage request" className="text-[#5B9A6F] hover:underline">
                  Email us to get notified.
                </a>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <section className="px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {activeAreas.size === 0 ? (
            <div className="text-center py-20">
              <p className="text-3xl mb-4">🗺️</p>
              <p className="font-serif text-xl text-[#1A1A2E] mb-2">Select an area above</p>
              <p className="text-sm text-[#9B9690]">
                Tap a region to expand neighborhoods, then choose your area.
              </p>
            </div>
          ) : (
            <>
              {/* Scout's Take compact link */}
              {showScoutTakeLink && (
                <button
                  onClick={() => setShowScoutModal(true)}
                  className="flex items-center gap-2 text-sm text-[#5B9A6F] font-medium mb-4 hover:text-[#4a8a5e] transition-colors text-left"
                >
                  <span className="shrink-0">🔭</span>
                  <span>
                    Scout&apos;s Take: {SCOUT_TAKES[singleArea!].title.replace("Scout's Take: ", '')}
                    {' '}— <span className="underline underline-offset-2">Start here</span> →
                  </span>
                </button>
              )}

              {/* Inline pipeline */}
              {showPipeline && <InlinePipeline townId={singleArea!} />}

              {/* School listings */}
              {hasResults ? (
                <>
                  <LevelRow
                    icon="🏫"
                    label="Elementary Schools"
                    color="text-[#5B9A6F]"
                    schools={publicElementary}
                  />
                  <LevelRow
                    icon="🎓"
                    label="Charter & Private Schools"
                    color="text-[#A78BCA]"
                    schools={charterPrivate}
                  />
                  <LevelRow
                    icon="📚"
                    label="Middle & High Schools"
                    color="text-[#6BB3D9]"
                    schools={middleHigh}
                  />
                  <LevelRow
                    icon="📋"
                    label="Transfer & Enrollment Guides"
                    color="text-[#F2945C]"
                    schools={guides}
                  />
                </>
              ) : (
                <div className="text-center py-16 text-[#9B9690]">
                  <p className="text-base">No deep-dive reports for this area yet.</p>
                  <p className="text-sm mt-1">Try Mar Vista, Santa Monica, or Culver City.</p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Guides nudge ─────────────────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="max-w-5xl mx-auto border-t border-[#E8E5E1] pt-8 text-center">
          <p className="text-sm text-[#6E6A65] mb-3">
            Looking to transfer districts? Our step-by-step guides cover every deadline and form.
          </p>
          <Link
            href="/guides"
            className="inline-block bg-white border-2 border-[#5B9A6F] text-[#5B9A6F] font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-[#5B9A6F] hover:text-white transition-colors"
          >
            Browse Transfer Guides →
          </Link>
        </div>
      </section>

      <Footer />

      {/* ── Scout Take modal ─────────────────────────────────────────────── */}
      {showScoutModal && singleArea && (
        <ScoutTakeModal townId={singleArea} onClose={() => setShowScoutModal(false)} />
      )}

      {/* ── Onboarding modal ─────────────────────────────────────────────── */}
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}
    </main>
  )
}
