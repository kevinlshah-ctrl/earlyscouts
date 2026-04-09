import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { ReportMetaBadges } from '@/components/ReportMetaBadges'
import type { ReportData } from '@/lib/types'

export const metadata = {
  title: 'Guides | EarlyScouts',
  description: 'Step-by-step guides for navigating school transfers, permits, and enrollment on the LA Westside.',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tagFromSlug(slug: string): { label: string; colorClass: string } {
  if (slug.includes('transfer'))  return { label: 'Transfer Guide',      colorClass: 'bg-[#2D6A4F]/10 text-[#2D6A4F]' }
  if (slug.includes('choice'))    return { label: 'School Choice Guide',  colorClass: 'bg-sky/10 text-sky'              }
  if (slug.includes('playbook'))  return { label: 'Playbook',             colorClass: 'bg-peach/10 text-peach'          }
  if (slug.includes('blueprint')) return { label: 'Blueprint',            colorClass: 'bg-[#2D6A4F]/10 text-[#2D6A4F]' }
  return                                 { label: 'Guide',                colorClass: 'bg-gray-100 text-gray-500'       }
}

type GuideRow = {
  slug: string
  name: string
  district: string | null
  report_data: ReportData | null
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function GuidesPage() {
  const supabase = createServerClient()

  const { data } = await supabase
    .from('schools')
    .select('slug, name, district, report_data')
    .or('slug.like.%playbook%,slug.like.%blueprint%')
    .order('name')

  const guides = (data ?? []) as GuideRow[]

  return (
    <main>
      <Nav />

      <section className="bg-cream min-h-[30vh] px-4 py-16">
        <div className="max-w-3xl mx-auto">

          <div className="mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-peach">
              Transfer &amp; Enrollment Guides
            </span>
            <h1 className="font-serif text-4xl text-charcoal mt-2 mb-3">
              School Guides &amp; Blueprints
            </h1>
            <p className="text-gray-500 text-base leading-relaxed max-w-xl">
              Step-by-step guides for navigating school transfers, permits, and enrollment
              on the LA Westside. Written for parents, not administrators.
            </p>
          </div>

          {guides.length === 0 ? (
            <p className="text-sm text-gray-400 py-12 text-center">No guides found.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {guides.map(guide => {
                const { label, colorClass } = tagFromSlug(guide.slug)
                // Static playbook lives at /guides/playbook (re-exported from schools/playbook)
                const href = guide.slug === 'playbook'
                  ? '/guides/playbook'
                  : `/guides/${guide.slug}`

                // Pull description from structured report data
                const description =
                  guide.report_data?.sections?.[0]?.subtitle ??
                  guide.report_data?.verdict?.best_for ??
                  null

                return (
                  <Link
                    key={guide.slug}
                    href={href}
                    className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-2 hover:border-scout-green hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${colorClass}`}>
                        {label}
                      </span>
                      {guide.district && (
                        <span className="text-xs text-gray-400">{guide.district}</span>
                      )}
                    </div>
                    <h2 className="font-serif text-xl text-charcoal group-hover:text-scout-green transition-colors">
                      {guide.name}
                    </h2>
                    {description && (
                      <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
                    )}
                    {guide.report_data && (
                      <ReportMetaBadges reportData={guide.report_data} size="sm" />
                    )}
                    <span className="text-xs font-semibold text-peach mt-1">Read the guide →</span>
                  </Link>
                )
              })}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </main>
  )
}
