'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function Nav() {
  const router                              = useRouter()
  const [mobileOpen,   setMobileOpen]       = useState(false)
  const [dropdownOpen, setDropdownOpen]     = useState(false)
  const dropdownRef                         = useRef<HTMLDivElement>(null)
  const { user, profile, loading, signOut } = useAuth()

  // Cap loading skeleton at 500ms — after that, render the logged-out state rather
  // than leave the nav blank while fetchProfile is still in-flight (e.g. after
  // a Stripe redirect where the profile re-fetch can take several hundred ms).
  const [skeletonVisible, setSkeletonVisible] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setSkeletonVisible(false), 500)
    return () => clearTimeout(t)
  }, [])

  const initials = profile?.display_name
    ? profile.display_name.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? '?'

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  async function handleSignOut(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDropdownOpen(false)
    setMobileOpen(false)
    await signOut()
    router.push('/')
  }

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
            <Link href="/schools"  className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">Schools</Link>
            <Link href="/guides"   className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">Guides</Link>
            <Link href="/pricing"  className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">Pricing</Link>
            <Link href="/about"    className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors">About</Link>
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              // Logged-in: show avatar as soon as user is known, don't wait for profile
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="flex items-center gap-2 text-sm font-medium text-charcoal hover:text-scout-green transition-colors"
                  aria-expanded={dropdownOpen}
                  aria-haspopup="true"
                >
                  <span className="w-8 h-8 rounded-full bg-scout-green/15 text-scout-green text-xs font-bold flex items-center justify-center">
                    {initials}
                  </span>
                  My Profile
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} aria-hidden>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50">
                    <Link
                      href="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2.5 text-sm text-charcoal hover:bg-gray-50 hover:text-scout-green transition-colors"
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2.5 text-sm text-charcoal hover:bg-gray-50 hover:text-scout-green transition-colors border-t border-gray-50"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : loading && skeletonVisible ? (
              // Loading skeleton — shown for at most 500ms
              <div className="w-24 h-8 rounded-full bg-gray-100 animate-pulse" />
            ) : (
              // Logged-out (or loading timed out)
              <>
                <Link
                  href="/signin"
                  className="text-sm font-medium text-charcoal hover:text-scout-green transition-colors px-4 py-2 rounded-full border border-gray-200 hover:border-scout-green"
                >
                  Sign In
                </Link>
                <Link
                  href="/schools"
                  className="text-sm font-medium text-cream bg-scout-green hover:bg-scout-green-dark transition-colors px-4 py-2 rounded-full"
                >
                  Browse Schools
                </Link>
              </>
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
            <Link href="/schools"  className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>Schools</Link>
            <Link href="/guides"   className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>Guides</Link>
            <Link href="/pricing"  className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>Pricing</Link>
            <Link href="/about"    className="text-sm font-medium text-charcoal hover:text-scout-green px-2 py-1" onClick={() => setMobileOpen(false)}>About</Link>

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="text-sm font-medium text-charcoal text-center py-2 border border-gray-200 rounded-full"
                    onClick={() => setMobileOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-sm font-medium text-gray-500 text-center py-2 border border-gray-200 rounded-full hover:border-scout-green hover:text-scout-green transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/signin"     className="text-sm font-medium text-charcoal text-center py-2 border border-gray-200 rounded-full" onClick={() => setMobileOpen(false)}>Sign In</Link>
                  <Link href="/schools" className="text-sm font-medium text-cream bg-scout-green text-center py-2 rounded-full"              onClick={() => setMobileOpen(false)}>Browse Schools</Link>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </nav>
  )
}
