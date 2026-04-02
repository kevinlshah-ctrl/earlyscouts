'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'
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
  const { user } = useAuth()
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [promoCode, setPromoCode] = useState('')

  // Read pendingPromoCode for the logged-in view.
  // InlineAuth handles its own read for the not-logged-in view.
  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pendingPromoCode')
      if (pending) {
        setPromoCode(pending)
        sessionStorage.removeItem('pendingPromoCode')
      }
    } catch {}
  }, [])

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const supabase = getBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()

      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({
          tier,
          couponCode: promoCode.trim().toUpperCase() || undefined,
        }),
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

  // ── Logged in: promo code (always visible) + checkout button ──────────────
  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={promoCode}
        onChange={e => setPromoCode(e.target.value.toUpperCase())}
        placeholder="Promo code (optional)"
        className="w-full border border-[#E8E5E1] rounded-lg px-3 py-2 text-xs text-[#1A1A2E] placeholder-[#9B9690] outline-none focus:border-[#5B9A6F] bg-white transition-colors uppercase tracking-widest"
      />

      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? loadingLabel : label}
      </button>

      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
    </div>
  )
}
