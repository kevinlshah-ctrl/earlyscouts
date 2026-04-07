'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import InlineAuth from './InlineAuth'

interface Props {
  tier: 'premium' | 'extended'
  label: string
  className: string
  loadingLabel?: string
  next?: string
}

export default function CheckoutButton({
  tier,
  label,
  className,
  loadingLabel = 'Loading…',
  next,
}: Props) {
  const { user, session } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ tier }),
      })

      const data: { url?: string; error?: string } = await res.json()

      if (data.url) {
        window.location.href = data.url
        return // navigating away — keep spinner
      }

      setError(data.error ?? 'Payment unavailable — please try again or contact hello@earlyscouts.com')
    } catch {
      setError('Payment unavailable — please try again or contact hello@earlyscouts.com')
    } finally {
      setLoading(false)
    }
  }

  // ── Not logged in: show inline signup / sign-in form ─────────────────────
  if (!user) {
    return <InlineAuth tier={tier} next={next} dark={tier === 'premium'} />
  }

  // ── Logged in: checkout button ───────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? loadingLabel : label}
      </button>

      {error && (
        <p className={`text-xs text-center ${tier === 'premium' ? 'text-red-300' : 'text-red-500'}`}>
          {error}
        </p>
      )}
    </div>
  )
}
