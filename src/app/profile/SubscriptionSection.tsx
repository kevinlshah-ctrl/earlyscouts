'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth, getUserAccessLevel } from '@/lib/auth-context'

const TIER_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  full_access:    { label: 'Full Access',     desc: 'All school reports and guides, forever.',              color: '#5B9A6F' },
  legacy_premium: { label: 'Full Access',     desc: 'All school reports and guides (legacy subscription).', color: '#5B9A6F' },
  starter:        { label: 'Starter',         desc: '3 school reports + 1 guide.',                          color: '#F2945C' },
  free:           { label: 'Free',            desc: 'Scout Takes and previews only.',                       color: '#9B9690' },
}

export default function SubscriptionSection() {
  const { user, profile, unlockedSlugs, refreshProfile, refreshUnlocks } = useAuth()
  const [refreshing, setRefreshing] = useState(false)
  const [refreshed, setRefreshed]   = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    setRefreshed(false)
    try {
      await refreshProfile()
      await refreshUnlocks()
      setRefreshed(true)
    } finally {
      setRefreshing(false)
    }
  }

  if (!user) return null

  const accessLevel = getUserAccessLevel(profile)
  const tierInfo    = TIER_LABELS[accessLevel] ?? TIER_LABELS.free

  const schoolsUsed    = unlockedSlugs.schools.length
  const guidesUsed     = unlockedSlugs.guides.length
  const schoolsRemain  = Math.max(0, 3 - schoolsUsed)
  const guidesRemain   = Math.max(0, 1 - guidesUsed)

  const isLegacy   = accessLevel === 'legacy_premium'
  const isStarter  = accessLevel === 'starter'
  const isFull     = accessLevel === 'full_access' || isLegacy
  const isFree     = accessLevel === 'free'

  return (
    <div className="rounded-xl border border-[#E8E5E1] p-5">
      <h3 className="font-semibold text-[#1A1A2E] mb-3">Your Plan</h3>

      {/* Tier badge */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
          style={{ background: `${tierInfo.color}18`, color: tierInfo.color }}
        >
          {tierInfo.label}
        </span>
      </div>
      <p className="text-sm text-[#636E72] mb-4">{tierInfo.desc}</p>

      {/* Starter unlock counter */}
      {isStarter && (
        <div className="bg-[#FFFAF6] border border-[#E8E5E1] rounded-xl p-4 mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#3D3A36] font-medium">School reports</span>
            <span className="font-mono text-[#5B9A6F]">{schoolsUsed} / 3 used</span>
          </div>
          <div className="w-full bg-[#E8E5E1] rounded-full h-1.5">
            <div className="bg-[#5B9A6F] h-1.5 rounded-full transition-all" style={{ width: `${(schoolsUsed / 3) * 100}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[#3D3A36] font-medium">Transfer guides</span>
            <span className="font-mono text-[#5B9A6F]">{guidesUsed} / 1 used</span>
          </div>
          <div className="w-full bg-[#E8E5E1] rounded-full h-1.5">
            <div className="bg-[#5B9A6F] h-1.5 rounded-full transition-all" style={{ width: `${guidesUsed * 100}%` }} />
          </div>
          {schoolsRemain === 0 && guidesRemain === 0 && (
            <p className="text-xs text-[#9B9690] mt-1">All unlocks used. Upgrade for full access.</p>
          )}
        </div>
      )}

      {/* Actions */}
      {isFull && (
        <p className="text-sm text-[#5B9A6F] font-medium mb-4">
          You have full access to all current and future content.
        </p>
      )}

      {isFree && (
        <div className="flex flex-col gap-2 mb-4">
          <Link
            href="/pricing"
            className="inline-block bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-colors text-center"
          >
            Get Full Access — $24.99
          </Link>
        </div>
      )}

      {isStarter && (
        <Link
          href="/pricing"
          className="inline-block bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-colors"
        >
          Upgrade to Full Access · $24.99
        </Link>
      )}

      {/* Manage subscription (legacy only) */}
      {isLegacy && (
        <div className="mt-4 pt-4 border-t border-[#F0EDE8]">
          <p className="text-xs text-[#9B9690] mb-2">Legacy subscription — manage billing below.</p>
          <a
            href="/api/stripe/portal"
            className="text-xs text-[#5B9A6F] hover:underline font-medium"
          >
            Manage Subscription →
          </a>
        </div>
      )}

      {/* Refresh status — self-serve recovery if a webhook lands late or the
          browser is showing a cached (pre-payment) plan. Re-fetches from the DB. */}
      <div className="mt-4 pt-4 border-t border-[#F0EDE8] flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="text-xs font-medium text-[#5B9A6F] hover:underline disabled:opacity-60 disabled:no-underline"
        >
          {refreshing ? 'Refreshing…' : 'Refresh status'}
        </button>
        {!isFull && !refreshing && (
          <span className="text-[11px] text-[#9B9690]">Just paid? Refresh if your plan looks out of date.</span>
        )}
        {refreshed && !refreshing && (
          <span className="text-[11px] text-[#5B9A6F]">Updated ✓</span>
        )}
      </div>
    </div>
  )
}
