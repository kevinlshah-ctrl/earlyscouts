'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import SignUpModal from './SignUpModal'

interface Props {
  slug: string
  schoolName: string
  /**
   * compact — icon only, for school cards.
   * default — icon + label, for page headers.
   */
  compact?: boolean
  /**
   * dark — semi-transparent white styling for overlay on dark hero backgrounds.
   * default — white bg styling for light backgrounds.
   */
  variant?: 'default' | 'dark'
}

export default function FollowButton({
  slug,
  schoolName,
  compact = false,
  variant = 'default',
}: Props) {
  const { user, isFollowing, toggleFollow } = useAuth()
  const [pending, setPending] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const following = isFollowing(slug)

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation()
    e.preventDefault()

    if (!user) {
      setShowModal(true)
      return
    }

    setPending(true)
    await toggleFollow(slug)
    setPending(false)
  }

  // ── Bookmark icon ──────────────────────────────────────────────────────────
  const BookmarkIcon = (
    <svg
      width={compact ? 13 : 15}
      height={compact ? 13 : 15}
      viewBox="0 0 24 24"
      fill={following ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  )

  // ── Compact (icon-only) ─────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          disabled={pending}
          aria-label={following ? `Unsave ${schoolName}` : `Save ${schoolName}`}
          className={`
            w-7 h-7 flex items-center justify-center rounded-full border transition-all
            ${following
              ? 'bg-scout-green/10 border-scout-green/30 text-scout-green'
              : variant === 'dark'
              ? 'bg-white/15 border-white/25 text-white hover:bg-white/25'
              : 'bg-white border-gray-200 text-gray-400 hover:border-scout-green hover:text-scout-green hover:bg-scout-green/5'
            }
            ${pending ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {BookmarkIcon}
        </button>

        {showModal && (
          <SignUpModal
            schoolName={schoolName}
            pendingSlug={slug}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    )
  }

  // ── Default (icon + label) ─────────────────────────────────────────────────
  return (
    <>
      <button
        onClick={handleClick}
        disabled={pending}
        aria-label={following ? `Unsave ${schoolName}` : `Save ${schoolName}`}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all
          ${following
            ? 'bg-scout-green border-scout-green text-white hover:bg-scout-green-dark'
            : variant === 'dark'
            ? 'bg-white/15 border-white/30 text-white hover:bg-white/25'
            : 'bg-white border-gray-200 text-charcoal hover:border-scout-green hover:text-scout-green'
          }
          ${pending ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {BookmarkIcon}
        {following ? 'Saved' : 'Save'}
      </button>

      {showModal && (
        <SignUpModal
          schoolName={schoolName}
          pendingSlug={slug}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
