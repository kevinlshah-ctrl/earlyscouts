'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { getBrowserClient } from '@/lib/supabase-browser'

interface Props {
  tier: 'premium' | 'extended'
  label: string
  className: string
  loadingLabel?: string
}

export default function CheckoutButton({ tier, label, className, loadingLabel = 'Loading...' }: Props) {
  const { user } = useAuth()
  const router   = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleClick() {
    setError(null)

    if (!user) {
      // Save the pricing page as the post-auth destination
      try { sessionStorage.setItem('authReturnTo', '/pricing') } catch {}
      router.push('/signin?next=/pricing')
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
        body: JSON.stringify({ tier }),
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
    <div className="flex flex-col gap-1.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
      >
        {loading ? loadingLabel : label}
      </button>
      {error && (
        <p className="text-xs text-red-500 text-center">{error}</p>
      )}
    </div>
  )
}
