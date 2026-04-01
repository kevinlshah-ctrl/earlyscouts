'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBrowserClient } from '@/lib/supabase-browser'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// With @supabase/ssr, createBrowserClient does NOT auto-exchange the PKCE
// code from the URL (unlike the old auth-helpers createClientComponentClient).
// We subscribe to onAuthStateChange first, then explicitly call
// exchangeCodeForSession so the SIGNED_IN event fires into our listener.

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getBrowserClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          subscription.unsubscribe()

          // Determine new user: profile has no onboarding_data and was
          // created within the last 60 seconds.
          const { data: profileRaw } = await supabase
            .from('user_profiles')
            .select('created_at, onboarding_data')
            .eq('id', session.user.id)
            .single()

          const profile = profileRaw as { created_at: string; onboarding_data: unknown } | null

          const ageMs = profile?.created_at
            ? Date.now() - new Date(profile.created_at).getTime()
            : Infinity

          const isNewUser = !profile?.onboarding_data && ageMs < 60_000

          if (isNewUser) {
            router.replace('/success')
          } else {
            // Try to restore the page the user was on before sign-in
            const returnTo =
              typeof window !== 'undefined'
                ? sessionStorage.getItem('authReturnTo') ?? '/schools'
                : '/schools'
            sessionStorage.removeItem('authReturnTo')
            router.replace(returnTo)
          }
        } else if (event === 'INITIAL_SESSION' && session) {
          // Already logged in — shouldn't normally land here, but handle it
          subscription.unsubscribe()
          router.replace('/profile')
        }
      }
    )

    // Exchange the PKCE code that Supabase puts in the URL after the user
    // clicks the magic link.  This triggers the SIGNED_IN event above.
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).catch(() => {
        setError('The sign-in link has expired or is invalid. Please try again.')
      })
    }

    // Fallback: if SIGNED_IN never fires (no code, network error, etc.) show
    // an error after 15 s rather than spinning forever.
    const timeout = setTimeout(() => {
      subscription.unsubscribe()
      setError('The sign-in link has expired or is invalid. Please try again.')
    }, 15_000)

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [router])

  if (error) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <p className="text-xl mb-2">🔗</p>
          <p className="font-semibold text-charcoal mb-2">Link expired</p>
          <p className="text-sm text-gray-500 mb-6">{error}</p>
          <a
            href="/signin"
            className="inline-block bg-scout-green text-white text-sm font-semibold px-6 py-2.5 rounded-full"
          >
            Try again
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-scout-green border-t-transparent animate-spin" />
        <p className="text-sm text-gray-500 font-mono">Signing you in...</p>
      </div>
    </main>
  )
}
