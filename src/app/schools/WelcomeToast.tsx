'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function WelcomeToast() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (searchParams.get('welcome') !== '1') return

    setVisible(true)

    // Strip ?welcome=1 from the URL without adding a history entry
    const url = new URL(window.location.href)
    url.searchParams.delete('welcome')
    router.replace(url.pathname + (url.search || ''))

    const t = setTimeout(() => setVisible(false), 5000)
    return () => clearTimeout(t)
  }, [searchParams, router])

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
