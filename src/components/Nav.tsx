'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, profile, loading } = useAuth()

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '?'

  return (
    <nav className="bg-cream border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <span className="font-serif text-xl text-charcoal">Early</span>
            <span className="font-serif text-xl text-scout-green">Scouts</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/schools" className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">
              Schools
            </Link>
            <Link href="/guides" className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">
              Guides
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">
              Pricing
            </Link>
            <Link href="/about" className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">
              About
            </Link>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {!loading && user ? (
              // Logged-in state
              <Link
                href="/profile"
                className="flex items-center gap-2 text-sm font-medium text-charcoal hover:text-scout-green transition-colors"
              >
                <span className="w-8 h-8 rounded-full bg-scout-green/15 text-scout-green text-xs font-bold flex items-center justify-center">
                  {initials}
                </span>
                My Profile
              </Link>
            ) : !loading ? (
              // Logged-out state
              <>
                <Link
                  href="/signin"
                  className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors px-4 py-2 rounded-full border border-gray-200 hover:border-scout-green"
                >
                  Sign In
                </Link>
                <Link
                  href="/onboarding"
                  className="text-sm font-medium text-cream bg-scout-green hover:bg-scout-green-dark transition-colors px-4 py-2 rounded-full"
                >
                  Get Started
                </Link>
              </>
            ) : (
              // Loading skeleton
              <div className="w-24 h-8 rounded-full bg-gray-100 animate-pulse" />
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation"
          >
            <span className={`block w-6 h-0.5 bg-charcoal transition-all duration-200 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-charcoal transition-all duration-200 ${mobileOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-charcoal transition-all duration-200 ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 py-4 flex flex-col gap-3">
            <Link href="/schools"   className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>Schools</Link>
            <Link href="/guides"    className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>Guides</Link>
            <Link href="/pricing"   className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>Pricing</Link>
            <Link href="/about"     className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>About</Link>

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              {user ? (
                <Link
                  href="/profile"
                  className="text-sm font-medium text-charcoal text-center py-2 border border-gray-200 rounded-full"
                  onClick={() => setMobileOpen(false)}
                >
                  My Profile
                </Link>
              ) : (
                <>
                  <Link href="/signin" className="text-sm font-medium text-charcoal text-center py-2 border border-gray-200 rounded-full" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                  <Link href="/onboarding" className="text-sm font-medium text-cream bg-scout-green text-center py-2 rounded-full" onClick={() => setMobileOpen(false)}>
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
