import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

export const metadata = {
  title: 'Pricing | SchoolScout by EarlyScouts',
  description: 'Deep-dive school research reports and transfer playbooks. Starting at $59.99.',
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-cream">
      <Nav />

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <h1 className="font-serif text-4xl text-charcoal mb-3">
            School research that replaces the $500 consultant
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
            Every deep dive, transfer playbook, and comparison tool. For a fraction of the cost.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* 3-Day Pass */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 flex flex-col">
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Quick Research</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl text-charcoal">$59.99</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">3-day full access</p>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {[
                'Full access to all 40+ school reports',
                'All transfer playbooks with calendars',
                'Comparison tables and tour questions',
                'Parent review analysis',
                'Pipeline maps for every school',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-charcoal">
                  <span className="text-scout-green mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="block text-center bg-white border-2 border-scout-green text-scout-green font-semibold text-sm py-3 rounded-xl hover:bg-scout-green hover:text-white transition-colors"
            >
              Start 3-Day Pass
            </Link>
          </div>

          {/* 14-Day Pass */}
          <div className="bg-white border-2 border-scout-green rounded-2xl p-8 flex flex-col relative">
            {/* Popular badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-scout-green text-white text-xs font-semibold px-4 py-1 rounded-full">
                Most Popular
              </span>
            </div>

            <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">Decision Season</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-serif text-4xl text-charcoal">$49.99</span>
            </div>
            <p className="text-sm text-gray-400 mb-6">14-day full access</p>

            <ul className="flex flex-col gap-3 mb-8 flex-1">
              {[
                'Everything in 3-Day Pass',
                'Follow up to 10 schools',
                '14 days to explore at your pace',
                'Tour, compare, and decide with confidence',
                'Access during peak enrollment season',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-charcoal">
                  <span className="text-scout-green mt-0.5 shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="block text-center bg-scout-green text-white font-semibold text-sm py-3 rounded-xl hover:bg-scout-green-dark transition-colors"
            >
              Start 14-Day Pass
            </Link>
          </div>
        </div>

        {/* Monthly continuation */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl px-8 py-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-3">
              <span className="text-2xl">📬</span>
              <div>
                <p className="font-serif text-lg text-charcoal">Stay updated for $4.99/month</p>
              </div>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed max-w-md mx-auto mb-4">
              After your pass expires, continue month-to-month. Keep full access to all reports, plus get a monthly personalized email with updates on the schools you're following. Cancel anytime.
            </p>
            <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="text-scout-green">✓</span> Full report access
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-scout-green">✓</span> Monthly school updates
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-scout-green">✓</span> Cancel anytime
              </span>
            </div>
          </div>
        </div>

        {/* Free tier */}
        <div className="max-w-2xl mx-auto mt-10 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Always free</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {['School directory', 'Scout Takes', 'Quick Stats', 'Pipeline maps'].map((item) => (
              <span key={item} className="text-sm text-gray-500 bg-cream border border-gray-200 px-3 py-1.5 rounded-full">
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Social proof */}
        <div className="max-w-2xl mx-auto mt-12 text-center">
          <div className="inline-flex items-center gap-2 bg-honey/10 text-charcoal px-5 py-2.5 rounded-full">
            <span>👨‍👩‍👧‍👦</span>
            <span className="text-sm font-medium">
              Helping <strong>250+ families</strong> across LA make smarter school decisions
            </span>
          </div>
        </div>

        {/* Comparison to alternatives */}
        <div className="max-w-2xl mx-auto mt-16">
          <h2 className="font-serif text-2xl text-charcoal text-center mb-8">
            How it compares
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream">
                  <th className="text-left px-5 py-3 text-xs font-mono uppercase tracking-widest text-gray-400 border-b border-gray-200"></th>
                  <th className="text-center px-5 py-3 text-xs font-mono uppercase tracking-widest text-scout-green border-b border-gray-200">SchoolScout</th>
                  <th className="text-center px-5 py-3 text-xs font-mono uppercase tracking-widest text-gray-400 border-b border-gray-200">Consultant</th>
                  <th className="text-center px-5 py-3 text-xs font-mono uppercase tracking-widest text-gray-400 border-b border-gray-200">DIY Research</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Cost', '$59.99 – $49.99', '$500 – $2,000', 'Free (your time)'],
                  ['Time investment', '20 min per school', '1–2 hours meeting', '5–10 hrs per school'],
                  ['Transfer playbooks', '✓ Step-by-step', 'Sometimes', '✗ You piece it together'],
                  ['Schools covered', '40+ with deep dives', '5–10 per engagement', 'However many you research'],
                  ['Updated deadlines', '✓ Year-stamped', 'Point-in-time', '✗ You track manually'],
                  ['Parent reviews', '✓ Multi-source synthesis', 'Anecdotal', '✗ Scattered across sites'],
                  ['Monthly updates', '✓ $4.99/mo', '✗ One-time', '✗ Manual'],
                ].map(([label, scout, consultant, diy], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-cream/30'}>
                    <td className="px-5 py-3 font-semibold text-charcoal border-b border-gray-100">{label}</td>
                    <td className="px-5 py-3 text-center text-scout-green font-medium border-b border-gray-100">{scout}</td>
                    <td className="px-5 py-3 text-center text-gray-500 border-b border-gray-100">{consultant}</td>
                    <td className="px-5 py-3 text-center text-gray-400 border-b border-gray-100">{diy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
