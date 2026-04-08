'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useAuth, type UserProfile } from '@/lib/auth-context'

interface Props {
  profile: UserProfile
  onPortalClick: () => Promise<void>
  portalLoading: boolean
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ children, green }: { children: React.ReactNode; green?: boolean }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
      green ? 'bg-scout-green/10 text-scout-green' : 'bg-gray-100 text-gray-500'
    }`}>
      {children}
    </span>
  )
}

function PortalButton({
  onClick,
  loading,
}: {
  onClick: () => Promise<void>
  loading: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3 border border-gray-200 rounded-full text-sm font-medium text-charcoal hover:border-scout-green hover:text-scout-green transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading && (
        <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {loading ? 'Opening portal…' : 'Manage Subscription →'}
    </button>
  )
}

export default function SubscriptionSection({ profile: propProfile, onPortalClick, portalLoading }: Props) {
  // Refresh profile from DB on mount so subscription state is always current.
  const { profile: authProfile, refreshProfile } = useAuth()
  useEffect(() => { refreshProfile() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Use freshly-fetched auth context profile when available, fall back to prop
  const profile   = authProfile ?? propProfile
  const tier      = profile.subscription_tier
  const status    = profile.subscription_status
  const expiresAt = profile.access_expires_at

  // ── Free ─────────────────────────────────────────────────────────────────
  if (tier === 'free') {
    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-charcoal">Your Plan</h2>
            <StatusBadge>Free Plan</StatusBadge>
          </div>

          <p className="text-sm text-gray-500 mb-5 leading-relaxed">
            You&rsquo;re on the free plan. Upgrade to unlock the full research suite.
          </p>

          <ul className="flex flex-col gap-2.5 mb-6">
            {[
              'Full deep-dive school reports (100+)',
              'Transfer playbooks with every deadline',
              'Side-by-side comparison tables',
              'Tour questions based on real parent feedback',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                <span className="mt-0.5 shrink-0 text-gray-300">✕</span>
                {item}
              </li>
            ))}
          </ul>

          <Link
            href="/pricing"
            className="block w-full text-center py-3 bg-scout-green text-white text-sm font-semibold rounded-full hover:bg-scout-green-dark transition-colors"
          >
            Upgrade to Premium for $59.99 →
          </Link>
        </div>
      </div>
    )
  }

  // ── Premium (one-time 30-day access) ─────────────────────────────────────
  if (tier === 'premium') {
    const expired = expiresAt ? new Date(expiresAt) < new Date() : false

    return (
      <div className="flex flex-col gap-4 max-w-xl">
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-charcoal">Your Plan</h2>
            <StatusBadge green={!expired}>
              {expired ? 'Premium (Expired)' : 'Premium'}
            </StatusBadge>
          </div>

          {expiresAt && (
            <div className={`text-sm mb-4 px-4 py-3 rounded-xl ${
              expired
                ? 'bg-red-50 text-red-600 border border-red-100'
                : 'bg-scout-green/5 text-scout-green border border-scout-green/20'
            }`}>
              {expired
                ? `Access expired on ${formatDate(expiresAt)}`
                : `Access until ${formatDate(expiresAt)}`}
            </div>
          )}

          <ul className="flex flex-col gap-2.5 mb-6">
            {[
              'All 100+ deep-dive school reports',
              'Transfer playbooks with every deadline',
              'Side-by-side comparison tables',
              'Tour questions based on real parent feedback',
            ].map(item => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-charcoal">
                <span className="mt-0.5 shrink-0 text-scout-green font-bold">✓</span>
                {item}
              </li>
            ))}
          </ul>

          {expired ? (
            <Link
              href="/pricing"
              className="block w-full text-center py-3 bg-scout-green text-white text-sm font-semibold rounded-full hover:bg-scout-green-dark transition-colors"
            >
              Renew Access →
            </Link>
          ) : (
            <>
              <PortalButton onClick={onPortalClick} loading={portalLoading} />
              <p className="text-xs text-gray-400 text-center mt-2">
                Cancel anytime — access continues until your period ends.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Extended (subscription) ───────────────────────────────────────────────
  const statusLabel =
    status === 'active'    ? 'Active' :
    status === 'trialing'  ? 'Trial' :
    status === 'past_due'  ? 'Past Due' :
    status === 'canceled'  ? 'Cancelled' :
    'Unknown'

  const statusGreen = status === 'active' || status === 'trialing'

  return (
    <div className="flex flex-col gap-4 max-w-xl">
      <div className="bg-white border border-gray-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-charcoal">Your Plan</h2>
          <StatusBadge green>Premium</StatusBadge>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-mono uppercase tracking-wider text-gray-400">Status</span>
          <StatusBadge green={statusGreen}>{statusLabel}</StatusBadge>
        </div>

        <ul className="flex flex-col gap-2.5 mb-6">
          {[
            'All 100+ deep-dive school reports',
            'Transfer playbooks with every deadline',
            'Continued full access after 3 days',
            'Follow up to 10 schools',
            'Monthly personalized update emails',
          ].map(item => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-charcoal">
              <span className="mt-0.5 shrink-0 text-scout-green font-bold">✓</span>
              {item}
            </li>
          ))}
        </ul>

        <PortalButton onClick={onPortalClick} loading={portalLoading} />
        <p className="text-xs text-gray-400 text-center mt-2">
          Cancel anytime — access continues until your period ends.
        </p>
      </div>
    </div>
  )
}
