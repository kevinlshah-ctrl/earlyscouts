'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import { useAuth } from '@/lib/auth-context'

export default function SignInPage() {
  const router = useRouter()
  const { user, loading, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // If already signed in, redirect
  useEffect(() => {
    if (!loading && user) router.replace('/profile')
  }, [loading, user, router])

  // Save current location for post-auth redirect
  useEffect(() => {
    try {
      const next = new URLSearchParams(window.location.search).get('next')
      if (next) sessionStorage.setItem('authReturnTo', next)
    } catch {}
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setErrorMsg('')

    const { error } = await signIn(email)
    if (error) {
      setStatus('error')
      setErrorMsg(error)
    } else {
      setStatus('sent')
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-scout-green border-t-transparent animate-spin" />
      </main>
    )
  }

  return (
    <main>
      <Nav />

      <section className="bg-cream min-h-[70vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-sm w-full">

          {status === 'sent' ? (
            <div className="text-center">
              <div className="text-5xl mb-5">📬</div>
              <h1 className="font-serif text-3xl text-charcoal mb-3">Check your inbox</h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-6">
                We sent a magic sign-in link to <strong>{email}</strong>.
                Click it to access your account — no password needed.
              </p>
              <button
                onClick={() => { setStatus('idle'); setEmail('') }}
                className="text-xs text-gray-400 hover:text-scout-green transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <span className="text-xs font-mono uppercase tracking-widest text-peach">Account Access</span>
                <h1 className="font-serif text-4xl text-charcoal mt-3 mb-3">Sign In</h1>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Enter your email and we&rsquo;ll send you a magic link. No password required.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3.5 text-sm text-charcoal outline-none focus:border-scout-green transition-colors"
                />

                {status === 'error' && (
                  <p className="text-xs text-red-500">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !email.trim()}
                  className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-full transition-colors"
                >
                  {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>

              <p className="text-center text-xs text-gray-400 mt-4">
                No account yet?{' '}
                <Link href="/onboarding" className="text-scout-green hover:underline">
                  Get started →
                </Link>
              </p>
            </>
          )}
        </div>
      </section>

      <Footer />
    </main>
  )
}
