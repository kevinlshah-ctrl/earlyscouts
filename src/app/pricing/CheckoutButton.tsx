'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Props {
  tier: 'premium' | 'extended'
  label: string
  className: string
  loadingLabel?: string
  next?: string
}

// ── Shared checkout helper ────────────────────────────────────────────────────
async function runCheckout(tier: 'premium' | 'extended', token: string): Promise<string | null> {
  try {
    const res = await fetch('/api/checkout', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ tier }),
    })
    const data: { url?: string; error?: string } = await res.json()
    if (data.url) { window.location.href = data.url; return null }
    return data.error ?? 'Payment unavailable — please try again or contact hello@earlyscouts.com'
  } catch {
    return 'Payment unavailable — please try again or contact hello@earlyscouts.com'
  }
}

// ── Auth modal (email + password only) ───────────────────────────────────────
function AuthModal({
  tier,
  onClose,
}: {
  tier: 'premium' | 'extended'
  onClose: () => void
}) {
  const [mode,       setMode]       = useState<'signup' | 'signin'>('signup')
  const [email,      setEmail]      = useState('')
  const [password,   setPassword]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)

  const inputCls =
    'w-full border border-[#E8E5E1] rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] ' +
    'placeholder-[#9B9690] bg-white outline-none focus:border-[#5B9A6F] transition-colors'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getBrowserClient()

    if (mode === 'signup') {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email:    email.trim().toLowerCase(),
        password,
      })
      if (signUpErr) { setError(signUpErr.message); setLoading(false); return }
      if (!data.user || !data.session) {
        setError('Account created — please check your email to confirm, then return to complete your purchase.')
        setLoading(false)
        return
      }
      // Defensive upsert — idempotent if DB trigger already created the row
      await supabase.from('user_profiles').upsert({
        id:        data.user.id,
        email:     data.user.email ?? email.trim().toLowerCase(),
        plan_type: 'free',
      })
      const err = await runCheckout(tier, data.session.access_token)
      if (err) { setError(err); setLoading(false) }
      // On success, runCheckout navigates away — leave spinner
    } else {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email:    email.trim().toLowerCase(),
        password,
      })
      if (signInErr) { setError(signInErr.message); setLoading(false); return }
      if (!data.session) {
        setError('Sign-in succeeded but no session — please try again.')
        setLoading(false)
        return
      }
      const err = await runCheckout(tier, data.session.access_token)
      if (err) { setError(err); setLoading(false) }
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Enter your email address above first.'); return }
    const supabase = getBrowserClient()
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    setForgotSent(true)
    setError(null)
  }

  function switchMode(next: 'signup' | 'signin') {
    setMode(next)
    setError(null)
    setForgotSent(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-[200]" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed inset-0 z-[201] flex items-center justify-center px-4">
        <div
          className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-xl text-[#1A1A2E]">
              {mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-[#9B9690] hover:text-[#1A1A2E] text-2xl leading-none px-1"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoFocus
              className={inputCls}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              className={inputCls}
            />

            {error      && <p className="text-xs text-red-500">{error}</p>}
            {forgotSent && <p className="text-xs text-[#5B9A6F]">Check your email for a reset link.</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#5B9A6F] hover:bg-[#4a8a5e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-colors"
            >
              {loading
                ? 'Setting up…'
                : mode === 'signup'
                  ? 'Create Account & Continue →'
                  : 'Sign In & Continue →'}
            </button>
          </form>

          {/* Mode switcher + forgot */}
          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              className="text-xs text-[#5B9A6F] hover:underline"
            >
              {mode === 'signup' ? 'Already have an account? Sign in →' : '← Create an account'}
            </button>
            {mode === 'signin' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-[#9B9690] hover:text-[#6E6A65] transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function CheckoutButton({
  tier,
  label,
  className,
  loadingLabel = 'Loading…',
}: Props) {
  const { user, session } = useAuth()
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [modalOpen,  setModalOpen]  = useState(false)

  async function handleClick() {
    if (!user) {
      // Not logged in — open auth modal
      setModalOpen(true)
      return
    }
    // Logged in — go straight to Stripe
    setError(null)
    setLoading(true)
    const err = await runCheckout(tier, session?.access_token ?? '')
    if (err) { setError(err); setLoading(false) }
    // On success, runCheckout navigates away
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <button
          onClick={handleClick}
          disabled={loading}
          className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          {loading ? loadingLabel : label}
        </button>

        {error && (
          <p className={`text-xs text-center ${tier === 'premium' ? 'text-red-300' : 'text-red-500'}`}>
            {error}
          </p>
        )}
      </div>

      {modalOpen && (
        <AuthModal tier={tier} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}
