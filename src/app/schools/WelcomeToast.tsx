'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/lib/auth-context'

// Shown after a successful Stripe checkout.
// CheckoutButton sets 'showWelcomeToast' in sessionStorage right before the
// Stripe redirect. On return we read that flag here — no URL params needed
// (middleware was stripping ?welcome=1 before useSearchParams could read it).
export default function WelcomeToast() {
  const { isConfirmingAccess } = useAuth()
  const [visible, setVisible] = useState(false)
  // Prevent double-firing in React StrictMode / concurrent renders
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    try {
      if (sessionStorage.getItem('showWelcomeToast') !== 'true') return
      sessionStorage.removeItem('showWelcomeToast')
    } catch {
      return
    }
    handled.current = true
    setVisible(true)
  }, [])

  // Auto-dismiss 4s after access is confirmed
  useEffect(() => {
    if (visible && !isConfirmingAccess) {
      const t = setTimeout(() => setVisible(false), 4000)
      return () => clearTimeout(t)
    }
  }, [visible, isConfirmingAccess])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#5B9A6F] text-white text-sm font-medium px-5 py-3 rounded-full shadow-lg transition-all">
      {isConfirmingAccess ? (
        <>
          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
          <span>Setting up your access…</span>
        </>
      ) : (
        <>
          <span>You have full access. Welcome!</span>
          <button
            onClick={() => setVisible(false)}
            className="text-white/60 hover:text-white transition-colors leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </>
      )}
    </div>
  )
}
