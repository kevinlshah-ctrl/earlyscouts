'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import SchoolBracket from '@/components/SchoolBracket'
import {
  getNeighborhoodById,
  getNeighborhoodsByRegion,
  getRegions,
  NEIGHBORHOOD_SCHOOLS,
} from '@/data/neighborhood-schools'
import type { School } from '@/lib/types'

const PLAYBOOK_DESCRIPTIONS: Record<string, string> = {
  'smmusd-transfer-playbook':
    'Every step for getting into Santa Monica-Malibu schools as an out-of-district family. Permit windows, priority tiers, and every deadline.',
  'ccusd-transfer-playbook':
    'Permit windows, priority tiers, and every deadline for transferring into Culver City Unified.',
  'lausd-school-choice-playbook':
    'Magnets, permits, charters: the complete LAUSD selection timeline decoded.',
  'beach-cities-school-choice-blueprint':
    'How to navigate open enrollment across Manhattan Beach, El Segundo, Hermosa, and Redondo unified school districts.',
  'hollywood-hills-school-choice-playbook':
    'School options for Hollywood Hills families: LAUSD magnet pathways, local public schools, and nearby private alternatives.',
}

/** Guide slugs live at /guides/[slug], not /schools/[slug] */
function isGuideSlug(slug: string): boolean {
  return slug.includes('playbook') || slug.includes('blueprint')
}

function schoolHref(slug: string): string {
  return isGuideSlug(slug) ? `/guides/${slug}` : `/schools/${slug}`
}

/** Find which region a neighborhood ID belongs to */
function getRegionForNeighborhood(id: string): string | null {
  return NEIGHBORHOOD_SCHOOLS[id]?.region ?? null
}

/** Read neighborhood IDs from URL query param ?q= (comma-separated) */
function readNeighborhoodsFromUrl(): string[] {
  if (typeof window === 'undefined') return []
  const q = new URLSearchParams(window.location.search).get('q')
  if (!q) return []
  return q.split(',').filter(id => getNeighborhoodById(id) != null)
}

/** Derive initial neighborhood set: URL first, then empty */
function getInitialNeighborhoods(): Set<string> {
  const fromUrl = readNeighborhoodsFromUrl()
  if (fromUrl.length > 0) return new Set(fromUrl)
  return new Set<string>()
}

/** Which regions contain at least one of the given neighborhood IDs */
function getRegionsForNeighborhoods(ids: Set<string>): Set<string> {
  const regions = new Set<string>()
  ids.forEach(id => {
    const r = getRegionForNeighborhood(id)
    if (r) regions.add(r)
  })
  return regions
}

