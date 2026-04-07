'use client'

import { useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { School, ReportSection } from '@/lib/types'

function getScoutTake(sections: ReportSection[]): string | null {
  for (const section of sections) {
    for (const block of section.content) {
      if (block.type === 'callout' && (block as any).label === 'Scout Take') {
        return (block as any).text
      }
    }
  }
  return null
}

interface SchoolPreviewModalProps {
  school: School | null
  onClose: () => void
}

export default function SchoolPreviewModal({ school, onClose }: SchoolPreviewModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (school) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [school, handleKeyDown])

  if (!school) return null

  const reportData = school.reportData
  const sections = reportData?.sections || []
  const scoutTake = getScoutTake(sections)
  const generatedAt = reportData?.generated_at || school.lastUpdated
  const quickStats = reportData?.quick_stats || []
  const isGuide = school.enrollment === 0 || school.grades === ''

  // Rating color
  const ratingColor =
    (school.ratings.greatSchools || 0) >= 8 ? 'bg-scout-green/10 text-scout-green'
    : (school.ratings.greatSchools || 0) >= 6 ? 'bg-honey/10 text-honey'
    : 'bg-peach/10 text-peach'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[998] transition-opacity"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-[999] max-h-[80vh] overflow-y-auto bg-white rounded-t-2xl shadow-2xl animate-slide-up">
        <div className="max-w-lg mx-auto px-5 py-5">

          {/* Drag handle */}
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="font-serif text-xl text-charcoal leading-snug">{school.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono text-gray-400">{school.district || school.type}</span>
                {school.ratings.greatSchools !== null && school.ratings.greatSchools > 0 && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ratingColor}`}>
                    {school.ratings.greatSchools}/10
                  </span>
                )}
                {school.grades && (
                  <span className="text-xs text-gray-400">{school.grades}</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-charcoal text-xl leading-none p-1 -mt-1"
              aria-label="Close"
            >
              &times;
            </button>
          </div>

          {/* Scout Take teaser (FREE) */}
          {scoutTake && (
            <div className="bg-[#E8F5EC] border border-[#5B9A6F]/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-xs font-mono uppercase tracking-widest text-[#5B9A6F] mb-1.5">Scout Take</p>
              <p className="text-sm text-charcoal leading-relaxed">
                {scoutTake.length > 350 ? scoutTake.slice(0, 350) + '...' : scoutTake}
              </p>
            </div>
          )}

          {/* Quick Stats (FREE) */}
          {quickStats.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {quickStats.slice(0, 4).map((stat, i) => (
                <div key={i} className="bg-cream rounded-lg px-3 py-2 text-center">
                  <p className="text-lg font-bold text-charcoal">{stat.value}</p>
                  <p className="text-xs text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <Link
            href={isGuide ? `/guides/${school.slug}` : `/schools/${school.slug}`}
            className="block w-full text-center bg-scout-green hover:bg-scout-green-dark text-white text-sm font-semibold py-3.5 rounded-xl transition-colors mb-2"
          >
            {isGuide ? 'Read Full Guide →' : 'Read Report →'}
          </Link>
          {!isGuide && (
            <p className="text-xs text-gray-400 text-center mb-1">
              First 2 sections free · Full access $34.99
            </p>
          )}
        </div>
      </div>

      {/* Slide-up animation */}
      <style jsx global>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
