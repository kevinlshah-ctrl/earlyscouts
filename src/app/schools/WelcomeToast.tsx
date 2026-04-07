'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function WelcomeToast() {
  const searchParams  = useSearchParams()
  const router        = useRouter()
  const { refreshProfile } = useAuth()
  const [visible, setVisible] = useState(false)
  // Prevent double-firing in React StrictMode / concurrent renders
  const handled = useRef(false)

  useEffect(() => {
    if (searchParams.get('welcome') !== '1') return
    if (handled.current) return
    handled.current = true

    setVisible(true)

    // Strip ?welcome=1 from the URL without adding a history entry
    const url = new URL(window.location.href)
    url.searchParams.delete('welcome')
    router.replace(url.pathname + (url.search || ''))

    // The Stripe webhook updates user_profiles after issuing the redirect.
    // Re-fetch the profile twice — once quickly, once after a longer delay —
    // so the paid subscription status is reflected without a manual refresh.
    const t1 = setTimeout(() => refreshProfile(), 1500)
    const t2 = setTimeout(() => refreshProfile(), 5000)
    const t3 = setTimeout(() => setVisible(false), 6000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [searchParams, router, refreshProfile])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#5B9A6F] text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg">
      <span>Welcome to EarlyScouts! You have full access.</span>
      <button
        onClick={() => setVisible(false)}
        className="text-white/60 hover:text-white transition-colors leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}
