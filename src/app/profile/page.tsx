'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'
import SchoolsTab from './SchoolsTab'
import PreferencesTab from './PreferencesTab'
import SubscriptionSection from './SubscriptionSection'
import AccountTab from './AccountTab'

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'schools',      label: 'Your Schools'      },
  { id: 'preferences',  label: 'Preferences'        },
  { id: 'subscription', label: 'Subscription'       },
  { id: 'account',      label: 'Account'            },
] as const

type TabId = typeof TABS[number]['id']

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <main className="min-h-screen bg-cream">
      {/* Header skeleton */}
      <div className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-gray-100 shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 bg-gray-100 rounded w-24" />
            <div className="h-6 bg-gray-100 rounded w-40" />
            <div className="h-3 bg-gray-100 rounded w-32" />
          </div>
        </div>
      </div>
      {/* Tab bar skeleton */}
      <div className="bg-white border-b border-gray-100 px-4 py-0">
        <div className="max-w-3xl mx-auto flex gap-0 animate-pulse">
          {[120, 100, 110, 80].map((w, i) => (
            <div key={i} className="px-5 py-4">
              <div className="h-4 bg-gray-100 rounded" style={{ width: w }} />
            </div>
          ))}
        </div>
      </div>
      {/* Content skeleton */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-4 animate-pulse flex flex-col gap-3">
              <div className="h-4 bg-gray-100 rounded w-4/5" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

// ── Profile page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, signOut, toggleFollow, deleteAccount } = useAuth()

  const [activeTab,       setActiveTab]       = useState<TabId>('schools')
  const [followedSlugs,   setFollowedSlugs]   = useState<string[]>([])
  const [portalLoading,   setPortalLoading]   = useState(false)
  // After 3s, stop showing the skeleton even if profile hasn't loaded —
  // prevents infinite skeleton when user_profiles row is missing.
  const [timedOut,        setTimedOut]        = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [])

  // Redirect to sign in when not authenticated
  useEffect(() => {
    if (!loading && !user) router.replace('/signin')
  }, [loading, user, router])

  // Sync followed slugs from profile
  useEffect(() => {
    if (profile) setFollowedSlugs(profile.followed_schools)
  }, [profile?.followed_schools]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleUnfollow(slug: string) {
    // Optimistic: remove card immediately
    setFollowedSlugs(prev => prev.filter(s => s !== slug))
    await toggleFollow(slug)
  }

  async function handleStripePortal() {
    setPortalLoading(true)
    try {
      const { data: { session: s } } = await getBrowserClient().auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method:  'POST',
        headers: { Authorization: `Bearer ${s?.access_token}` },
      })
      const body = await res.json() as { url?: string }
      if (body.url) window.location.href = body.url
    } finally {
      setPortalLoading(false)
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  // Show skeleton only while auth initialises, or for up to 3s waiting for profile.
  // After timeout we render with whatever we have to avoid infinite skeleton.
  if ((loading || !user || !profile) && !timedOut) {
    return <PageSkeleton />
  }

  // Auth finished but no user — redirect is in-flight, render nothing
  if (!user) return null

  // Build a safe fallback for when the user_profiles row is missing
  const profile_ = profile ?? {
    id:                  user.id,
    email:               user.email ?? '',
    display_name:        null,
    followed_schools:    [] as string[],
    onboarding_data:     null,
    subscription_tier:   'free'  as const,
    subscription_status: null,
    access_expires_at:   null,
    stripe_customer_id:  null,
    preferences:         null,
    created_at:          '',
    updated_at:          '',
  }

  const initials = profile_.display_name
    ? profile_.display_name.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? '?'

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-cream">
      <Nav />

      {/* ── Profile header ── */}
      <section className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-scout-green/15 flex items-center justify-center shrink-0">
            <span className="text-scout-green font-bold text-sm tracking-wide">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono uppercase tracking-widest text-peach mb-0.5">My Account</p>
            <h1 className="font-serif text-2xl text-charcoal leading-tight">
              {profile_.display_name || user.email?.split('@')[0]}
            </h1>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-charcoal transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* ── Tab bar ── (sticky + horizontally scrollable on mobile) */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-3xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {TABS.map(tab => {
              const badge = tab.id === 'schools' && followedSlugs.length > 0
                ? followedSlugs.length
                : null
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-medium px-5 py-4 border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-scout-green text-scout-green'
                      : 'border-transparent text-gray-500 hover:text-charcoal'
                  }`}
                >
                  {tab.label}
                  {badge !== null && (
                    <span className="ml-1.5 text-[11px] bg-scout-green/10 text-scout-green px-1.5 py-0.5 rounded-full font-mono">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {activeTab === 'schools' && (
          <SchoolsTab
            followedSlugs={followedSlugs}
            onUnfollow={handleUnfollow}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesTab
            userId={user.id}
            initialPrefs={profile_.preferences}
          />
        )}

        {activeTab === 'subscription' && (
          <SubscriptionSection
            profile={profile_}
            onPortalClick={handleStripePortal}
            portalLoading={portalLoading}
          />
        )}

        {activeTab === 'account' && (
          <AccountTab
            user={user}
            profile={profile_}
            onDeleteAccount={deleteAccount}
            onStripePortal={handleStripePortal}
            stripePortalLoading={portalLoading}
          />
        )}

      </div>

      <Footer />
    </main>
  )
}
