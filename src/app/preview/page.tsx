'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function PreviewPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const from         = searchParams.get('from') ?? '/'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/preview-auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password }),
    })

    if (res.ok) {
      router.replace(from)
    } else {
      const body = await res.json().catch(() => ({})) as { error?: string }
      setError(body.error ?? 'Incorrect password')
      setPassword('')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-10">
          <p className="font-serif text-3xl">
            <span className="text-charcoal">Early</span>
            <span className="text-scout-green">Scouts</span>
          </p>
          <p className="text-sm text-gray-400 mt-2">Private preview</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-2">
                Enter preview password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="Password"
                autoFocus
                autoComplete="current-password"
                className={`w-full border rounded-xl px-4 py-3 text-sm text-charcoal outline-none transition-colors ${
                  error
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-200 focus:border-scout-green'
                }`}
              />
              {error && (
                <p className="text-xs text-red-500 mt-1.5">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!password || loading}
              className="w-full bg-scout-green hover:bg-scout-green-dark disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-full transition-colors text-sm"
            >
              {loading ? 'Checking…' : 'Continue'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
