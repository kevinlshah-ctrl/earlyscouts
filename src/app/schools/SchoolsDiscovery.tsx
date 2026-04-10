'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

// ── ZIP → neighborhood mapping ────────────────────────────────────────────────
const ZIP_TO_NEIGHBORHOOD: Record<string, string[]> = {
  '90066': ['mar-vista', 'playa-vista'],
  '90034': ['palms'],
  '90230': ['culver-city'],
  '90401': ['santa-monica'],
  '90402': ['santa-monica'],
  '90403': ['santa-monica'],
  '90404': ['santa-monica'],
  '90405': ['santa-monica'],
  '90045': ['playa-vista'],
  '90292': ['playa-vista'],
  '90094': ['playa-vista'],
  '90291': ['venice'],
  '90064': ['palms'],
  '90293': ['playa-vista'],
  '90254': ['hermosa-beach'],
  '90266': ['manhattan-beach'],
  '90277': ['redondo-beach'],
  '90278': ['redondo-beach'],
  '90245': ['el-segundo'],
  '90027': ['hollywood-hills'],
  '90028': ['hollywood-hills'],
  '90046': ['hollywood-hills'],
  '90068': ['hollywood-hills'],
  '90039': ['silver-lake', 'atwater-village'],
  '90065': ['atwater-village'],
  '90041': ['eagle-rock'],
  '90042': ['eagle-rock'],
  '90030': ['south-pasadena'],
}

// ── Playbook descriptions ─────────────────────────────────────────────────────
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
  'la-charter-magnet-school-choice-playbook':
    'Decoding the two systems most parents confuse: the LAUSD Magnet Priority Points system and independent charter school lotteries.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isGuideSlug(slug: string): boolean {
  return slug.includes('playbook') || slug.includes('blueprint')
}

function schoolHref(slug: string): string {
  return isGuideSlug(slug) ? `/guides/${slug}` : `/schools/${slug}`
}

function getRegionForNeighborhood(id: string): string | null {
  return NEIGHBORHOOD_SCHOOLS[id]?.region ?? null
}

function readNeighborhoodsFromUrl(): string[] {
  if (typeof window === 'undefined') return []
  const q = new URLSearchParams(window.location.search).get('q')
  if (!q) return []
  return q.split(',').filter(id => getNeighborhoodById(id) != null)
}

function getInitialNeighborhoods(): Set<string> {
  const fromUrl = readNeighborhoodsFromUrl()
  return fromUrl.length > 0 ? new Set(fromUrl) : new Set<string>()
}

function getRegionsForNeighborhoods(ids: Set<string>): Set<string> {
  const regions = new Set<string>()
  ids.forEach(id => { const r = getRegionForNeighborhood(id); if (r) regions.add(r) })
  return regions
}

/** Count distinct school-report schools for a region (deduplicated). */
function getSchoolCountForRegion(region: string, allSchools: School[]): number {
  const hoods = getNeighborhoodsByRegion(region)
  const slugSet = new Set(hoods.flatMap(h => [...h.elementarySlugs, ...h.middleSlugs, ...h.highSlugs]))
  return allSchools.filter(s => slugSet.has(s.slug)).length
}

