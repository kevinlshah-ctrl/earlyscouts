'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

export default function SignInPage() {
  const router = useRouter()
  const { user, signInWithPassword } = useAuth()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg,   setErrorMsg]   = useState('')
  const [forgotSent, setForgotSent] = useState(false)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')
    const { error } = await signInWithPassword(email, password)
    if (error) {
      setErrorMsg(error)
      setSubmitting(false)
    } else {
      try { sessionStorage.removeItem('authReturnTo') } catch {}
      router.push(getNextPath())
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) { setErrorMsg('Enter your email address above first.'); return }
    const { getBrowserClient } = await import('@/lib/supabase-browser')
    const supabase = getBrowserClient()
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase())
    setForgotSent(true)
    setErrorMsg('')
  }

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
              Enter your email and password to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

            {errorMsg  && <p className="text-xs text-red-500">{errorMsg}</p>}
            {forgotSent && <p className="text-xs text-scout-green">Check your email for a password reset link.</p>}

            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-full transition-colors"
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-center text-gray-400 hover:text-scout-green transition-colors"
            >
              Forgot password?
            </button>
          </form>

        </div>
      </section>

      <Footer />
    </main>
  )
}
