import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import CheckoutButton from './CheckoutButton'

export const metadata = {
  title: 'Pricing | EarlyScouts',
  description: 'Full access to every LA school report and transfer playbook. $59.99 initial, then $4.99/month. Cancel anytime.',
}

const COMPARE = [
  { label: 'School reports',     us: '100+',    consultant: '3–5',       diy: 'Scattered' },
  { label: 'Transfer playbooks', us: '✓',       consultant: '✓',         diy: '✗'         },
  { label: 'Time required',      us: '~30 min', consultant: '5+ hrs',    diy: '20+ hrs'   },
  { label: 'Premium',            us: '$59.99 + $4.99/mo', consultant: '$200–$500', diy: 'Free' },
]

export default function PricingPage({ searchParams }: { searchParams?: { next?: string } }) {
  const next = searchParams?.next
  return (
    <main className="min-h-screen bg-[#FFFAF6]">
      <Nav />

      {/* Header */}
      <section className="px-4 pt-14 pb-8 text-center">
        <div className="max-w-xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-widest text-[#F2945C]">Pricing</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A2E] mt-2 mb-3">
            Choose your plan.
          </h1>
          <p className="text-[#6E6A65] text-sm leading-relaxed">
            Browse free, unlock everything for a focused sprint, or stay connected all season.
          </p>
        </div>
      </section>

      {/* Pricing cards — desktop: 3 in a row. Mobile: Premium first, Extended second, Free last */}
      <section className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">

          {/* Mobile order: Premium first, Free second */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">

            {/* ── Card 1: Free ── (mobile: order-2, desktop: order-1) */}
            <div className="order-2 lg:order-1 flex-1 bg-white border border-[#E8E5E1] rounded-2xl p-6 flex flex-col shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-widest text-[#9B9690] mb-2">Basic</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-[#1A1A2E]">Free</span>
                </div>
                <p className="text-xs text-[#9B9690] mt-1.5">Explore schools at your own pace</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'School directory for all neighborhoods',
                  'Scout Takes (our editorial opinion on every school)',
                  'Quick Stats (test scores, enrollment, ratings)',
                  'K–12 pipeline maps',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#3D3A36]">
                    <span className="text-[#5B9A6F] font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <Link
                  href="/schools"
                  className="block w-full text-center border-2 border-[#5B9A6F] text-[#5B9A6F] hover:bg-[#5B9A6F] hover:text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                >
                  Start Browsing
                </Link>
              </div>
            </div>

            {/* ── Card 2: Premium (HERO) ── (mobile: order-1, desktop: order-2) */}
            <div className="order-1 lg:order-2 flex-1 bg-[#1A1A2E] rounded-2xl p-6 flex flex-col shadow-lg relative">
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="bg-[#E8B84B] text-[#1A1A2E] text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-widest text-[#6B8080] mb-2">Premium</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-serif text-4xl text-white">$59.99</span>
                  <span className="text-sm text-[#9B9690]">then $4.99/mo</span>
                </div>
                <p className="text-xs text-[#9B9690] mt-1.5">30 days of full access, then $4.99/month. Cancel anytime.</p>
                <p className="text-xs text-[#9B9690] mt-2 leading-relaxed">
                  Everything you need for a thorough research season. Read every report, every playbook, every comparison.
                </p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'All 100+ deep-dive school reports',
                  'Transfer playbooks with every deadline',
                  'Side-by-side comparison tables',
                  'Parent review analysis from 30+ sources',
                  'Full enrollment details and logistics',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#C4BFB9]">
                    <span className="text-[#5B9A6F] font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <CheckoutButton
                  tier="premium"
                  label="Get Premium – $59.99 Initial"
                  loadingLabel="Setting up checkout..."
                  className="block w-full text-center bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
                  next={next}
                />
                <p className="text-[10px] text-[#6B8080] text-center mt-2 leading-relaxed">
                  $55 setup + $4.99 first month. Renews at $4.99/month. Cancel anytime.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="px-4 pb-10">
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-mono uppercase tracking-widest text-[#9B9690] mb-4">
            How it compares
          </p>
          <div className="bg-white border border-[#E8E5E1] rounded-2xl overflow-hidden shadow-sm">
            {/* overflow-x-auto on inner wrapper; outer overflow-hidden keeps rounded corners */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-[#F0EDE8]">
                    <th className="text-left px-5 py-3 text-[#9B9690] font-mono text-xs uppercase tracking-wider min-w-[140px]"></th>
                    <th className="text-center px-3 py-3 text-[#5B9A6F] font-semibold text-sm min-w-[110px]">EarlyScouts</th>
                    <th className="text-center px-3 py-3 text-[#9B9690] font-mono text-xs uppercase tracking-wider min-w-[110px]">Consultant</th>
                    <th className="text-center px-3 py-3 text-[#9B9690] font-mono text-xs uppercase tracking-wider min-w-[80px]">DIY</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((row, i) => (
                    <tr key={row.label} className={`border-b border-[#F0EDE8] last:border-0 ${i % 2 !== 0 ? 'bg-[#FFFAF6]' : ''}`}>
                      <td className="px-5 py-3 text-[#3D3A36] font-medium text-sm">{row.label}</td>
                      <td className="px-3 py-3 text-center text-[#5B9A6F] font-semibold text-sm">{row.us}</td>
                      <td className="px-3 py-3 text-center text-[#9B9690] text-sm">{row.consultant}</td>
                      <td className="px-3 py-3 text-center text-[#9B9690] text-sm">{row.diy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="lg:hidden text-center text-[10px] text-[#B0AAA4] mt-2 font-mono tracking-wide">
            scroll to see more →
          </p>
        </div>
      </section>

      {/* Social proof */}
      <section className="px-4 pb-12 text-center">
        <div className="inline-flex items-center bg-[#FEF3E8] border border-[#F2C49A] rounded-full px-5 py-2">
          <span className="text-sm text-[#C97B3A]">
            Helping <strong>400+</strong> families across LA make smarter school decisions
          </span>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white px-4 py-12 border-t border-[#E8E5E1]">
        <div className="max-w-xl mx-auto">
          <h2 className="font-serif text-xl text-[#1A1A2E] mb-6 text-center">Common questions</h2>
          <div className="flex flex-col gap-5">
            {[
              {
                q: 'What\'s in the free plan?',
                a: 'The Scout Take (our editorial opinion), Quick Stats, and the pipeline map for every school are always free. You can browse the full directory without signing up.',
              },
              {
                q: 'What counts as a "school report"?',
                a: 'Every school has a full analyst-written report covering test scores in context, parent review synthesis, a comparison table, a feeder pipeline map, and enrollment details.',
              },
              {
                q: 'How does Premium pricing work?',
                a: 'You pay $59.99 upfront (a $55 setup fee + $4.99 first month), then $4.99/month after that. You get 30 days of full access from day one. Cancel anytime — if you cancel in your first month, you\'re only charged the $59.99 and nothing more.',
              },
              {
                q: 'What are transfer playbooks?',
                a: 'Playbooks are step-by-step guides for navigating district transfer processes: SMMUSD, CCUSD, and LAUSD. They include every deadline, priority tier, and permit window across a 16-month calendar.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-[#F0EDE8] pb-5 last:border-0 last:pb-0">
                <p className="font-semibold text-sm text-[#1A1A2E] mb-1.5">{q}</p>
                <p className="text-sm text-[#6E6A65] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#9B9690] mt-8">
            Questions?{' '}
            <a href="mailto:hello@earlyscouts.com" className="text-[#5B9A6F] hover:underline">
              hello@earlyscouts.com
            </a>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
