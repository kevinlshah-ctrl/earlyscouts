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

function readAreasFromUrl(): string[] {
  if (typeof window === 'undefined') return []
  const area = new URLSearchParams(window.location.search).get('area')
  if (!area) return []
  return area.split(',').filter(id => getNeighborhoodById(id) != null || SCOUT_TAKES[id] != null)
}

function fmtPct(val: number | null | undefined): string {
  if (!val) return '—'
  return `${Math.round(val)}%`
}

// ── Metro header ──────────────────────────────────────────────────────────────

function MetroLabel({ metro }: { metro: string }) {
  const metroList = Object.values(METROS)
  const label = METROS[metro]?.label ?? metro

  if (metroList.length <= 1) {
    return (
      <p className="text-xs text-[#5B9A6F] font-medium mb-4">
        📍 {label}
      </p>
    )
  }

  // Future: render active selector when 2+ metros
  return (
    <div className="flex gap-2 mb-4">
      {metroList.map(m => (
        <button
          key={m.id}
          className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
            m.id === metro
              ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white'
              : 'bg-white border-[#E8E5E1] text-[#3D3A36]'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ── Scout's Take card ─────────────────────────────────────────────────────────

function ScoutTakeCard({ townId }: { townId: string }) {
  const take = SCOUT_TAKES[townId]
  const [expanded, setExpanded] = useState(false)

  if (!take) return null

  const visibleParagraphs = expanded ? take.paragraphs : take.paragraphs.slice(0, 1)
  const hasMore = take.paragraphs.length > 1

  return (
    <div className="mb-6 rounded-2xl overflow-hidden border border-[#D4EEE0] bg-[#F7FBF8]" style={{ borderLeft: '4px solid #5B9A6F' }}>
      <div className="px-5 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🔭</span>
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F]">
            Scout's Take
          </p>
        </div>

        <h2 className="font-serif text-xl text-[#1A1A2E] mb-3">{take.title}</h2>

        {/* Paragraphs */}
        <div className="flex flex-col gap-3">
          {visibleParagraphs.map((p, i) => (
            <p key={i} className="text-sm text-[#3D3A36] leading-relaxed">{p}</p>
          ))}
        </div>

        {/* Read more toggle */}
        {hasMore && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-3 text-xs font-semibold text-[#5B9A6F] hover:text-[#4a8a5e] flex items-center gap-1 transition-colors"
          >
            {expanded ? 'Read less ▴' : 'Read more ▾'}
          </button>
        )}
      </div>

      {/* Pipeline */}
      <div className="border-t border-[#D4EEE0] px-5 py-4">
        <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-3">
          📍 Your Default Pipeline
        </p>
        <div className="flex flex-col gap-1.5">
          <PipelineRow label="Elementary" text={take.pipeline.elementary} />
          <div className="ml-2 text-[#B0AAA4] text-sm leading-none">↓</div>
          <PipelineRow label="Middle" text={take.pipeline.middle} />
          <div className="ml-2 text-[#B0AAA4] text-sm leading-none">↓</div>
          <PipelineRow label="High" text={take.pipeline.high} />
        </div>
      </div>
    </div>
  )
}

function PipelineRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-mono font-bold text-[#9B9690] uppercase tracking-wider mt-0.5 w-20 shrink-0">{label}</span>
      <span className="text-xs text-[#3D3A36] leading-snug">{text}</span>
    </div>
  )
}

// ── School card ───────────────────────────────────────────────────────────────

function SchoolCard({ school }: { school: School }) {
  const href = schoolHref(school.slug)
  const isGuide = isGuideSlug(school.slug)

  return (
    <a
      href={href}
      className="block bg-white border border-[#E8E5E1] rounded-xl p-4 hover:border-[#5B9A6F]/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <p className="font-semibold text-sm text-[#1A1A2E] leading-snug">{school.name}</p>
        {school.grades && (
          <span className="text-[10px] font-mono text-[#9B9690] whitespace-nowrap shrink-0 mt-0.5">
            {school.grades}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
        {school.district && (
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#5B9A6F] bg-[#5B9A6F]/8 px-1.5 py-0.5 rounded">
            {school.district}
          </span>
        )}
        {!isGuide && school.academics.mathProficiency ? (
          <>
            <span className="text-[11px] text-[#6E6A65]">
              Math {fmtPct(school.academics.mathProficiency)}
            </span>
            {school.academics.readingProficiency ? (
              <span className="text-[11px] text-[#6E6A65]">
                ELA {fmtPct(school.academics.readingProficiency)}
              </span>
            ) : null}
          </>
        ) : null}
        {school.ratings.greatSchools ? (
          <span className="text-[11px] text-[#6E6A65]">
            GS {school.ratings.greatSchools}/10
          </span>
        ) : null}
      </div>

      <p className="text-xs font-semibold text-[#5B9A6F]">
        {isGuide ? 'Read Guide →' : 'Read Deep Dive →'}
      </p>
    </a>
  )
}

// ── Playbook card ─────────────────────────────────────────────────────────────

const PLAYBOOK_DESCRIPTIONS: Record<string, string> = {
  'smmusd-transfer-playbook':
    'Every step for getting into Santa Monica-Malibu schools as an out-of-district family.',
  'ccusd-transfer-playbook':
    'Permit windows, priority tiers, and every deadline for transferring into Culver City Unified.',
  'lausd-school-choice-playbook':
    'Magnets, permits, charters: the complete LAUSD selection timeline decoded.',
  'beach-cities-school-choice-blueprint':
    'How to navigate open enrollment across Manhattan Beach, El Segundo, Hermosa, and Redondo.',
  'hollywood-hills-school-choice-playbook':
    'School options for Hollywood Hills families: LAUSD magnet pathways, local public schools, and nearby private alternatives.',
  'la-charter-magnet-school-choice-playbook':
    'Decoding the LAUSD Magnet Priority Points system and independent charter school lotteries.',
}

function PlaybookCard({ school }: { school: School }) {
  return (
    <a
      href={`/guides/${school.slug}`}
      className="block bg-white border border-[#E8E5E1] rounded-xl p-4 hover:border-[#F2945C]/50 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-sm mt-0.5">📋</span>
        <p className="font-semibold text-sm text-[#1A1A2E] leading-snug">{school.name}</p>
      </div>
      <p className="text-xs text-[#6E6A65] leading-relaxed mb-2 pl-6">
        {PLAYBOOK_DESCRIPTIONS[school.slug] ?? school.keyInsight ?? 'A complete district transfer guide.'}
      </p>
      <p className="text-xs font-semibold text-[#F2945C] pl-6">Read Guide →</p>
    </a>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SchoolsDiscovery({ allSchools }: { allSchools: School[] }) {
  const router = useRouter()
  const metro = DEFAULT_METRO
  const metroConfig = METROS[metro]

  const [activeAreas, setActiveAreas] = useState<Set<string>>(() => {
    // SSR-safe: window is undefined during initial render
    return new Set<string>()
  })
  const [zipInput, setZipInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])
  const [zipNotCovered, setZipNotCovered] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Read ?area= from URL on mount
  useEffect(() => {
    const ids = readAreasFromUrl()
    if (ids.length > 0) setActiveAreas(new Set(ids))
  }, [])

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
      allSchools.filter(s =>
        s.name.toLowerCase().includes(q) || s.city.toLowerCase().includes(q)
      ).slice(0, 8)
    )
  }, [searchQuery, allSchools])

  // ── Actions ──────────────────────────────────────────────────────────────

  function selectArea(id: string) {
    const next = new Set([id])
    setActiveAreas(next)
    window.history.pushState({}, '', `/schools?metro=${metro}&area=${id}`)
    setZipInput('')
    setZipNotCovered(false)
  }

  function toggleArea(id: string) {
    setActiveAreas(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      const areaStr = Array.from(next).join(',')
      window.history.pushState({}, '', next.size > 0 ? `/schools?metro=${metro}&area=${areaStr}` : `/schools?metro=${metro}`)
      return next
    })
  }

  function handleZipKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const zip = zipInput.trim()
    if (!/^\d{5}$/.test(zip)) return

    const town = ZIP_TO_TOWN[zip]
    if (town) {
      selectArea(town)
    } else {
      setZipNotCovered(true)
    }
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val)
    setZipNotCovered(false)
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const activeAreaIds = Array.from(activeAreas)
  const singleArea = activeAreaIds.length === 1 ? activeAreaIds[0] : null
  const showScoutTake = singleArea != null && SCOUT_TAKES[singleArea] != null

  // Schools in active areas (deduped)
  const allActiveSlugs = (() => {
    const elem = new Set<string>()
    const mid = new Set<string>()
    const high = new Set<string>()
    const guides = new Set<string>()
    const priv = new Set<string>()

    for (const id of activeAreaIds) {
      const hood = getNeighborhoodById(id)
      if (!hood) continue
      hood.elementarySlugs.forEach(s => elem.add(s))
      hood.middleSlugs.forEach(s => mid.add(s))
      hood.highSlugs.forEach(s => high.add(s))
      hood.playbookSlugs.forEach(s => guides.add(s))
      ;(hood.privateSlugs ?? []).forEach(s => priv.add(s))
    }

    return { elem, mid, high, guides, priv }
  })()

  const schoolsBySlug = new Map(allSchools.map(s => [s.slug, s]))

  function getSorted(slugSet: Set<string>): School[] {
    return Array.from(slugSet)
      .map(slug => schoolsBySlug.get(slug))
      .filter((s): s is School => s != null)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  const elementarySchools = getSorted(allActiveSlugs.elem)
  const middleSchools = getSorted(allActiveSlugs.mid)
  const highSchools = getSorted(allActiveSlugs.high)
  const guideSchools = getSorted(allActiveSlugs.guides)
  const privateSchools = getSorted(allActiveSlugs.priv)

  const totalSchools = elementarySchools.length + middleSchools.length + highSchools.length

  // ── Chip rows by region ───────────────────────────────────────────────────

  // Build the chip display: only show towns that have both a neighborhood entry AND a scout take
  const regionChips: { region: string; towns: { id: string; label: string }[] }[] = metroConfig.regions.map(region => {
    const towns = Object.keys(SCOUT_TAKES)
      .filter(id => {
        const hood = getNeighborhoodById(id)
        return hood?.region === region && hood?.metro === metro
      })
      .map(id => ({
        id,
        label: getNeighborhoodById(id)!.label,
      }))
    return { region, towns }
  }).filter(r => r.towns.length > 0)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#FFFAF6]">
      <Nav />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="bg-[#FFFAF6] px-4 pt-8 pb-2">
        <div className="max-w-3xl mx-auto">
          <MetroLabel metro={metro} />
          <h1 className="font-serif text-3xl text-[#1A1A2E]">Schools</h1>
        </div>
      </section>

      {/* ── Town Selector ────────────────────────────────────────────────── */}
      <section className="bg-[#FFFAF6] px-4 pt-5 pb-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-4">
            Select your area
          </p>

          {/* Region chip groups */}
          <div className="flex flex-col gap-4 mb-5">
            {regionChips.map(({ region, towns }) => (
              <div key={region}>
                <p className="text-[9px] font-mono uppercase tracking-widest text-[#B0AAA4] mb-2">
                  {region}
                </p>
                <div className="flex flex-wrap gap-2">
                  {towns.map(({ id, label }) => {
                    const isActive = activeAreas.has(id)
                    return (
                      <button
                        key={id}
                        onClick={() => toggleArea(id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                          isActive
                            ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white shadow-sm'
                            : 'bg-white border-[#D4D0CC] text-[#3D3A36] hover:border-[#5B9A6F] hover:text-[#5B9A6F]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* ZIP + name search */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="ZIP code"
                value={zipInput}
                onChange={e => { setZipInput(e.target.value); setZipNotCovered(false) }}
                onKeyDown={handleZipKey}
                className="w-28 border border-[#D4D0CC] rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] bg-white outline-none focus:border-[#5B9A6F] transition-colors"
              />
              <div className="relative flex-1">
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Search by school name"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
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
                <a
                  href="mailto:hello@earlyscouts.com?subject=Coverage request"
                  className="text-[#5B9A6F] hover:underline"
                >
                  Email us to get notified.
                </a>
              </p>
            )}

            <p className="text-[10px] text-[#B0AAA4]">
              Enter ZIP and press Enter to jump to your area
            </p>
          </div>
        </div>
      </section>

      {/* ── Content area ─────────────────────────────────────────────────── */}
      <section className="px-4 py-4">
        <div className="max-w-3xl mx-auto">

          {activeAreas.size === 0 ? (
            /* Empty state */
            <div className="text-center py-20">
              <p className="text-3xl mb-4">🗺️</p>
              <p className="font-serif text-xl text-[#1A1A2E] mb-2">Select an area above</p>
              <p className="text-sm text-[#9B9690]">
                Choose a neighborhood to see schools and our Scout&apos;s Take.
              </p>
            </div>
          ) : (
            <>
              {/* Scout's Take — single area only */}
              {showScoutTake && <ScoutTakeCard townId={singleArea!} />}

              {/* Multiple areas: show label */}
              {activeAreas.size > 1 && (
                <div className="flex flex-wrap gap-2 items-center mb-5">
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

              {totalSchools === 0 && guideSchools.length === 0 ? (
                <div className="text-center py-16 text-[#9B9690]">
                  <p className="text-base">No deep-dive schools mapped to this area yet.</p>
                  <p className="text-sm mt-1">Try Mar Vista, Santa Monica, or Culver City.</p>
                </div>
              ) : (
                <>
                  {/* Elementary Schools */}
                  {elementarySchools.length > 0 && (
                    <SchoolGroup
                      label="Elementary Schools"
                      schools={elementarySchools}
                      cardComponent={SchoolCard}
                      privateSchools={privateSchools}
                    />
                  )}

                  {/* Middle Schools */}
                  {middleSchools.length > 0 && (
                    <SchoolGroup
                      label="Middle Schools"
                      schools={middleSchools}
                      cardComponent={SchoolCard}
                    />
                  )}

                  {/* High Schools */}
                  {highSchools.length > 0 && (
                    <SchoolGroup
                      label="High Schools"
                      schools={highSchools}
                      cardComponent={SchoolCard}
                    />
                  )}

                  {/* Transfer & Enrollment Guides */}
                  {guideSchools.length > 0 && (
                    <div className="mb-8">
                      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F2945C] mb-3">
                        Transfer & Enrollment Guides
                      </p>
                      <div className="flex flex-col gap-2.5">
                        {guideSchools.map(s => (
                          <PlaybookCard key={s.id} school={s} />
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Guides nudge ─────────────────────────────────────────────────── */}
      {activeAreas.size === 0 && (
        <section className="px-4 pb-16">
          <div className="max-w-3xl mx-auto text-center">
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
      )}

      <Footer />
    </main>
  )
}

// ── School group ──────────────────────────────────────────────────────────────

function SchoolGroup({
  label,
  schools,
  cardComponent: Card,
  privateSchools,
}: {
  label: string
  schools: School[]
  cardComponent: React.ComponentType<{ school: School }>
  privateSchools?: School[]
}) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-3">
        {label}
      </p>
      <div className="flex flex-col gap-2.5">
        {schools.map(s => (
          <Card key={s.id} school={s} />
        ))}
      </div>

      {/* Private school alternatives within elementary group */}
      {privateSchools && privateSchools.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A78BCA] mb-2.5">
            Private School Alternatives
          </p>
          <div className="flex flex-col gap-2.5">
            {privateSchools.map(s => (
              <a
                key={s.id}
                href={`/schools/${s.slug}`}
                className="block bg-white border border-[#E8E5E1] rounded-xl p-4 hover:border-[#A78BCA]/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-semibold text-sm text-[#1A1A2E]">{s.name}</p>
                  {s.grades && (
                    <span className="text-[10px] font-mono text-[#9B9690] whitespace-nowrap shrink-0 mt-0.5">
                      {s.grades}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#A09A94] mb-2">Private</p>
                {s.keyInsight && (
                  <p className="text-xs text-[#6E6A65] leading-relaxed mb-2">{s.keyInsight}</p>
                )}
                <p className="text-xs font-semibold text-[#A78BCA]">Read Report →</p>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
