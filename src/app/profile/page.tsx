'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'
import type { School } from '@/lib/types'
import { rowToSchool, type SchoolRow } from '@/lib/supabase'

// ── Small card for a followed school ────────────────────────────────────────
function FollowedSchoolCard({
  school,
  onUnfollow,
}: {
  school: School
  onUnfollow: () => void
}) {
  const gs = school.ratings.greatSchools
  const isGuide =
    school.name.toLowerCase().includes('playbook') ||
    school.name.toLowerCase().includes('blueprint')
  const href = isGuide ? `/guides/${school.slug}` : `/schools/${school.slug}`

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <Link href={href} className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-charcoal leading-snug hover:text-scout-green transition-colors line-clamp-2">
            {school.name}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {school.district ? `${school.district} · ` : ''}
            {school.grades || 'Grades N/A'}
          </p>
        </Link>
        {gs !== null && gs > 0 && (
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
            gs >= 8 ? 'bg-scout-green/10 text-scout-green' :
            gs >= 6 ? 'bg-honey/10 text-honey' :
            'bg-peach/10 text-peach'
          }`}>
            {gs}/10
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 justify-between mt-auto">
        <Link
          href={href}
          className="text-xs font-semibold text-scout-green hover:underline"
        >
          View report →
        </Link>
        <button
          onClick={onUnfollow}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  )
}

// ── Delete account confirmation modal ───────────────────────────────────────
function DeleteModal({ onConfirm, onCancel, loading }: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const [typed, setTyped] = useState('')

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed z-50 inset-0 flex items-center justify-center px-4"
      >
        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
          <h3 className="font-serif text-xl text-charcoal mb-2">Delete account?</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            This permanently deletes your account, followed schools, and all
            preferences. This action cannot be undone.
          </p>
          <p className="text-xs text-gray-400 mb-2">
            Type <strong>DELETE</strong> to confirm:
          </p>
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-red-400 mb-4"
            placeholder="DELETE"
            autoFocus
          />
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-charcoal hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={typed !== 'DELETE' || loading}
              className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete forever'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main profile page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, signOut, toggleFollow, updateProfile, deleteAccount } = useAuth()

  const [followedSchools, setFollowedSchools] = useState<School[]>([])
  const [schoolsLoading, setSchoolsLoading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [displayNameEdit, setDisplayNameEdit] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'schools' | 'preferences' | 'account'>('schools')

  // Redirect if not logged in (after loading)
  useEffect(() => {
    if (!loading && !user) {
      router.replace('/signin')
    }
  }, [loading, user, router])

  // Set display name input when profile loads
  useEffect(() => {
    if (profile) setDisplayNameEdit(profile.display_name ?? '')
  }, [profile])

  // Fetch followed schools from Supabase
  const loadFollowedSchools = useCallback(async () => {
    if (!profile?.followed_schools.length) {
      setFollowedSchools([])
      return
    }
    setSchoolsLoading(true)
    try {
      const supabase = getBrowserClient()
      const { data } = await supabase
        .from('schools')
        .select('*')
        .in('slug', profile.followed_schools)
      if (data) {
        const ordered = profile.followed_schools
          .map(slug => (data as SchoolRow[]).find((r) => r.slug === slug))
          .filter((r): r is SchoolRow => r !== undefined)
          .map((r) => rowToSchool(r))
        setFollowedSchools(ordered)
      }
    } finally {
      setSchoolsLoading(false)
    }
  }, [profile?.followed_schools]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile) loadFollowedSchools()
  }, [profile, loadFollowedSchools])

  // ── Handlers ────────────────────────────────────────────────────────────
  async function handleUnfollow(slug: string) {
    await toggleFollow(slug)
    setFollowedSchools(prev => prev.filter(s => s.slug !== slug))
  }

  async function handleSaveName() {
    if (displayNameEdit.trim() === (profile?.display_name ?? '')) return
    setSavingName(true)
    await updateProfile({ display_name: displayNameEdit.trim() || null })
    setSavingName(false)
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    const { error } = await deleteAccount()
    setDeleteLoading(false)
    if (!error) {
      router.replace('/')
    }
  }

  async function handleStripePortal() {
    setStripeLoading(true)
    try {
      const { data: { session: s } } = await getBrowserClient().auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${s?.access_token}` },
      })
      const body = await res.json()
      if (body.url) window.location.href = body.url
    } finally {
      setStripeLoading(false)
    }
  }

  // ── Guard ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-scout-green border-t-transparent animate-spin" />
      </main>
    )
  }

  if (!user || !profile) return null

  const onboarding: Record<string, unknown> = (profile.onboarding_data ?? {}) as Record<string, unknown>
  const kids = Array.isArray((onboarding as any).kids) ? (onboarding as any).kids as Array<{ grade: string }> : []
  const priorities = Array.isArray((onboarding as any).priorities) ? (onboarding as any).priorities as string[] : []
  const tier = profile.subscription_tier

  return (
    <main className="min-h-screen bg-cream">
      <Nav />

      {/* Header */}
      <section className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-peach mb-1">My Account</p>
            <h1 className="font-serif text-2xl text-charcoal">
              {profile.display_name || user.email?.split('@')[0]}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-charcoal transition-colors"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100 sticky top-16 z-10">
        <div className="max-w-3xl mx-auto px-4 flex gap-0">
          {([
            { id: 'schools', label: `Saved Schools (${profile.followed_schools.length})` },
            { id: 'preferences', label: 'Preferences' },
            { id: 'account', label: 'Account' },
          ] as { id: typeof activeTab; label: string }[]).map(tab => (
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
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* ── TAB: Saved Schools ── */}
        {activeTab === 'schools' && (
          <div>
            {schoolsLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">Loading...</div>
            ) : followedSchools.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-3">🔖</p>
                <p className="text-base font-medium text-charcoal mb-1">No saved schools yet</p>
                <p className="text-sm text-gray-500 mb-5">
                  Click the bookmark icon on any school to save it here.
                </p>
                <Link
                  href="/schools"
                  className="inline-block bg-scout-green text-white text-sm font-semibold px-6 py-2.5 rounded-full"
                >
                  Browse Schools
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {followedSchools.map(school => (
                  <FollowedSchoolCard
                    key={school.slug}
                    school={school}
                    onUnfollow={() => handleUnfollow(school.slug)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Preferences ── */}
        {activeTab === 'preferences' && (
          <div className="flex flex-col gap-6">
            {/* Kids */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-charcoal mb-3">Kids</h2>
              {kids.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {kids.map((k, i) => (
                    <span key={i} className="text-xs font-mono bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
                      Child {i + 1}: {k.grade}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No kids added yet.</p>
              )}
            </div>

            {/* Priorities */}
            {priorities.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="font-semibold text-charcoal mb-3">Top Priorities</h2>
                <div className="flex flex-wrap gap-2">
                  {priorities.map((p: string) => (
                    <span key={p} className="text-xs font-mono bg-scout-green/10 text-scout-green px-3 py-1 rounded-full">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center">
              <Link
                href="/onboarding"
                className="inline-block border border-gray-200 text-sm font-medium text-charcoal px-6 py-2.5 rounded-full hover:border-scout-green hover:text-scout-green transition-colors"
              >
                Update Preferences in Onboarding →
              </Link>
            </div>
          </div>
        )}

        {/* ── TAB: Account ── */}
        {activeTab === 'account' && (
          <div className="flex flex-col gap-6">

            {/* Display name */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-semibold text-charcoal mb-3">Display Name</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={displayNameEdit}
                  onChange={e => setDisplayNameEdit(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-scout-green"
                  placeholder="Your name"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-5 py-2.5 bg-scout-green text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-scout-green-dark transition-colors"
                >
                  {savingName ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            {/* Subscription */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-1">
                <h2 className="font-semibold text-charcoal">Subscription</h2>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  tier === 'extended' ? 'bg-scout-green/10 text-scout-green' :
                  tier === 'premium'  ? 'bg-sky/10 text-sky' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {tier === 'extended' ? 'Extended' : tier === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                {tier === 'extended'
                  ? 'Full access with monthly updates and priority support.'
                  : tier === 'premium'
                  ? 'Full access to all school reports and guides.'
                  : 'Upgrade to unlock full deep-dive reports and transfer playbooks.'}
              </p>

              {tier === 'extended' ? (
                <button
                  onClick={handleStripePortal}
                  disabled={stripeLoading}
                  className="w-full py-2.5 border border-gray-200 rounded-full text-sm font-medium text-charcoal hover:border-scout-green transition-colors disabled:opacity-50"
                >
                  {stripeLoading ? 'Opening portal...' : 'Manage Subscription →'}
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="block w-full text-center py-2.5 bg-scout-green text-white text-sm font-semibold rounded-full hover:bg-scout-green-dark transition-colors"
                >
                  Upgrade for Full Access →
                </Link>
              )}
            </div>

            {/* Danger zone */}
            <div className="bg-white rounded-2xl border border-red-100 p-5">
              <h2 className="font-semibold text-charcoal mb-1">Danger Zone</h2>
              <p className="text-xs text-gray-400 mb-4">
                Permanently delete your account and all associated data.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                Delete my account
              </button>
            </div>

          </div>
        )}

      </div>

      {showDeleteModal && (
        <DeleteModal
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleteLoading}
        />
      )}

      <Footer />
    </main>
  )
}
