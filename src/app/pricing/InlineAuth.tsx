'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Props {
  tier: 'premium' | 'extended'
  next?: string
  /** Pass true when rendered inside a dark card (Premium) so text is legible. */
  dark?: boolean
}

const PWD_REQS = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter',      test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 lowercase letter',      test: (p: string) => /[a-z]/.test(p) },
  { label: '1 number',                test: (p: string) => /[0-9]/.test(p) },
  { label: '1 special character',     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

export default function InlineAuth({ tier, next, dark = false }: Props) {
  const router      = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<'signup' | 'signin'>('signup')

  // Shared fields (email is used in both modes)
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  // Signup-only fields
  const [confirmPassword, setConfirmPassword] = useState('')
  const [promoCode, setPromoCode] = useState<string>(() => {
    // Read synchronously so the field is pre-populated on first render
    try {
      const v = sessionStorage.getItem('pendingPromoCode')
      if (v) { sessionStorage.removeItem('pendingPromoCode'); return v }
    } catch {}
    return ''
  })
  const [phone, setPhone] = useState('')

  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [forgotSent, setForgotSent] = useState(false)

  // ── Password requirements ─────────────────────────────────────────────────
  const pwdChecks = PWD_REQS.map(r => ({ ...r, met: r.test(password) }))
  const allReqsMet = pwdChecks.every(c => c.met)

  // ── Shared helpers ────────────────────────────────────────────────────────

  async function goToCheckout(token: string) {
    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier,
          couponCode: promoCode.trim().toUpperCase() || undefined,
        }),
      })

      const data: { url?: string; error?: string } = await res.json()

      if (data.url) {
        window.location.href = data.url
        return // navigating away — leave loading spinner on
      }

      setError(data.error ?? 'Payment unavailable — please try again or contact hello@earlyscouts.com')
    } catch {
      setError('Payment unavailable — please try again or contact hello@earlyscouts.com')
    }
    setLoading(false)
  }

  // ── Signup handler ────────────────────────────────────────────────────────

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!allReqsMet) {
      setError('Password does not meet all requirements below.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = getBrowserClient()

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email:    email.trim().toLowerCase(),
      password,
    })

    if (signUpErr) {
      setError(signUpErr.message)
      setLoading(false)
      return
    }

    if (!data.user || !data.session) {
      // Should not happen when email confirmation is disabled, but handle gracefully
      setError('Account created — please check your email to confirm, then return to complete your purchase.')
      setLoading(false)
      return
    }

    // Save phone to user metadata if provided
    if (phone.trim()) {
      await supabase.auth.updateUser({ data: { phone: phone.trim() } })
    }

    // Defensive upsert — idempotent if DB trigger already created the row
    await supabase
      .from('user_profiles')
      .upsert({
        id:                data.user.id,
        email:             data.user.email ?? email.trim().toLowerCase(),
        plan_type: 'free',
      })

    await goToCheckout(data.session.access_token)
  }

  // ── Sign-in handler ───────────────────────────────────────────────────────

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = getBrowserClient()
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    })

    if (signInErr) {
      setError(signInErr.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setError('Sign-in succeeded but no session — please try again.')
      setLoading(false)
      return
    }

    // Go straight to checkout — InlineAuth only renders on the pricing page
    // when the user's intent is to purchase, so sign-in should complete that flow.
    await goToCheckout(data.session.access_token)
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError('Enter your email address above first.')
      return
    }
    const supabase = getBrowserClient()
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    setForgotSent(true)
    setError(null)
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  // Inputs always use white background so they're readable on any card color
  const inputCls =
    'w-full border border-[#E8E5E1] rounded-lg px-3 py-2.5 text-sm text-[#1A1A2E] ' +
    'placeholder-[#9B9690] bg-white outline-none focus:border-[#5B9A6F] transition-colors'

  const mutedText  = dark ? 'text-white/40'  : 'text-[#9B9690]'
  const accentText = dark ? 'text-[#7ECAB0]' : 'text-[#5B9A6F]'
  const errorText  = dark ? 'text-red-400'   : 'text-red-500'
  const successText = dark ? 'text-[#7ECAB0]' : 'text-[#5B9A6F]'

  // ── Render: signup ────────────────────────────────────────────────────────

  if (mode === 'signup') {
    return (
      <form onSubmit={handleSignup} className="flex flex-col gap-2.5">

        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoFocus
          className={inputCls}
        />

        {/* Password + live requirements checklist */}
        <div className="flex flex-col gap-1.5">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            className={inputCls}
          />
          {password.length > 0 && (
            <ul className="flex flex-col gap-0.5 pl-0.5">
              {pwdChecks.map(c => (
                <li
                  key={c.label}
                  className={`text-xs flex items-center gap-1.5 transition-colors ${
                    c.met ? successText : mutedText
                  }`}
                >
                  <span className="shrink-0 w-3 text-center">{c.met ? '✓' : '○'}</span>
                  {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          required
          className={inputCls}
        />

        {/* Promo code — always visible */}
        <input
          type="text"
          value={promoCode}
          onChange={e => setPromoCode(e.target.value.toUpperCase())}
          placeholder="Promo code (optional)"
          className={`${inputCls} uppercase tracking-widest`}
        />

        {/* Phone — optional */}
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Phone (optional — for account recovery only)"
          className={inputCls}
        />

        {error && <p className={`text-xs ${errorText}`}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#5B9A6F] hover:bg-[#4a8a5e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
        >
          {loading ? 'Setting up your account…' : 'Create Account & Continue to Payment'}
        </button>

        <p className={`text-xs text-center ${mutedText}`}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null) }}
            className={`${accentText} hover:underline`}
          >
            Sign in →
          </button>
        </p>

      </form>
    )
  }

  // ── Render: sign in ───────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSignin} className="flex flex-col gap-2.5">

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

      {error      && <p className={`text-xs ${errorText}`}>{error}</p>}
      {forgotSent && <p className={`text-xs ${successText}`}>Check your email for a reset link.</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#5B9A6F] hover:bg-[#4a8a5e] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign In'}
      </button>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleForgotPassword}
          className={`text-xs ${mutedText} hover:${accentText} transition-colors`}
        >
          Forgot password?
        </button>
        <button
          type="button"
          onClick={() => { setMode('signup'); setError(null); setForgotSent(false) }}
          className={`text-xs ${accentText} hover:underline`}
        >
          ← Create account
        </button>
      </div>

    </form>
  )
}
