'use client'

import { useAuth } from '@/lib/auth-context'

export default function SubscriptionSection() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="rounded-xl border border-[#E8E5E1] p-5">
      <h3 className="font-semibold text-[#1A1A2E] mb-2">Subscription</h3>
      <p className="text-sm text-[#636E72] mb-4">
        View your plan details, update payment info, or cancel anytime.
      </p>
      <a
        href="/api/stripe/portal"
        className="inline-block bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white text-sm font-semibold py-2.5 px-5 rounded-xl transition-colors"
      >
        Manage Subscription
      </a>
    </div>
  )
}
