import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function ComparePage() {
  return (
    <main>
      <Nav />

      <section className="bg-cream min-h-[70vh] flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-lg text-center flex flex-col items-center gap-6">
          <div className="text-5xl">🔒</div>

          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-charcoal mb-3">
              School Comparison
            </h1>
            <p className="text-gray-500 text-base leading-relaxed">
              Compare any two or three schools side by side -- ratings, demographics, feeder maps,
              financials, and enrollment data in one view.
            </p>
          </div>

          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 w-full flex flex-col items-center gap-4">
            <span className="text-xs font-mono uppercase tracking-widest text-peach">
              Available with Scout Access
            </span>
            <p className="text-sm text-gray-500">
              Coming soon. Subscribe to get notified when school comparison goes live.
            </p>
            <Link
              href="/signup?plan=school"
              className="bg-scout-green hover:bg-scout-green-dark text-white font-semibold px-6 py-3 rounded-full transition-colors text-sm"
            >
              Start Free
            </Link>
            <Link href="/schools" className="text-xs text-gray-400 hover:text-scout-green transition-colors">
              Browse schools instead &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
