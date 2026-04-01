'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Props {
  tier: 'premium' | 'extended'
  label: string
  className: string
  loadingLabel?: string
  next?: string
}

export default function CheckoutButton({ tier, label, className, loadingLabel = 'Loading...', next }: Props) {
  const { user } = useAuth()
  const router   = useRouter()
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [showPromo, setShowPromo] = useState(false)
  const [promoCode, setPromoCode] = useState('')

  useEffect(() => {
    try {
      const pending = sessionStorage.getItem('pendingPromoCode')
      if (pending) {
        setPromoCode(pending)
        setShowPromo(true)
        sessionStorage.removeItem('pendingPromoCode')
      }
    } catch {}
  }, [])

  async function handleClick() {
    setError(null)

    if (!user) {
      const returnTo = next ?? '/pricing'
      try {
        sessionStorage.setItem('authReturnTo', returnTo)
        if (promoCode.trim()) {
          sessionStorage.setItem('pendingPromoCode', promoCode.trim().toUpperCase())
        }
      } catch {}
      router.push(`/signin?next=${encodeURIComponent(returnTo)}`)
      return
    }

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
        return // navigating away — keep loading state
      }

      setError(data.error ?? 'Something went wrong. Please try again.')
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? loadingLabel : label}
      </button>

      {!showPromo ? (
        <button
          type="button"
          onClick={() => setShowPromo(true)}
          className="text-xs text-center text-[#9B9690] hover:text-[#6E6A65] transition-colors"
        >
          Have a promo code?
        </button>
      ) : (
        <input
          type="text"
          value={promoCode}
          onChange={e => setPromoCode(e.target.value)}
          placeholder="Enter promo code"
          autoFocus
          className="w-full border border-[#E8E5E1] rounded-lg px-3 py-2 text-xs text-[#1A1A2E] placeholder-[#9B9690] outline-none focus:border-[#5B9A6F] bg-white transition-colors uppercase tracking-widest"
        />
      )}

      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  )
}