// ── Onboarding modal ──────────────────────────────────────────────────────────
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
          <p className="text-sm text-[#6E6A65] mb-5">Here's how to explore LA Westside schools:</p>
          <ul className="flex flex-col gap-3 mb-6">
            {[
              'Select your neighborhood to see every school we cover',
              'Search by school name or ZIP code',
              'Browse our transfer guides for step-by-step enrollment help',
            ].map(item => (
              <li key={item} className="flex gap-3 text-sm text-[#3D3A36]">
                <span className="w-5 h-5 rounded-full bg-[#5B9A6F]/12 text-[#5B9A6F] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">✓</span>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function SchoolsDiscovery({ allSchools }: { allSchools: School[] }) {
  const router = useRouter()

  const [activeNeighborhoods, setActiveNeighborhoods] = useState<Set<string>>(getInitialNeighborhoods)
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(() => {
    const fromUrl = readNeighborhoodsFromUrl()
    return fromUrl.length > 0 ? getRegionsForNeighborhoods(new Set(fromUrl)) : new Set()
  })
  const [searchQuery, setSearchQuery]   = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])
  const [zipNotCovered, setZipNotCovered] = useState(false)
  const [showModal, setShowModal]         = useState(false)

  // Show onboarding modal on first visit
  useEffect(() => {
    try { if (!localStorage.getItem('schoolsOnboarded')) setShowModal(true) } catch {}
  }, [])

  function dismissModal() {
    try { localStorage.setItem('schoolsOnboarded', 'true') } catch {}
    setShowModal(false)
  }

  // Read ?q= on mount (SSR-safe: useState initializer runs with window=undefined)
  useEffect(() => {
    const ids = readNeighborhoodsFromUrl()
    if (ids.length === 0) return
    const newSet = new Set(ids)
    setActiveNeighborhoods(newSet)
    setExpandedRegions(getRegionsForNeighborhoods(newSet))
  }, [])

  // Persist filter to sessionStorage for school-report back navigation
  useEffect(() => {
    try {
      const val = Array.from(activeNeighborhoods).join(',')
      if (val) sessionStorage.setItem('schoolsFilter', val)
      else sessionStorage.removeItem('schoolsFilter')
    } catch {}
  }, [activeNeighborhoods])

  // Browser back/forward
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

  // School name search
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    const q = searchQuery.toLowerCase()
    setSearchResults(
      allSchools.filter(s =>
        s.name.toLowerCase().includes(q) || s.zip.includes(q) || s.city.toLowerCase().includes(q)
      ).slice(0, 8)
    )
  }, [searchQuery, allSchools])

  // ── Actions ──────────────────────────────────────────────────────────────

  function applyNeighborhoods(ids: string[]) {
    const newSet = new Set(ids.filter(id => getNeighborhoodById(id) != null))
    if (newSet.size === 0) return
    setActiveNeighborhoods(newSet)
    setExpandedRegions(getRegionsForNeighborhoods(newSet))
    window.history.pushState({}, '', `/schools?q=${Array.from(newSet).join(',')}`)
  }

  function handleSearchChange(val: string) {
    setSearchQuery(val)
    setZipNotCovered(false)

    // ZIP detection: 5 digits → auto-select neighborhood(s)
    if (/^\d{5}$/.test(val.trim())) {
      const hoods = ZIP_TO_NEIGHBORHOOD[val.trim()]
      if (hoods?.length) {
        applyNeighborhoods(hoods)
        setSearchQuery('')
      } else {
        setZipNotCovered(true)
      }
    }
  }

  function toggleNeighborhood(id: string) {
    setActiveNeighborhoods(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      window.history.pushState({}, '', next.size > 0 ? `/schools?q=${Array.from(next).join(',')}` : '/schools')
      return next
    })
  }

  function toggleRegion(region: string) {
    setExpandedRegions(prev => {
      const next = new Set(prev)
      if (next.has(region)) next.delete(region); else next.add(region)
      return next
    })
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const activeHoods = Array.from(activeNeighborhoods)
    .map(id => getNeighborhoodById(id))
    .filter((h): h is NonNullable<typeof h> => h != null)

  const bracketSchools = allSchools.filter(s =>
    new Set(activeHoods.flatMap(h => [...h.elementarySlugs, ...h.middleSlugs, ...h.highSlugs])).has(s.slug)
  )
  const playbookSchools = allSchools.filter(s =>
    new Set(activeHoods.flatMap(h => h.playbookSlugs)).has(s.slug)
  )
  const privateSchools = (() => {
    const slugs = new Set(activeHoods.flatMap(h => h.privateSlugs ?? []))
    return slugs.size ? allSchools.filter(s => slugs.has(s.slug)) : []
  })()

  const firstHood     = activeHoods[0] ?? null
  const headerLabel   = activeNeighborhoods.size === 0 ? 'Schools'
    : activeNeighborhoods.size === 1 ? (firstHood?.label ?? 'Schools')
    : `${activeNeighborhoods.size} neighborhoods`
  const activeRegions = getRegionsForNeighborhoods(activeNeighborhoods)
  const regions       = getRegions()

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#FFFAF6]">
      <Nav />

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <section className="bg-[#FFFAF6] px-4 pt-8 pb-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-serif text-3xl text-[#1A1A2E]">{headerLabel}</h1>
          <p className="text-sm text-[#6E6A65] mt-1">
            Deep-dive reports from our research team. Tap any school for a preview.
          </p>
        </div>
      </section>

      {/* ── Neighborhood selector ────────────────────────────────────────── */}
      <section className="bg-[#FFFAF6] px-4 pb-6">
        <div className="max-w-5xl mx-auto">

          {/* Section label */}
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#5B9A6F] mb-3">
            Select your neighborhood
          </p>

          {/* Region pill buttons */}
          <div className="flex flex-wrap gap-2 mb-3">
            {regions.map(region => {
              const count    = getSchoolCountForRegion(region, allSchools)
              const isActive = activeRegions.has(region)
              const isOpen   = expandedRegions.has(region)
              return (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white shadow-sm'
                      : 'bg-white border-[#E8E5E1] text-[#3D3A36] hover:border-[#5B9A6F] hover:text-[#5B9A6F]'
                  }`}
                >
                  {region}
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#F0EDE8] text-[#9B9690]'
                  }`}>
                    {count}
                  </span>
                  <svg
                    width="9" height="9" viewBox="0 0 10 10" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="transition-transform duration-200"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  >
                    <polyline points="2 3 5 7 8 3" />
                  </svg>
                </button>
              )
            })}
          </div>

          {/* Neighborhood chips — shown when a region is expanded */}
          {regions.some(r => expandedRegions.has(r)) && (
            <div className="bg-white border border-[#E8E5E1] rounded-2xl p-4 mb-3">
              {regions.map(region => {
                if (!expandedRegions.has(region)) return null
                return (
                  <div key={region} className="mb-3 last:mb-0">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-[#B0AAA4] mb-2">
                      {region}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getNeighborhoodsByRegion(region).map(n => (
                        <button
                          key={n.id}
                          onClick={() => toggleNeighborhood(n.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                            activeNeighborhoods.has(n.id)
                              ? 'bg-[#5B9A6F] border-[#5B9A6F] text-white'
                              : 'bg-[#FAFAFA] border-[#D4D0CC] text-[#3D3A36] hover:border-[#5B9A6F]'
                          }`}
                        >
                          {n.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Active selection pills with ×  */}
          {activeNeighborhoods.size > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#9B9690]">Showing:</span>
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
          )}
        </div>
      </section>

      {/* ── Search + guides nudge (sticky) ──────────────────────────────── */}
      <div className="sticky top-16 bg-[#FFFAF6] border-b border-[#E8E5E1] z-10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-2">

          {/* Label */}
          <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#9B9690]">
            Or search by school name or ZIP code
          </p>

          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="e.g. 'Mar Vista Elementary' or '90066'"
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

          {/* ZIP not covered message */}
          {zipNotCovered && (
            <p className="text-xs text-[#9B9690]">
              We don&apos;t cover that ZIP yet — but we&apos;re expanding!{' '}
              <a href="mailto:hello@earlyscouts.com?subject=Coverage request" className="text-[#5B9A6F] hover:underline">
                Email us to get notified.
              </a>
            </p>
          )}

          {/* Guides nudge */}
          <p className="text-xs text-[#9B9690]">
            📋 Transferring districts?{' '}
            <Link href="/guides" className="text-[#5B9A6F] font-medium hover:underline">
              Our transfer guides walk you through every deadline and form →
            </Link>
          </p>
        </div>
      </div>

      {/* ── School results ───────────────────────────────────────────────── */}
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

      {/* ── Transfer playbooks ───────────────────────────────────────────── */}
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
                  className="bg-white border border-[#E8E5E1] rounded-xl p-4 hover:border-[#F2945C]/60 hover:shadow-sm transition-all"
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

      {/* ── Private schools ──────────────────────────────────────────────── */}
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

      {/* ── First-visit onboarding modal ─────────────────────────────────── */}
      {showModal && <OnboardingModal onDismiss={dismissModal} />}
    </main>
  )
}
