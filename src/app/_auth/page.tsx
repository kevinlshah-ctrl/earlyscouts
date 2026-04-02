'use client'

import { useState, useEffect, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const SITE_PASSWORD = 'VIPSCOUTACCESS'
const COOKIE_NAME   = 'vipscout_auth'
const STORAGE_KEY   = 'vipscout_auth'

export default function SiteAuthPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(false)
  const [shake,    setShake]    = useState(false)

  const from = searchParams.get('from') ?? '/'

  // If already authenticated (session cookie present), skip through
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === SITE_PASSWORD) {
        router.replace(from)
      }
    } catch {}
  }, [from, router])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== SITE_PASSWORD) {
      setError(true)
      setShake(true)
      setPassword('')
      setTimeout(() => setShake(false), 500)
      return
    }
    // Set session cookie (no Max-Age = cleared when browser closes)
    document.cookie = `${COOKIE_NAME}=${SITE_PASSWORD}; path=/; SameSite=Strict`
    try { sessionStorage.setItem(STORAGE_KEY, SITE_PASSWORD) } catch {}
    router.replace(from)
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
