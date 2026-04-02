'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSiteAuth } from '@/lib/site-guard'

export default function SiteAuthPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const { authenticate, isAuthenticated } = useSiteAuth()

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(false)
  const [shake,    setShake]    = useState(false)

  const from = searchParams.get('from') ?? '/'

  // Already authenticated — skip straight through
  useEffect(() => {
    if (isAuthenticated) router.replace(from)
  }, [isAuthenticated, from, router])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const ok = authenticate(password)
    if (ok) {
      router.replace(from)
    } else {
      setError(true)
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-3xl font-serif">
            <span className="text-white">Early</span>
            <span className="text-emerald-400">Scouts</span>
          </p>
          <p className="text-gray-400 text-sm mt-2">Private preview — enter your access code</p>
        </div>

        {/* Card */}
        <div className={`bg-white rounded-2xl shadow-2xl p-8 transition-all ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Access Code
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(false) }}
                placeholder="Enter your access code"
                autoFocus
                autoComplete="off"
                className={`w-full border rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${
                  error
                    ? 'border-red-400 focus:border-red-500 bg-red-50'
                    : 'border-gray-200 focus:border-emerald-500'
                }`}
              />
              {error && (
                <p className="text-xs text-red-500 mt-1.5">Incorrect access code. Please try again.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!password}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm"
            >
              Enter
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Need access?{' '}
          <a href="mailto:hello@earlyscouts.com" className="text-emerald-400 hover:underline">
            hello@earlyscouts.com
          </a>
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  )
}
