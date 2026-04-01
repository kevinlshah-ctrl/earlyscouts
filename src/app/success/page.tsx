'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/Nav'
import { useAuth } from '@/lib/auth-context'

const TIER_LABELS: Record<string, string> = {
  free: 'Free Access',
  premium: 'Premium',
  extended: 'Extended Access',
}

const TIER_PERKS: Record<string, string[]> = {
  free: [
    'Browse school profiles and ratings',
    'View quick stats for all schools',
    'Access public guides and blueprints',
  ],
  premium: [
    'Full deep-dive reports for all schools',
    'Side-by-side school comparisons',
    'Transfer and permit playbooks',
    'Save schools to your list',
  ],
  extended: [
    'Everything in Premium',
    'New reports as they publish',
    'District intel & board meeting updates',
    'Priority email support',
  ],
}

export default function SuccessPage() {
  const { user, profile, loading } = useAuth()
  const [pendingFollowDone, setPendingFollowDone] = useState(false)

  const displayName =
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'there'

  const tier = profile?.subscription_tier ?? 'free'
  const perks = TIER_PERKS[tier] ?? TIER_PERKS.free

  // Handle any pendingFollow that wasn't caught by the auth state handler
  useEffect(() => {
    if (!profile || pendingFollowDone) return
    try {
      const pending = localStorage.getItem('pendingFollow')
      if (pending && !profile.followed_schools.includes(pending)) {
        // Auth context processes this on SIGNED_IN; if we're here it already ran
        localStorage.removeItem('pendingFollow')
      }
    } catch {}
    setPendingFollowDone(true)
  }, [profile, pendingFollowDone])

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-scout-green border-t-transparent animate-spin" />
      </main>
    )
  }

  return (
    <main className="bg-cream min-h-screen">
      <Nav />

      <section className="px-4 pt-16 pb-12">
        <div className="max-w-lg mx-auto text-center">

          {/* Celebration mark */}
          <div className="text-5xl mb-5">🎉</div>

          <span className="text-xs font-mono uppercase tracking-widest text-peach">
            Welcome to EarlyScouts
          </span>
          <h1 className="font-serif text-4xl text-charcoal mt-2 mb-3">
            You&rsquo;re in, {displayName}!
          </h1>
          <p className="text-gray-500 text-base leading-relaxed mb-8">
            Your account is all set. Start exploring schools, save the ones you like,
            and build your shortlist.
          </p>

          {/* Plan card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-8 text-left shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase tracking-widest text-gray-400">Your Plan</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                tier === 'extended'
                  ? 'bg-scout-green/10 text-scout-green'
                  : tier === 'premium'
                  ? 'bg-sky/10 text-sky'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {TIER_LABELS[tier]}
              </span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2.5 text-sm text-charcoal">
                  <svg className="shrink-0 mt-0.5 text-scout-green" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {perk}
                </li>
              ))}
            </ul>

            {tier === 'free' && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <Link
                  href="/pricing"
                  className="block w-full text-center bg-scout-green text-white text-sm font-semibold py-2.5 rounded-full hover:bg-scout-green-dark transition-colors"
                >
                  Upgrade for Full Access
                </Link>
              </div>
            )}
          </div>

          {/* Primary CTA */}
          <Link
            href="/schools"
            className="inline-block w-full bg-scout-green hover:bg-scout-green-dark text-white font-semibold text-base px-8 py-4 rounded-full transition-colors shadow-sm"
          >
            Start Exploring Schools &rarr;
          </Link>

          <p className="text-xs text-gray-400 mt-4">
            Or{' '}
            <Link href="/profile" className="text-scout-green hover:underline">
              view your profile
            </Link>
          </p>

        </div>
      </section>
    </main>
  )
}
