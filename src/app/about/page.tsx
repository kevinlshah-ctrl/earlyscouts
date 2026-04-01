import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export default function AboutPage() {
  return (
    <main className="bg-[#FFFAF6]">
      <Nav />

      {/* Hero */}
      <section className="px-4 pt-16 pb-10 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <span className="text-6xl">👨‍👩‍👧‍👦</span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#1A1A2E] leading-tight">
            Built by LA families, for LA families.
          </h1>
          <p className="text-[#6E6A65] text-base leading-relaxed max-w-xl">
            We're a small group of parents who got tired of piecing together school information from 15 different tabs at midnight.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="px-4 pb-14">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          <p className="text-[#3D3A36] text-base leading-[1.8]">
            It started the way it probably started for you, at a daycare pickup, a weekend brunch, a dinner party. Someone mentions a school name. You nod like you know what they're talking about. Then you go home and spend three hours trying to figure out what SMMUSD stands for, whether your address qualifies for a permit, and why the school with a 5 rating on one site has a 9 on another.
          </p>

          <p className="text-[#3D3A36] text-base leading-[1.8]">
            We're three families in Los Angeles, some of us in the LAUSD system, some navigating charters, some weighing the private vs. public decision for the first time. A couple of our kids are already in school. A couple aren't there yet. All of us have spent way too many hours on this. We built EarlyScouts for ourselves first: one place where every school we were considering had real test score context, honest parent reviews, and a clear pipeline map showing where kindergarten leads by high school.
          </p>

          <p className="text-[#3D3A36] text-base leading-[1.8]">
            Then our friends started asking for help. Someone was moving to LA from New York and needed to understand neighborhoods. Someone else almost missed the LAUSD permit deadline by two days. Another friend didn't realize their dream school required an orientation they'd never heard about. We kept sharing our research, and eventually we thought: why not make this available to every family going through it?
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="border-t border-[#E8E5E1]" />
      </div>

      {/* What we believe */}
      <section className="px-4 py-14">
        <div className="max-w-2xl mx-auto flex flex-col gap-5">
          <h2 className="font-serif text-2xl text-[#1A1A2E]">What we believe</h2>

          <p className="text-[#3D3A36] text-base leading-[1.8]">
            We're not here to tell you which school is right for your child. That's your call. Nobody knows your kid better than you. What we can do is make sure you have every piece of information, every deadline, every comparison, and every parent perspective in one place, so that when you make that decision, you feel confident in it.
          </p>

          <p className="text-[#3D3A36] text-base leading-[1.8]">
            School systems are complicated on purpose. Permit windows, priority categories, lottery tiers, transfer playbooks. It can feel like you need a consultant just to understand the basics. We're trying to decode all of that and lay it out simply, so you can stop researching and start executing.
          </p>

          <p className="text-[#3D3A36] text-base leading-[1.8]">
            From our families to yours, we hope this helps you feel less stressed and more prepared. Your kids deserve a parent who feels confident about the path they've chosen. That's what we're building toward.
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="border-t border-[#E8E5E1]" />
      </div>

      {/* Sign-off */}
      <section className="px-4 py-14 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-3">
          <p className="text-[#3D3A36] text-base font-medium">Made with ❤️ in Los Angeles</p>
          <a
            href="mailto:hello@earlyscouts.com"
            className="text-[#5B9A6F] font-semibold hover:text-[#4a8a5e] transition-colors text-sm"
          >
            hello@earlyscouts.com
          </a>
          <p className="text-[#9B9690] text-sm">Have feedback? We read every message.</p>
        </div>
      </section>

      <Footer />
    </main>
  )
}