export default function SchoolsDiscovery({ allSchools }: { allSchools: School[] }) {
  const router = useRouter()

  const [activeNeighborhoods, setActiveNeighborhoods] = useState<Set<string>>(getInitialNeighborhoods)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(() => {
    // Only expand regions when neighborhoods are explicitly set via URL param.
    // Default fallback (mar-vista) should not auto-expand Westside on fresh load.
    const fromUrl = readNeighborhoodsFromUrl()
    if (fromUrl.length > 0) return getRegionsForNeighborhoods(new Set(fromUrl))
    return new Set()
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])

  // Keep state in sync with browser back/forward navigation
  useEffect(() => {
    function onPopState() {
      const ids = readNeighborhoodsFromUrl()
      if (ids.length > 0) {
        const newSet = new Set(ids)
        setActiveNeighborhoods(newSet)
        setExpandedRegions(prev => new Set([...Array.from(prev), ...Array.from(getRegionsForNeighborhoods(newSet))]))
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Client-side search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const q = searchQuery.toLowerCase()
    setSearchResults(
      allSchools
        .filter(s =>
          s.name.toLowerCase().includes(q) ||
          s.zip.includes(q) ||
          s.city.toLowerCase().includes(q)
        )
        .slice(0, 7)
    )
  }, [searchQuery, allSchools])

  function toggleNeighborhood(id: string) {
    setActiveNeighborhoods(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      const qStr = next.size > 0 ? `/schools?q=${Array.from(next).join(',')}` : '/schools'
      window.history.pushState({}, '', qStr)
      return next
    })
  }

  function toggleRegion(region: string) {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region)
      else next.add(region)
      return next
    })
  }

  // Combine schools from all active neighborhoods
  const activeHoods = Array.from(activeNeighborhoods)
    .map(id => getNeighborhoodById(id))
    .filter((h): h is NonNullable<typeof h> => h != null)

  const allHoodSlugs = Array.from(new Set(activeHoods.flatMap(h => [
    ...h.elementarySlugs, ...h.middleSlugs, ...h.highSlugs,
  ])))
  const bracketSchools = allSchools.filter(s => allHoodSlugs.includes(s.slug))

  const allPlaybookSlugs = Array.from(new Set(activeHoods.flatMap(h => h.playbookSlugs)))
  const playbookSchools = allSchools.filter(s => allPlaybookSlugs.includes(s.slug))

  const allPrivateSlugs = Array.from(new Set(activeHoods.flatMap(h => h.privateSlugs ?? [])))
  const privateSchools = allPrivateSlugs.length
    ? allSchools.filter(s => allPrivateSlugs.includes(s.slug))
    : []

  const firstHood = activeHoods[0] ?? null
  const headerLabel = activeNeighborhoods.size === 0
    ? 'Schools'
    : activeNeighborhoods.size === 1
    ? firstHood?.label ?? 'Schools'
    : `${activeNeighborhoods.size} neighborhoods`

  const activeRegions = getRegionsForNeighborhoods(activeNeighborhoods)
  const regions = getRegions()

  return (
    <main className="min-h-screen bg-[#FFFAF6]">
      <Nav />

      {/* Page header */}
      <section className="bg-[#FFFAF6] px-4 pt-8 pb-3">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-3xl text-[#1A1A2E]">
            {headerLabel}
          </h1>
          <p className="text-sm text-[#6E6A65] mt-1">
            Deep-dive reports from our research team. Tap any school for a preview.
          </p>
        </div>
      </section>

      {/* Sticky selector bar */}
      <div className="sticky top-16 bg-[#FFFAF6] border-b border-[#E8E5E1] z-10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by school name or zip..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
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

          {/* Region-grouped chips — collapsed by default, expand on click */}
          {/* Mobile: each region stacks vertically; chips scroll horizontally */}
          {/* Desktop (lg+): all regions inline, chips wrap */}
          <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:gap-y-2">
            {regions.map((region, ri) => (
              <div
                key={region}
                className={`flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:gap-1.5 ${
                  ri > 0 ? 'mt-2 lg:mt-0 lg:ml-3 lg:pl-3 lg:border-l lg:border-[#E8E5E1]' : ''
                }`}
              >
                {/* Region toggle button */}
                <button
                  onClick={() => toggleRegion(region)}
                  className={`self-start flex items-center gap-0.5 text-[10px] font-mono uppercase tracking-widest lg:mr-1 whitespace-nowrap transition-colors ${
                    activeRegions.has(region) ? 'text-[#5B9A6F] font-bold' : 'text-[#B0AAA4] hover:text-[#6E6A65]'
                  }`}
                >
                  {region}
                  <svg
                    width="8" height="8" viewBox="0 0 10 10" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="ml-0.5 transition-transform"
                    style={{ transform: expandedRegions.has(region) ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="2 3 5 7 8 3" />
                  </svg>
                </button>
                {/* Neighborhood chips — only visible when region is expanded */}
                {/* Mobile: single scrollable row; Desktop: wrapping inline */}
                {expandedRegions.has(region) && (
                  <div className="flex flex-nowrap overflow-x-auto scrollbar-hide gap-1.5 pb-0.5 mt-1.5 lg:mt-0 lg:flex-wrap lg:overflow-visible lg:pb-0">
                    {getNeighborhoodsByRegion(region).map(n => (
                      <button
                        key={n.id}
                        onClick={() => toggleNeighborhood(n.id)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                          activeNeighborhoods.has(n.id)
                            ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white'
                            : 'bg-white border-[#D4D0CC] text-[#3D3A36] hover:border-[#5B9A6F]'
                        }`}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Selected neighborhood pills with X to deselect */}
      {activeNeighborhoods.size > 0 && (
        <div className="px-4 pt-4 pb-1">
          <div className="max-w-5xl mx-auto flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#9B9690] mr-1">Showing:</span>
            {Array.from(activeNeighborhoods).map(id => {
              const hood = getNeighborhoodById(id)
              if (!hood) return null
              return (
                <button
                  key={id}
                  onClick={() => toggleNeighborhood(id)}
                  className="flex items-center gap-1 bg-[#5B9A6F] text-white text-xs font-medium px-3 py-1.5 rounded-full hover:bg-[#4a8a5e] transition-colors"
                >
                  {hood.label}
                  <span className="ml-0.5 opacity-70 text-sm leading-none">×</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* School bracket */}
      <section className="px-4 py-6">
        <div className="max-w-5xl mx-auto">
          {activeNeighborhoods.size === 0 ? (
            <div className="text-center py-20">
              <p className="text-3xl mb-4">🗺️</p>
              <p className="font-serif text-xl text-[#1A1A2E] mb-2">Select a neighborhood above</p>
              <p className="text-sm text-[#9B9690]">Choose a region to see schools with analyst-written deep-dive reports.</p>
            </div>
          ) : bracketSchools.length > 0 ? (
            <SchoolBracket schools={bracketSchools} locationLabel={headerLabel} />
          ) : (
            <div className="text-center py-16 text-[#9B9690]">
              <p className="text-base">No deep-dive schools mapped to this neighborhood yet.</p>
              <p className="text-sm mt-1">Try Mar Vista, Santa Monica, or Culver City.</p>
            </div>
          )}
        </div>
      </section>

      {/* Transfer Playbooks — link to /guides/[slug] */}
      {playbookSchools.length > 0 && (
        <section className="px-4 pb-10">
          <div className="max-w-5xl mx-auto">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#F2945C] mb-3">
              📋 Transfer Playbooks
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {playbookSchools.map(pb => (
                <a
                  key={pb.id}
                  href={`/guides/${pb.slug}`}
                  className="bg-white border border-[#E8E5E1] rounded-xl p-4 hover:border-[#F2945C]/60 hover:shadow-sm transition-all group"
                >
                  <p className="font-semibold text-sm text-[#1A1A2E] mb-1">{pb.name}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#A09A94] mb-2">
                    {pb.reportData?.sections?.length ?? 0} chapters
                  </p>
                  <p className="text-xs text-[#6E6A65] leading-relaxed">
                    {PLAYBOOK_DESCRIPTIONS[pb.slug] ?? pb.keyInsight ?? 'A complete district transfer guide.'}
                  </p>
                  <p className="text-xs font-semibold text-[#F2945C] mt-3">Read Guide →</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Private Schools — link to /schools/[slug] (these are school reports, not guides) */}
      {privateSchools.length > 0 && (
        <section className="px-4 pb-12">
          <div className="max-w-5xl mx-auto">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#A78BCA] mb-3">
              📚 Private Schools
              <span className="ml-2 font-normal normal-case tracking-normal text-[#C4BFB9]">
                {privateSchools.length} with reports
              </span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {privateSchools.map(ps => (
                <a
                  key={ps.id}
                  href={`/schools/${ps.slug}`}
                  className="bg-white border border-[#E8E5E1] rounded-xl p-4 hover:border-[#A78BCA]/60 hover:shadow-sm transition-all"
                >
                  <p className="font-semibold text-sm text-[#1A1A2E] mb-1">{ps.name}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-[#A09A94] mb-2">
                    {ps.grades} · Private
                  </p>
                  {ps.keyInsight && (
                    <p className="text-xs text-[#6E6A65] leading-relaxed">{ps.keyInsight}</p>
                  )}
                  <p className="text-xs font-semibold text-[#A78BCA] mt-3">Read Report →</p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  )
}
