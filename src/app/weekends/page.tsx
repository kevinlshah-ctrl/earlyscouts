'use client'

import { useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function WeekendsPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleNotify(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    const existing = JSON.parse(localStorage.getItem('weekendscouts_notify') ?? '[]') as string[]
    if (!existing.includes(email.trim())) {
      localStorage.setItem('weekendscouts_notify', JSON.stringify([...existing, email.trim()]))
    }
    setSubmitted(true)
  }

  return (
    <main className="bg-cream min-h-screen">
      <Nav />

      <section className="py-24 px-4">
        <div className="max-w-xl mx-auto flex flex-col items-center text-center gap-7">

          {/* Badge */}
          <span className="bg-scout-green/10 text-scout-green text-xs font-mono font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full">
            Coming Soon
          </span>

          {/* Headline */}
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-mono uppercase tracking-widest text-gray-400">EarlyScouts</span>
            <h1 className="font-serif text-4xl sm:text-5xl text-charcoal leading-tight">
              Great weekends,<br />delivered to your inbox
            </h1>
          </div>

          {/* Body */}
          <p className="text-gray-600 text-base sm:text-lg leading-relaxed max-w-md">
            EarlyScouts Weekends is a curated family events newsletter matched to your neighborhood, your
            kids&rsquo; ages, and your interests. Every other week: the best things to do this
            weekend, Scout Tips, and promo codes. No scrolling required.
          </p>

          {/* Email capture */}
          {submitted ? (
            <div className="bg-scout-green/10 text-scout-green text-sm font-semibold px-6 py-4 rounded-2xl w-full max-w-sm">
              You&rsquo;re on the list. We&rsquo;ll let you know when it launches.
            </div>
          ) : (
            <form onSubmit={handleNotify} className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm text-charcoal bg-white focus:outline-none focus:border-charcoal placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="bg-charcoal hover:opacity-90 text-white text-sm font-semibold px-6 py-3 rounded-xl transition-opacity whitespace-nowrap"
              >
                Notify Me
              </button>
            </form>
          )}

          <p className="text-xs text-gray-400 font-mono -mt-3">No spam. Unsubscribe anytime.</p>

          {/* Divider */}
          <div className="w-12 border-t border-gray-200 mt-2" />

          {/* Back link */}
          <p className="text-sm text-gray-500">
            In the meantime,{' '}
            <Link href="/" className="text-scout-green font-semibold hover:opacity-80 transition-opacity">
              explore EarlyScouts →
            </Link>
          </p>

        </div>
      </section>

      <Footer />
    </main>
  )
}
