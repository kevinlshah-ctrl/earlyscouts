import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import CheckoutButton from './CheckoutButton'

export const metadata = {
  title: 'Pricing | EarlyScouts',
  description: 'One-time access to every LA school report and transfer playbook. Starter from $9.99, Full Access $24.99.',
}

const COMPARE = [
  { label: 'School reports',     us: 'All',        consultant: '3–5',       diy: 'Scattered' },
  { label: 'Transfer guides',    us: 'All',        consultant: '✓',         diy: '✗'         },
  { label: 'Time required',      us: '~30 min',    consultant: '5+ hrs',    diy: '20+ hrs'   },
  { label: 'Price',              us: 'From $9.99', consultant: '$200–$500', diy: 'Free'      },
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
            One-time access. No subscription.
          </h1>
          <p className="text-[#6E6A65] text-sm leading-relaxed">
            Pay once, keep access. Research the schools you care about — or unlock everything.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="px-4 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-stretch">

            {/* ── Card 1: Free ── */}
            <div className="order-3 lg:order-1 flex-1 bg-white border border-[#E8E5E1] rounded-2xl p-6 flex flex-col shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-widest text-[#9B9690] mb-2">Browse Free</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-4xl text-[#1A1A2E]">Free</span>
                </div>
                <p className="text-xs text-[#9B9690] mt-1.5">Preview every school before you commit</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'Scout Take editorial for every school',
                  'Feeder pipeline maps — the K–12 trajectory',
                  'Quick stats, alerts & school overviews',
                  'Preview of every transfer guide',
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

            {/* ── Card 2: Starter ── */}
            <div className="order-2 lg:order-2 flex-1 bg-white border-2 border-[#5B9A6F] rounded-2xl p-6 flex flex-col shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-widest text-[#5B9A6F] mb-2">Starter</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-serif text-4xl text-[#1A1A2E]">$9.99</span>
                  <span className="text-sm text-[#9B9690]">one-time</span>
                </div>
                <p className="text-xs text-[#9B9690] mt-1.5">Unlock the schools you&apos;re actually considering.</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'Unlock any 3 full school reports',
                  'Unlock any 1 complete transfer guide',
                  'All comparison tables & parent reviews',
                  'Tour questions & enrollment details',
                  'One-time payment, no subscription',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#3D3A36]">
                    <span className="text-[#5B9A6F] font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <CheckoutButton
                  tier="starter"
                  label="Get Starter Access · $9.99"
                  loadingLabel="Setting up checkout..."
                  className="block w-full text-center bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
                  next={next}
                />
                <p className="text-[10px] text-[#9B9690] text-center mt-2 leading-relaxed">
                  One-time payment. You keep access.
                </p>
              </div>
            </div>

            {/* ── Card 3: Full Access (HERO) ── */}
            <div className="order-1 lg:order-3 flex-1 bg-[#1A1A2E] rounded-2xl p-6 flex flex-col shadow-lg relative">
              {/* Badge */}
              <div className="absolute top-4 right-4">
                <span className="bg-[#E8B84B] text-[#1A1A2E] text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                  Best Value
                </span>
              </div>

              <div className="mb-5">
                <p className="text-xs font-mono uppercase tracking-widest text-[#6B8080] mb-2">Full Access</p>
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-serif text-4xl text-white">$24.99</span>
                  <span className="text-sm text-[#9B9690]">one-time</span>
                </div>
                <p className="text-xs text-[#9B9690] mt-1.5">Every school, every guide. Everything we add in the future.</p>
              </div>

              <ul className="flex flex-col gap-2.5 flex-1">
                {[
                  'All school reports (150+, growing)',
                  'All transfer & school choice guides',
                  'Full deadline calendars & contact directories',
                  'Side-by-side comparison tables',
                  'Parent reviews — the good AND the bad',
                  'Tour questions based on real parent feedback',
                  'All future schools & guides as we add them',
                ].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-[#C4BFB9]">
                    <span className="text-[#5B9A6F] font-bold mt-0.5 shrink-0">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                <CheckoutButton
                  tier="full_access"
                  label="Get Full Access · $24.99"
                  loadingLabel="Setting up checkout..."
                  className="block w-full text-center bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold text-sm py-3.5 rounded-xl transition-colors"
                  next={next}
                />
                <p className="text-[10px] text-[#6B8080] text-center mt-2 leading-relaxed">
                  One-time payment. No subscription. Ever.
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
        </div>
      </section>

      {/* Social proof */}
      <section className="px-4 pb-12 text-center">
        <div className="inline-flex items-center bg-[#FEF3E8] border border-[#F2C49A] rounded-full px-5 py-2">
          <span className="text-sm text-[#C97B3A]">
            Helping <strong>250+</strong> families across LA make smarter school decisions
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
                q: 'How does pricing work?',
                a: 'One-time payment — no subscription. Starter ($9.99) gives you 3 school reports + 1 guide. Full Access ($24.99) unlocks everything, including all future schools and guides we add.',
              },
              {
                q: 'Is this a subscription?',
                a: 'No. You pay once and keep access. There is no recurring billing for Starter or Full Access.',
              },
              {
                q: 'What\'s in the free plan?',
                a: 'The Scout Take (our editorial opinion), Quick Stats, and the pipeline map for every school are always free. You can browse the full directory without signing up.',
              },
              {
                q: 'What counts as a "school report"?',
                a: 'Every school has a full analyst-written report covering test scores in context, parent review synthesis, a comparison table, a feeder pipeline map, and enrollment details.',
              },
              {
                q: 'What are transfer guides?',
                a: 'Step-by-step guides for navigating district transfer processes: SMMUSD, CCUSD, BHUSD, and LAUSD. They include every deadline, priority tier, and permit window across a 16-month calendar.',
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

      {/* What Parents Are Solving */}
      <section className="px-4 py-12 bg-[#FFFAF6] border-t border-[#E8E5E1]">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-xl text-[#1A1A2E] mb-6 text-center">What parents are solving with EarlyScouts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                q: 'Should I transfer from LAUSD to Santa Monica schools?',
                a: 'Our SMMUSD Transfer Blueprint covers the two-step process, every deadline, and the priority tier system.',
                link: 'Read the guide →',
                href: '/guides/smmusd-transfer-playbook',
              },
              {
                q: 'Is my neighborhood school actually good?',
                a: 'Our 30-minute deep dives go beyond GreatSchools — test scores in context, programs, and what 50+ parents really think.',
                link: 'Browse schools →',
                href: '/schools',
              },
              {
                q: 'Charter, magnet, or neighborhood school?',
                a: 'Our LAUSD School Choice Guide decodes 200+ magnets, 300+ charters, and 5 permit types.',
                link: 'Read the guide →',
                href: '/guides/lausd-school-choice-playbook',
              },
            ].map(({ q, a, link, href }) => (
              <div key={q} style={{ background: '#FFFAF6', borderRadius: 12, padding: 20, border: '1px solid #E8E5E1' }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 700, color: '#2D3436', marginBottom: 8, marginTop: 0 }}>{q}</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#636E72', marginBottom: 12, marginTop: 0 }}>{a}</p>
                <Link href={href} style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#5B9A6F', fontWeight: 600, textDecoration: 'none' }}>{link}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
