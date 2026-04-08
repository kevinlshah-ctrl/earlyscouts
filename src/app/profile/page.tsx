'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'
import SubscriptionSection from './SubscriptionSection'

// ── Password requirements ─────────────────────────────────────────────────────

const PWD_REQS = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter',      test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 lowercase letter',      test: (p: string) => /[a-z]/.test(p) },
  { label: '1 number',                test: (p: string) => /[0-9]/.test(p) },
  { label: '1 special character',     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

function Card({ children, danger }: { children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl p-5 border ${danger ? 'border-red-100' : 'border-gray-100'}`}>
      {children}
    </div>
  )
}

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-charcoal ' +
  'outline-none focus:border-scout-green transition-colors bg-white'

// ── Delete modal ──────────────────────────────────────────────────────────────

function DeleteModal({
  onConfirm,
  onCancel,
  loading,
  error,
}: {
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error?: string | null
}) {
  return (
    <>
      {/* Backdrop — z-[200] so it sits above the sticky nav (z-50) */}
      <div
        className="fixed inset-0 bg-black/50 z-[200]"
        onClick={onCancel}
      />
      {/* Dialog — z-[201] so it's unambiguously above the backdrop on all browsers */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-[201] flex items-center justify-center px-4"
      >
        {/* stopPropagation prevents the backdrop's onClick from firing when the card is tapped */}
        <div
          className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <h3 className="font-serif text-xl text-charcoal mb-2">Delete your account?</h3>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            This will permanently delete your account and all data. This cannot be undone.
          </p>
          {error && (
            <p className="text-xs text-red-500 mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-full border border-gray-200 text-sm font-medium text-charcoal hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-2.5 rounded-full bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {loading ? 'Deleting…' : 'Yes, delete'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Profile page ──────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading, deleteAccount } = useAuth()

  const [timedOut, setTimedOut] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!loading && !user) router.replace('/signin')
  }, [loading, user, router])

  // ── Stripe portal ─────────────────────────────────────────────────────────
  const [portalLoading, setPortalLoading] = useState(false)
  async function handleStripePortal() {
    setPortalLoading(true)
    try {
      const { data: { session: s } } = await getBrowserClient().auth.getSession()
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${s?.access_token}` },
      })
      const body = await res.json() as { url?: string }
      if (body.url) window.location.href = body.url
    } finally {
      setPortalLoading(false)
    }
  }

  // ── Change password ───────────────────────────────────────────────────────
  const [newPwd,        setNewPwd]        = useState('')
  const [confirmPwd,    setConfirmPwd]    = useState('')
  const [showNewPwd,    setShowNewPwd]    = useState(false)
  const [showConfPwd,   setShowConfPwd]   = useState(false)
  const [pwdLoading,    setPwdLoading]    = useState(false)
  const [pwdSuccess,    setPwdSuccess]    = useState(false)
  const [pwdError,      setPwdError]      = useState<string | null>(null)

  const pwdChecks = PWD_REQS.map(r => ({ ...r, met: r.test(newPwd) }))
  const allPwdMet = pwdChecks.every(c => c.met)

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwdError(null)
    setPwdSuccess(false)
    if (!allPwdMet) { setPwdError('Password does not meet all requirements.'); return }
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }

    setPwdLoading(true)
    // Supabase session is already authenticated — call updateUser directly.
    // Re-authenticating with the current password is unnecessary and can cause
    // session conflicts; the active JWT already proves identity.
    const { error: updateErr } = await getBrowserClient().auth.updateUser({ password: newPwd })
    if (updateErr) {
      setPwdError('Could not update password. Please try again.')
    } else {
      setPwdSuccess(true)
      setNewPwd('')
      setConfirmPwd('')
    }
    setPwdLoading(false)
  }

  // ── Delete account ────────────────────────────────────────────────────────
  const [showDelete,    setShowDelete]    = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError,   setDeleteError]   = useState<string | null>(null)

  async function handleDeleteConfirm() {
    setDeleteLoading(true)
    setDeleteError(null)

    const timeout = new Promise<{ error: string }>(resolve =>
      setTimeout(() => resolve({ error: 'Request timed out — please try again.' }), 30_000)
    )

    const result = await Promise.race([deleteAccount(), timeout])

    if (result.error) {
      setDeleteError(result.error)
      setDeleteLoading(false)
      return
    }

    // deleteAccount signs out + clears auth state; redirect to home
    router.replace('/')
  }

  // ── Guards ────────────────────────────────────────────────────────────────
  if ((loading || !user || !profile) && !timedOut) {
    return (
      <main className="min-h-screen bg-cream animate-pulse">
        <div className="h-16 bg-white border-b border-gray-100" />
        <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100" />)}
        </div>
      </main>
    )
  }
  if (!user) return null

  const profile_ = profile ?? {
    id: user.id, email: user.email ?? '',
    display_name: null, followed_schools: [],
    onboarding_data: null, subscription_tier: 'free' as const,
    subscription_status: null, access_expires_at: null,
    stripe_customer_id: null, preferences: null,
    created_at: '', updated_at: '',
  }

  const initials = profile_.display_name
    ? profile_.display_name.slice(0, 2).toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <main className="min-h-screen bg-cream">
      <Nav />

      {/* Header */}
      <section className="bg-white border-b border-gray-100 px-4 py-6">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
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
            onClick={async () => { await getBrowserClient().auth.signOut(); router.push('/') }}
            className="text-xs text-gray-400 hover:text-charcoal transition-colors shrink-0"
          >
            Sign out
          </button>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">

        {/* Plan */}
        <SubscriptionSection
          profile={profile_}
          onPortalClick={handleStripePortal}
          portalLoading={portalLoading}
        />

        {/* Change password */}
        <Card>
          <h2 className="font-semibold text-charcoal mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  value={newPwd}
                  onChange={e => setNewPwd(e.target.value)}
                  placeholder="New password"
                  required
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                  tabIndex={-1}
                  aria-label={showNewPwd ? 'Hide password' : 'Show password'}
                >
                  {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPwd.length > 0 && (
                <ul className="flex flex-col gap-0.5 pl-0.5">
                  {pwdChecks.map(c => (
                    <li key={c.label} className={`text-xs flex items-center gap-1.5 transition-colors ${c.met ? 'text-scout-green' : 'text-gray-400'}`}>
                      <span className="w-3 text-center shrink-0">{c.met ? '✓' : '○'}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="relative">
              <input
                type={showConfPwd ? 'text' : 'password'}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder="Confirm new password"
                required
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                tabIndex={-1}
                aria-label={showConfPwd ? 'Hide password' : 'Show password'}
              >
                {showConfPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwdError   && <p className="text-xs text-red-500">{pwdError}</p>}
            {pwdSuccess && <p className="text-xs text-scout-green">Password updated successfully.</p>}
            <button
              type="submit"
              disabled={pwdLoading || !newPwd || !confirmPwd}
              className="py-2.5 bg-scout-green text-white text-sm font-semibold rounded-full disabled:opacity-50 hover:bg-scout-green-dark transition-colors flex items-center justify-center gap-2"
            >
              {pwdLoading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {pwdLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        </Card>

        {/* Delete account */}
        <Card danger>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-charcoal mb-0.5">Delete Account</h2>
              <p className="text-xs text-gray-400">Permanently remove your account and all data.</p>
            </div>
            <button
              onClick={() => setShowDelete(true)}
              className="text-xs text-red-400 hover:text-red-600 transition-colors font-medium px-3 py-2 -my-2 rounded-lg"
            >
              Delete and cancel my account
            </button>
          </div>
        </Card>

      </div>

      {showDelete && (
        <DeleteModal
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setShowDelete(false); setDeleteError(null) }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      <Footer />
    </main>
  )
}
