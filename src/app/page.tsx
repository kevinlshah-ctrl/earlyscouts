import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

// Curated homepage data — intentionally static for completeness and storytelling.
// These values are editorially chosen to illustrate the range of schools on the
// Westside. Do NOT replace with dynamic Supabase fetches — N/A values from
// missing DB rows would undermine the marketing message.
const HOMEPAGE_COMPARISON_SCHOOLS = [
  { name: 'Mar Vista Elementary',       math: 86, ela: 80 },
  { name: 'Grand View Blvd Elementary', math: 45, ela: 55 },
  { name: 'Beethoven Street Elementary',math: 48, ela: 60 },
  { name: 'Edison Language Academy',    math: 67, ela: 72 },
  { name: 'Broadway Elementary',        math: 79, ela: 85 },
]

// ── Transfer calendar data ───────────────────────────────────────────────────
const CALENDAR_ROWS = [
  { date: 'Oct 2026',     action: 'LAUSD Magnet / Choices applications open',          who: 'LAUSD families',    highlight: false },
  { date: 'Nov 2026',     action: 'LAUSD Choices on-time deadline',                    who: 'LAUSD families',    highlight: true  },
  { date: 'Feb 1, 2027',  action: 'LAUSD outgoing inter-district permit window OPENS', who: 'Transfer families', highlight: true  },
  { date: 'Apr 30, 2027', action: 'LAUSD outgoing permit window CLOSES',               who: 'Transfer families', highlight: true  },
]

export default function HomePage() {
  return (
    <main className="bg-[#FFFAF6]">
      <Nav />

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 1: HERO
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-[#FFFAF6] px-4 pt-7 pb-6 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">

          <h1 className="font-serif text-5xl sm:text-6xl text-[#1A1A2E] leading-tight">
            Make the best school decision for your kids.
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#A09A94] font-mono uppercase tracking-wider">
            <span>100+ schools researched</span>
            <span className="hidden sm:inline text-[#D4D0CC]">·</span>
            <span>30+ sources per report</span>
            <span className="hidden sm:inline text-[#D4D0CC]">·</span>
            <span>Permitting process decoded</span>
          </div>

          <Link
            href="/schools"
            className="inline-block bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold text-base px-8 py-3.5 rounded-full transition-colors shadow-sm mt-1"
          >
            Find Schools Near You
          </Link>

          <div className="inline-flex items-center bg-[#FEF3E8] border border-[#F2C49A] rounded-full px-4 py-1.5">
            <span className="text-sm text-[#C97B3A]">
              Helping <strong>400+</strong> families across LA make smarter school decisions
            </span>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 2: WHAT YOU'LL GET
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-white py-8 px-4">
        <div className="max-w-5xl mx-auto">

          <div className="border border-gray-200 rounded-2xl bg-white shadow-sm p-6 sm:p-8 flex flex-col gap-4">

            <div className="text-center">
              <span className="text-xs font-mono uppercase tracking-widest text-[#F2945C]">What&apos;s Inside</span>
              <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1A2E] mt-1">
                This is what a good school decision looks like.
              </h2>
            </div>

            {/* Scout Take */}
            <div className="bg-[#FFFAF6] border border-[#E8E5E1] rounded-2xl p-5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#A09A94]">
                From our Broadway Elementary Report
              </span>
              <div className="bg-[#F0FAF4] border-l-4 border-[#5B9A6F] rounded-r-lg p-4 mt-3">
                <p className="text-[10px] font-mono uppercase tracking-widest text-[#5B9A6F] mb-2">Scout Take</p>
                <p className="text-sm text-[#2A4A35] leading-relaxed max-w-3xl">
                  Broadway is quietly one of the best-kept secrets on the Westside. With 79% math
                  proficiency (more than double the LAUSD average) and a Mandarin dual-language program
                  that starts in Kindergarten, it punches well above its weight. The trade-off? No buses,
                  limited after-school care, and a campus that&apos;s showing its age. Still, for families
                  willing to manage the logistics, this is one of the most academically compelling public
                  options in Los Angeles.
                </p>
              </div>
              <p className="text-xs text-[#9B9690] mt-3">
                Every school gets an honest, unfiltered editorial opinion.
              </p>
            </div>

            {/* Comparison + Calendar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* Comparison Table */}
              <div className="flex flex-col gap-3 bg-[#FFFAF6] border border-[#E8E5E1] rounded-2xl p-5">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#A09A94]">
                  Side-by-Side Comparison
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#E8E5E1]">
                        <th className="text-left text-[#9B9690] font-mono uppercase tracking-wide pb-2 pr-2">School</th>
                        <th className="text-center text-[#9B9690] font-mono uppercase tracking-wide pb-2 px-1">Math</th>
                        <th className="text-center text-[#9B9690] font-mono uppercase tracking-wide pb-2 pl-1">ELA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {HOMEPAGE_COMPARISON_SCHOOLS.map((row, i) => (
                        <tr key={row.name} className={`border-b border-[#F0EDE8] ${i === HOMEPAGE_COMPARISON_SCHOOLS.length - 1 ? 'bg-[#F0FAF4]' : ''}`}>
                          <td className="py-2 pr-2 text-[#3D3A36] font-medium leading-snug">{row.name}</td>
                          <td className="py-2 px-1 text-center font-semibold text-[#5B9A6F]">{row.math}%</td>
                          <td className="py-2 pl-1 text-center text-[#6E6A65]">{row.ela}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-[#9B9690] mt-auto">
                  Side-by-side comparisons with schools parents actually consider.
                </p>
              </div>

              {/* Transfer Calendar */}
              <div className="flex flex-col gap-3 bg-[#FFFAF6] border border-[#E8E5E1] rounded-2xl p-5">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#A09A94]">
                    From our LAUSD Transfer Playbook
                  </span>
                  <p className="text-[10px] text-[#C4BFB9] mt-0.5">Los Angeles Unified School District</p>
                </div>
                <div className="flex flex-col divide-y divide-[#F0EDE8]">
                  {CALENDAR_ROWS.map((row, i) => (
                    <div key={i} className={`py-1.5 flex gap-3 items-start ${row.highlight ? 'bg-[#FEF3E8] -mx-2 px-2 rounded' : ''}`}>
                      <span className={`text-[10px] font-mono uppercase tracking-wide shrink-0 mt-0.5 w-20 ${row.highlight ? 'text-[#F2945C] font-bold' : 'text-[#9B9690]'}`}>
                        {row.date}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${row.highlight ? 'text-[#1A1A2E] font-semibold' : 'text-[#3D3A36]'}`}>
                          {row.action}
                        </p>
                        <p className="text-[10px] text-[#A09A94] mt-0.5">{row.who}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[#9B9690] mt-auto">
                  16-month planning calendars with every deadline mapped.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────
          SECTION 3: FINAL CTA
      ───────────────────────────────────────────────────────────────── */}
      <section className="bg-[#1A1A2E] py-10 px-4 text-center">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
          <h2 className="font-serif text-2xl sm:text-3xl text-white">
            Start exploring schools.
          </h2>
          <p className="text-[#A09A94] text-sm">
            Start with 3 days of full access for $34.99. Stay connected for $9.99/month.
          </p>
          <Link
            href="/schools"
            className="inline-block bg-[#5B9A6F] hover:bg-[#4a8a5e] text-white font-semibold text-base px-8 py-3.5 rounded-full transition-colors"
          >
            Find Schools Near You
          </Link>
          <Link href="/schools" className="text-xs text-[#6E6A65] hover:text-[#A09A94] transition-colors">
            or browse without onboarding &rarr;
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  )
}
