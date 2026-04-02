'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

type Mode = 'password' | 'magic-link'
type Status = 'idle' | 'submitting' | 'sent' | 'error'

export default function SignInPage() {
  const router = useRouter()
  const { user, loading, signIn, signInWithPassword } = useAuth()

  const [mode,     setMode]     = useState<Mode>('password')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [status,   setStatus]   = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // Forgot-password sub-state (only relevant in password mode)
  const [forgotSent, setForgotSent] = useState(false)

  // If already signed in, redirect
  useEffect(() => {
    if (!loading && user) router.replace('/profile')
  }, [loading, user, router])

  // Persist ?next for post-auth redirect
  useEffect(() => {
    try {
      const next = new URLSearchParams(window.location.search).get('next')
      if (next) sessionStorage.setItem('authReturnTo', next)
    } catch {}
  }, [])

  function getNextPath() {
    try {
      return sessionStorage.getItem('authReturnTo') ?? '/schools'
    } catch {
      return '/schools'
    }
  }

  // ── Password sign-in ──────────────────────────────────────────────────────

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setStatus('submitting')
    setErrorMsg('')

    const { error } = await signInWithPassword(email, password)
    if (error) {
      setStatus('error')
      setErrorMsg(error)
    } else {
      try { sessionStorage.removeItem('authReturnTo') } catch {}
      router.push(getNextPath())
    }
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async function handleForgotPassword() {
    if (!email.trim()) {
      setStatus('error')
      setErrorMsg('Enter your email address above first.')
      return
    }
    const { getBrowserClient } = await import('@/lib/supabase-browser')
    const supabase = getBrowserClient()
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    setForgotSent(true)
    setStatus('idle')
    setErrorMsg('')
  }

  // ── Magic-link sign-in ────────────────────────────────────────────────────

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('submitting')
    setErrorMsg('')

    const { error } = await signIn(email)
    if (error) {
      setStatus('error')
      const isRateLimit = /rate.limit|too.many|wait.*minute|security.purpose/i.test(error)
      setErrorMsg(
        isRateLimit
          ? 'Please wait a few minutes before requesting another link.'
          : error
      )
    } else {
      setStatus('sent')
    }
  }

  // ── Loading splash ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-scout-green border-t-transparent animate-spin" />
      </main>
    )
  }

  // ── Magic-link sent confirmation ──────────────────────────────────────────

  if (mode === 'magic-link' && status === 'sent') {
    return (
      <main>
        <Nav />
        <section className="bg-cream min-h-[70vh] flex items-center justify-center px-4 py-20">
          <div className="max-w-sm w-full text-center">
            <div className="text-5xl mb-5">📬</div>
            <h1 className="font-serif text-3xl text-charcoal mb-3">Check your inbox</h1>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              We sent a magic sign-in link to <strong>{email}</strong>.
              Click it to access your account.
            </p>
            <button
              onClick={() => { setStatus('idle'); setEmail('') }}
              className="text-xs text-gray-400 hover:text-scout-green transition-colors"
            >
              Use a different email
            </button>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  // ── Main sign-in form ─────────────────────────────────────────────────────

  const inputCls =
    'w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-charcoal ' +
    'outline-none focus:border-scout-green transition-colors'

  return (
    <main>
      <Nav />

      <section className="bg-cream min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full">

          <div className="text-center mb-8">
            <span className="text-xs font-mono uppercase tracking-widest text-peach">Account Access</span>
            <h1 className="font-serif text-4xl text-charcoal mt-3 mb-3">Sign In</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              {mode === 'password'
                ? 'Enter your email and password to access your account.'
                : 'Enter your email and we\'ll send you a magic link.'}
            </p>
          </div>

          {mode === 'password' ? (
            /* ── Email + password form ── */
            <form onSubmit={handlePasswordSignIn} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
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

              {status === 'error' && (
                <p className="text-xs text-red-500">{errorMsg}</p>
              )}
              {forgotSent && (
                <p className="text-xs text-scout-green">Check your email for a password reset link.</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting' || !email.trim() || !password}
                className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-full transition-colors"
              >
                {status === 'submitting' ? 'Signing in…' : 'Sign In'}
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-center text-gray-400 hover:text-scout-green transition-colors"
              >
                Forgot password?
              </button>
            </form>
          ) : (
            /* ── Magic-link form ── */
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
                className={inputCls}
              />

              {status === 'error' && (
                <p className="text-xs text-red-500">{errorMsg}</p>
              )}

              <button
                type="submit"
                disabled={status === 'submitting' || !email.trim()}
                className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-full transition-colors"
              >
                {status === 'submitting' ? 'Sending…' : 'Send Magic Link'}
              </button>
            </form>
          )}

          {/* Toggle between modes */}
          <p className="text-center text-xs text-gray-400 mt-5">
            {mode === 'password' ? (
              <>
                Prefer a password-free login?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('magic-link'); setStatus('idle'); setErrorMsg('') }}
                  className="text-scout-green hover:underline"
                >
                  Send me a magic link instead
                </button>
              </>
            ) : (
              <>
                Have a password?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('password'); setStatus('idle'); setErrorMsg('') }}
                  className="text-scout-green hover:underline"
                >
                  Sign in with password
                </button>
              </>
            )}
          </p>

        </div>
      </section>

      <Footer />
    </main>
  )
}
