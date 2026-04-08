'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { getBrowserClient } from '@/lib/supabase-browser'

const PWD_REQS = [
  { label: 'At least 8 characters',  test: (p: string) => p.length >= 8 },
  { label: '1 uppercase letter',      test: (p: string) => /[A-Z]/.test(p) },
  { label: '1 lowercase letter',      test: (p: string) => /[a-z]/.test(p) },
  { label: '1 number',                test: (p: string) => /[0-9]/.test(p) },
  { label: '1 special character',     test: (p: string) => /[^A-Za-z0-9]/.test(p) },
]

const inputCls =
  'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-[#1A1A2E] ' +
  'placeholder-gray-400 bg-white outline-none focus:border-[#5B9A6F] transition-colors'

export default function ResetPasswordPage() {
  const router = useRouter()

  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [showPwd,     setShowPwd]     = useState(false)
  const [showConf,    setShowConf]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [success,     setSuccess]     = useState(false)

  const pwdChecks   = PWD_REQS.map(r => ({ ...r, met: r.test(password) }))
  const allPwdMet   = pwdChecks.every(c => c.met)
  const confirmMatch = password === confirm && confirm.length > 0
  const canSubmit   = allPwdMet && confirmMatch

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setError(null)
    setLoading(true)

    // The auth callback already exchanged the recovery code for a session,
    // so updateUser here operates on the active authenticated session.
    const { error: updateErr } = await getBrowserClient().auth.updateUser({ password })
    if (updateErr) {
      setError(updateErr.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/profile'), 2000)
  }

  return (
    <main className="min-h-screen bg-[#FFFAF6] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-lg border border-gray-100">
        <h1 className="font-serif text-2xl text-[#1A1A2E] mb-1">Set new password</h1>
        <p className="text-sm text-gray-400 mb-6">Enter and confirm your new password below.</p>

        {success ? (
          <div className="text-sm text-[#5B9A6F] bg-[#5B9A6F]/5 border border-[#5B9A6F]/20 rounded-xl px-4 py-3">
            Password updated. Redirecting to your profile…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="New password"
                  required
                  autoFocus
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A1A2E] transition-colors"
                  tabIndex={-1}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {password.length > 0 && (
                <ul className="flex flex-col gap-0.5 pl-0.5">
                  {pwdChecks.map(c => (
                    <li key={c.label} className={`text-xs flex items-center gap-1.5 transition-colors ${c.met ? 'text-[#5B9A6F]' : 'text-gray-400'}`}>
                      <span className="w-3 text-center shrink-0">{c.met ? '✓' : '○'}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Confirm new password"
                  required
                  className={`${inputCls} pr-10 ${confirm.length > 0 && !confirmMatch ? 'border-red-300 focus:border-red-400' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1A1A2E] transition-colors"
                  tabIndex={-1}
                  aria-label={showConf ? 'Hide password' : 'Show password'}
                >
                  {showConf ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirm.length > 0 && !confirmMatch && (
                <p className="text-xs text-red-400 pl-0.5">Passwords don&apos;t match</p>
              )}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="w-full py-3 bg-[#5B9A6F] hover:bg-[#4a8a5e] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {loading ? 'Updating…' : 'Set New Password'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}
