'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'

const PWD_REQS = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter',    test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 lowercase letter',    test: (p: string) => /[a-z]/.test(p) },
]

export default function SignInPage() {
  const router = useRouter()
  const { user, signInWithPassword } = useAuth()

  const [mode,            setMode]            = useState<'signin' | 'signup'>('signin')
  const [email,           setEmail]           = useState('')
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPwd,         setShowPwd]         = useState(false)
  const [showConfirmPwd,  setShowConfirmPwd]  = useState(false)
  const [pwdTouched,      setPwdTouched]      = useState(false)
  const [submitting,      setSubmitting]      = useState(false)
  const [errorMsg,        setErrorMsg]        = useState('')
  const [forgotSent,      setForgotSent]      = useState(false)

  // If already signed in, redirect
  useEffect(() => {
    if (user) router.replace('/profile')
  }, [user, router])

  // Persist ?next for post-auth redirect
  useEffect(() => {
    try {
      const next = new URLSearchParams(window.location.search).get('next')
      if (next) sessionStorage.setItem('authReturnTo', next)
    } catch {}
  }, [])

  function getNextPath() {
    try { return sessionStorage.getItem('authReturnTo') ?? '/schools' } catch { return '/schools' }
  }

  const pwdChecks    = PWD_REQS.map(r => ({ ...r, met: r.test(password) }))
  const allPwdMet    = pwdChecks.every(c => c.met)
  const confirmMatch = password === confirmPassword && confirmPassword.length > 0

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    setPassword('')
    setConfirmPassword('')
    setPwdTouched(false)
    setShowPwd(false)
    setShowConfirmPwd(false)
    setErrorMsg('')
    setForgotSent(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    if (mode === 'signin') {
      const { error } = await signInWithPassword(email, password)
      if (error) {
        setErrorMsg(error)
        setSubmitting(false)
      } else {
        try { sessionStorage.removeItem('authReturnTo') } catch {}
        router.push(getNextPath())
      }
      return
    }

    // ── Sign up ──
    if (!allPwdMet) { setErrorMsg('Password does not meet all requirements.'); setSubmitting(false); return }
    if (!confirmMatch) { setErrorMsg('Passwords do not match.'); setSubmitting(false); return }

    const supabase = getBrowserClient()
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email:    email.trim().toLowerCase(),
      password,
    })
    if (signUpErr) { setErrorMsg(signUpErr.message); setSubmitting(false); return }
    if (!data.user || !data.session) {
      setErrorMsg('Account created — please check your email to confirm, then sign in.')
      setSubmitting(false)
      return
    }
    // Defensive upsert — idempotent if DB trigger already created the row
    await supabase.from('user_profiles').upsert({
      id:        data.user.id,
      email:     data.user.email ?? email.trim().toLowerCase(),
      plan_type: 'free',
    })
    // New account → send to pricing to choose a plan
    router.push('/pricing')
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setErrorMsg('Enter your email address above first.'); return }
    const supabase   = getBrowserClient()
    const redirectTo = `${window.location.origin}/auth/callback?next=/auth/reset-password`
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo })
    setForgotSent(true)
    setErrorMsg('')
  }

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-charcoal ' +
    'outline-none focus:border-scout-green transition-colors bg-white'

  return (
    <main>
      <Nav />

      <section className="bg-cream min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full">

          {/* Header */}
          <div className="text-center mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-peach">Account Access</span>
            <h1 className="font-serif text-4xl text-charcoal mt-3 mb-3">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              {mode === 'signin'
                ? 'Enter your email and password to access your account.'
                : 'Create a free account to start exploring LA schools.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex rounded-full border border-gray-200 p-1 mb-6 bg-white">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'signin'
                  ? 'bg-scout-green text-white'
                  : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-scout-green text-white'
                  : 'text-gray-500 hover:text-charcoal'
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Email */}
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className={inputCls}
            />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setPwdTouched(true) }}
                  placeholder="Password"
                  required
                  className={`${inputCls} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Requirements checklist — signup only, after first keystroke */}
              {mode === 'signup' && pwdTouched && (
                <ul className="flex flex-col gap-1 pl-0.5">
                  {pwdChecks.map(({ label, met }) => (
                    <li key={label} className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-scout-green' : 'text-gray-400'}`}>
                      <span className="w-3 text-center shrink-0">{met ? '✓' : '○'}</span>
                      {label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Confirm password — signup only */}
            {mode === 'signup' && (
              <div className="flex flex-col gap-1">
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    required
                    className={`${inputCls} pr-12 ${
                      confirmPassword.length > 0 && !confirmMatch
                        ? 'border-red-300 focus:border-red-400'
                        : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-charcoal transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirmPwd ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !confirmMatch && (
                  <p className="text-xs text-red-400 pl-0.5">Passwords don&apos;t match</p>
                )}
              </div>
            )}

            {errorMsg   && <p className="text-xs text-red-500">{errorMsg}</p>}
            {forgotSent && <p className="text-xs text-scout-green">Check your email for a password reset link.</p>}

            <button
              type="submit"
              disabled={
                submitting ||
                !email.trim() ||
                !password ||
                (mode === 'signup' && (!allPwdMet || !confirmMatch))
              }
              className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-full transition-colors"
            >
              {submitting
                ? (mode === 'signin' ? 'Signing in…' : 'Creating account…')
                : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>

            {/* Forgot password — sign in only */}
            {mode === 'signin' && (
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-center text-gray-400 hover:text-scout-green transition-colors"
              >
                Forgot password?
              </button>
            )}
          </form>

        </div>
      </section>

      <Footer />
    </main>
  )
}
