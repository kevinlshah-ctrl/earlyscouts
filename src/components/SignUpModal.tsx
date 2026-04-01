'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

interface Props {
  /** Optional school name shown as context ("Save Beethoven Elementary") */
  schoolName?: string
  /** Slug to auto-follow after auth — stored in localStorage until SIGNED_IN fires */
  pendingSlug?: string
  onClose: () => void
}

export default function SignUpModal({ schoolName, pendingSlug, onClose }: Props) {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Store pending follow so auth-context can process it after SIGNED_IN
  useEffect(() => {
    if (pendingSlug) {
      try { localStorage.setItem('pendingFollow', pendingSlug) } catch {}
    }
  }, [pendingSlug])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Save current path so auth callback can return here
  useEffect(() => {
    try {
      sessionStorage.setItem('authReturnTo', window.location.pathname + window.location.search)
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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create an account"
        className="fixed z-50 bottom-0 left-0 right-0 sm:inset-0 sm:flex sm:items-center sm:justify-center"
      >
        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl p-6 sm:p-8 animate-slide-up sm:animate-none">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-charcoal hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" />
              <line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>

          {status === 'sent' ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <h2 className="font-serif text-2xl text-charcoal mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                We sent a magic link to <strong>{email}</strong>.
                Click it to sign in — no password needed.
              </p>
              {pendingSlug && (
                <p className="text-xs text-scout-green mt-3 font-medium">
                  Your school will be saved automatically after you sign in.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <span className="text-xs font-mono uppercase tracking-widest text-peach">
                  {pendingSlug ? 'Save this school' : 'Create free account'}
                </span>
                <h2 className="font-serif text-2xl text-charcoal mt-1">
                  {schoolName
                    ? `Save ${schoolName} to your list`
                    : 'Create an account'}
                </h2>
                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                  Create a free account to save schools, track your research,
                  and get personalized recommendations.
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
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-charcoal outline-none focus:border-scout-green transition-colors"
                />

                {status === 'error' && (
                  <p className="text-xs text-red-500">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || !email.trim()}
                  className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full transition-colors"
                >
                  {status === 'sending' ? 'Sending...' : 'Send Magic Link'}
                </button>

                <p className="text-center text-xs text-gray-400">
                  No password. No spam. Just a link to your inbox.
                </p>
              </form>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.28s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </>
  )
}
