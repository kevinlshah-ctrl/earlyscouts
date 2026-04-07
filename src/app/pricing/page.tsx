import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import CheckoutButton from './CheckoutButton'

export const metadata = {
  title: 'Pricing | EarlyScouts',
  description: 'Full access to every LA school report and transfer playbook.',
}

const COMPARE = [
  { label: 'School reports',           us: '100+',              consultant: '3–5',       diy: 'Scattered' },
  { label: 'Transfer playbooks',       us: '✓',                 consultant: '✓',         diy: '✗'         },
  { label: 'Time required',            us: '~30 min',           consultant: '5+ hrs',    diy: '20+ hrs'   },
  { label: 'Premium (one-time)',        us: '$34.99',            consultant: '$200–$500', diy: 'Free'      },
  { label: 'Extended (stay connected)', us: '+$9.99/mo after',  consultant: '—',         diy: '—'         },
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
        <div className="max-w-5xl mx-auto">

          {/* Mobile order: Premium → Extended → Free via order classes */}
          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">

            {/* ── Card 1: Free ── (mobile: order-3, desktop: order-1) */}
            <div className="order-3 lg:order-1 flex-1 bg-white border border-[#E8E5E1] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
              <div>
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

              <Link
                href="/schools"
                className="block w-full text-center border-2 border-[#5B9A6F] text-[#5B9A6F] hover:bg-[#5B9A6F] hover:text-white font-semibold text-sm py-3 rounded-xl transition-colors"
              >
                Start Browsing
              </Link>
            </div>

            {/* ── Card 2: Premium (HERO) ── (mobile: order-1, desktop: order-2) */}
            <div className="order-1 lg:order-2 flex-1 bg-[#1A1A2E] rounded-2xl p-6 flex flex-col gap-5 shadow-lg relative lg:-mt-3 lg:-mb-3 lg:py-9">
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="bg-[#E8B84B] text-[#1A1A2E] text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  Most Popular
                </span>
              </div>

              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#6B8080] mb-2">Premium</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-white">$34.99</span>
                </div>
                <p className="text-xs text-[#9B9690] mt-1.5">3 days of full access</p>
                <p className="text-xs text-[#9B9690] mt-2 leading-relaxed">
                  Everything you need for a focused research sprint. Read every report, every playbook, every comparison.
                </p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'All 100+ deep-dive school reports',
                  'Transfer playbooks with every deadline',
                  'Side-by-side comparison tables',
                  'Tour questions based on real parent feedback',
                  'Parent review analysis from 30+ sources',
                  'Full enrollment details and logistics',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#C4BFB9]">
                    <span className="text-[#5B9A6F] font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <CheckoutButton
                tier="premium"
                label="Get Premium for $34.99"
                loadingLabel="Setting up checkout..."
                className="block w-full text-center bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
                next={next}
              />
            </div>

            {/* ── Card 3: Premium Extended ── (mobile: order-2, desktop: order-3) */}
            <div className="order-2 lg:order-3 flex-1 bg-white border-2 border-[#5B9A6F] rounded-2xl p-6 flex flex-col gap-5 shadow-sm">
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-[#9B9690] mb-2">Premium Extended</p>
                {/* Price — shown prominently */}
                <p className="text-sm font-semibold text-[#1A1A2E] mt-1">Full access starts immediately — <span className="font-serif text-xl">$34.99</span></p>
                <p className="text-xs text-[#5B9A6F] font-semibold mt-1">Then $9.99/month starting day 4</p>
                <p className="text-xs text-[#6E6A65] mt-2 leading-relaxed">
                  Start with full Premium access, then stay connected as things change.
                </p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'Everything in Premium',
                  'Continued full access after 3 days',
                  'Follow up to 10 schools',
                  'Monthly personalized update emails',
                  'District news and deadline reminders',
                  'Cancel the monthly anytime',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#3D3A36]">
                    <span className="text-[#5B9A6F] font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-1.5">
                <CheckoutButton
                  tier="extended"
                  label="Get Premium Extended"
                  loadingLabel="Setting up checkout..."
                  className="block w-full text-center border-2 border-[#5B9A6F] text-[#5B9A6F] hover:bg-[#5B9A6F] hover:text-white font-semibold text-sm py-3 rounded-xl transition-colors"
                  next={next}
                />
                <p className="text-[10px] text-[#9B9690] text-center">
                  $34.99 upfront · $9.99/month from day 4 · cancel anytime
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#F0EDE8]">
                  <th className="text-left px-5 py-3 text-[#9B9690] font-mono text-xs uppercase tracking-wider"></th>
                  <th className="text-center px-3 py-3 text-[#5B9A6F] font-semibold text-sm">EarlyScouts</th>
                  <th className="text-center px-3 py-3 text-[#9B9690] font-mono text-xs uppercase tracking-wider">Consultant</th>
                  <th className="text-center px-3 py-3 text-[#9B9690] font-mono text-xs uppercase tracking-wider">DIY</th>
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
                q: 'When does billing start for Premium Extended?',
                a: 'You pay $34.99 today for 3 days of full access. On day 4, it continues at $9.99/month unless you cancel before then. No hidden fees.',
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
