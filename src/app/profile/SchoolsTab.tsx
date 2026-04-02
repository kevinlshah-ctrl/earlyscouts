'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getBrowserClient } from '@/lib/supabase-browser'
import { rowToSchool, type SchoolRow } from '@/lib/supabase'
import type { School } from '@/lib/types'

// ── Skeleton ─────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse flex flex-col gap-3">
      <div className="flex justify-between gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-4 bg-gray-100 rounded w-4/5" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
        </div>
        <div className="w-4 h-5 bg-gray-100 rounded shrink-0" />
      </div>
      <div className="h-3 bg-gray-100 rounded w-1/4" />
    </div>
  )
}

// ── School card ───────────────────────────────────────────────────────────────

function SchoolCard({
  school,
  onUnfollow,
}: {
  school: School
  onUnfollow: () => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const gs = school.ratings.greatSchools
  const isGuide =
    school.name.toLowerCase().includes('playbook') ||
    school.name.toLowerCase().includes('blueprint')
  const href = isGuide ? `/guides/${school.slug}` : `/schools/${school.slug}`

  async function handleUnfollow() {
    setBusy(true)
    await onUnfollow()
    // parent removes card from list; component will unmount
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 hover:border-scout-green/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="flex-1 min-w-0 group">
          <p className="font-semibold text-sm text-charcoal leading-snug group-hover:text-scout-green transition-colors line-clamp-2">
            {school.name}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {[school.district, school.city].filter(Boolean).join(' · ')}
          </p>
          {school.grades && (
            <p className="text-xs text-gray-400">{school.grades}</p>
          )}
        </Link>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {gs !== null && gs > 0 && (
            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
              gs >= 8 ? 'bg-scout-green/10 text-scout-green' :
              gs >= 6 ? 'bg-honey/10 text-honey' :
                        'bg-peach/10 text-peach'
            }`}>
              {gs}/10
            </span>
          )}
          {/* Bookmark filled — click to unfollow */}
          <button
            onClick={handleUnfollow}
            disabled={busy}
            title="Remove saved school"
            className="text-scout-green hover:text-gray-300 transition-colors disabled:opacity-40 mt-0.5"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M5 3a2 2 0 0 0-2 2v16l8-4 8 4V5a2 2 0 0 0-2-2H5z" />
            </svg>
          </button>
        </div>
      </div>

      <Link href={href} className="text-xs font-semibold text-scout-green hover:underline">
        View report →
      </Link>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  followedSlugs: string[]
  onUnfollow: (slug: string) => Promise<void>
}

export default function SchoolsTab({ followedSlugs, onUnfollow }: Props) {
  const [schools, setSchools]   = useState<School[]>([])
  const [loading, setLoading]   = useState(false)

  // Re-fetch whenever the slug list changes
  useEffect(() => {
    if (followedSlugs.length === 0) {
      setSchools([])
      return
    }
    setLoading(true)
    getBrowserClient()
      .from('schools')
      .select('*')
      .in('slug', followedSlugs)
      .then(({ data }: { data: SchoolRow[] | null }) => {
        if (data) {
          // Preserve the follow order
          const ordered = followedSlugs
            .map(slug => data.find(r => r.slug === slug))
            .filter((r): r is SchoolRow => r !== undefined)
            .map(r => rowToSchool(r))
          setSchools(ordered)
        }
      })
      .finally(() => setLoading(false))
  }, [followedSlugs.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: Math.max(3, followedSlugs.length) }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (schools.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-scout-green/10 flex items-center justify-center">
          <svg
            width="22" height="22" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round"
            className="text-scout-green"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div className="max-w-xs">
          <p className="font-semibold text-charcoal mb-1">No schools saved yet.</p>
          <p className="text-sm text-gray-500 leading-relaxed">
            Browse schools and tap the bookmark icon to save them here.
          </p>
        </div>
        <Link
          href="/schools"
          className="inline-block bg-scout-green text-white text-sm font-semibold px-6 py-2.5 rounded-full hover:bg-scout-green-dark transition-colors"
        >
          Browse Schools →
        </Link>
      </div>
    )
  }

  // ── Grid ──────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {schools.map(school => (
        <SchoolCard
          key={school.slug}
          school={school}
          onUnfollow={() => onUnfollow(school.slug)}
        />
      ))}
    </div>
  )
}
