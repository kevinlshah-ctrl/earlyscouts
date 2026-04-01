'use client'

import { useEffect } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

const GUIDES = [
  {
    slug: '/guides/smmusd-transfer-playbook',
    title: 'SMMUSD Transfer Blueprint',
    district: 'Santa Monica-Malibu USD',
    description:
      'How to transfer from LAUSD into Santa Monica schools. Covers inter-district permits, lottery timelines, school-by-school acceptance rates, and which grades are actually open.',
    tag: 'Transfer Guide',
    tagColor: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
  },
  {
    slug: '/guides/ccusd-transfer-playbook',
    title: 'CCUSD Transfer Blueprint',
    district: 'Culver City USD',
    description:
      'How to transfer into Culver City schools from LAUSD or another district. El Marino lottery strategy, dual language enrollment, and the inter-district permit process.',
    tag: 'Transfer Guide',
    tagColor: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
  },
  {
    slug: '/guides/lausd-school-choice-playbook',
    title: 'LAUSD School Choice Blueprint',
    district: 'Los Angeles USD',
    description:
      'Navigating the LAUSD permit and magnet system. Choices application, school of choice transfers, magnet programs on the Westside, and what parents actually get approved.',
    tag: 'School Choice Guide',
    tagColor: 'bg-sky/10 text-sky',
  },
  {
    slug: '/guides/beach-cities-school-choice-blueprint',
    title: 'Beach Cities School Choice Blueprint',
    district: 'Beach Cities (ESUSD/MBUSD/HBCSD/RBUSD)',
    description:
      'Navigating El Segundo, Manhattan Beach, Hermosa Beach, and Redondo Beach schools. The Mira Costa vs. Redondo Union decision, inter-district transfers, and every deadline in one place.',
    tag: 'Transfer Guide',
    tagColor: 'bg-[#2D6A4F]/10 text-[#2D6A4F]',
  },
  {
    slug: '/guides/playbook',
    title: 'LA School Selection Playbook',
    district: 'LA Westside',
    description:
      'The full decision framework for families choosing a school on the LA Westside. Understanding your options, key dates calendar, TK/K timing, and how to evaluate a school tour.',
    tag: 'Decision Framework',
    tagColor: 'bg-peach/10 text-peach',
  },
]

export default function GuidesPage() {
  useEffect(() => {
    document.title = 'Guides | EarlyScouts'
    return () => { document.title = 'EarlyScouts - For parents who plan ahead.' }
  }, [])

  return (
    <main>
      <Nav />

      <section className="bg-cream min-h-[30vh] px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <span className="text-xs font-mono uppercase tracking-widest text-peach">Transfer & Enrollment Guides</span>
            <h1 className="font-serif text-4xl text-charcoal mt-2 mb-3">
              School Guides &amp; Blueprints
            </h1>
            <p className="text-gray-500 text-base leading-relaxed max-w-xl">
              Step-by-step guides for navigating school transfers, permits, and enrollment on the LA Westside.
              Written for parents, not administrators.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={guide.slug}
                className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col gap-2 hover:border-scout-green hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-full ${guide.tagColor}`}>
                    {guide.tag}
                  </span>
                  <span className="text-xs text-gray-400">{guide.district}</span>
                </div>
                <h2 className="font-serif text-xl text-charcoal group-hover:text-scout-green transition-colors">
                  {guide.title}
                </h2>
                <p className="text-sm text-gray-500 leading-relaxed">{guide.description}</p>
                <span className="text-xs font-semibold text-peach mt-1">Read the guide →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
