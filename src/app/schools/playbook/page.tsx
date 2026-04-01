'use client'

import { useEffect, useRef, useState } from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'
import Link from 'next/link'

// ── Chapter definitions ───────────────────────────────────────────────────────

const CHAPTERS = [
  { id: 'options',    number: '01', title: 'Understanding Your Options' },
  { id: 'permits',   number: '02', title: 'The LAUSD Permit System' },
  { id: 'smmusd',    number: '03', title: 'The SMMUSD Transfer Strategy' },
  { id: 'tk',        number: '04', title: 'TK and Kindergarten' },
  { id: 'framework', number: '05', title: 'Your Decision Framework' },
  { id: 'calendar',  number: '06', title: 'Key Dates Calendar' },
]

const KEY_DATES = [
  { date: 'Sep 2026',           event: 'Private school tours begin',                        notes: 'Private school families' },
  { date: 'Oct 2026',           event: 'LAUSD Choices/Magnet applications open',             notes: 'LAUSD magnet families' },
  { date: 'Nov 2026',           event: 'LAUSD Choices on-time deadline',                    notes: 'LAUSD magnet families' },
  { date: 'Nov 2026',           event: 'Private school applications open',                  notes: 'Private school families' },
  { date: 'Fall 2026',          event: 'Charter school applications open (SchoolMint)',      notes: 'Charter families' },
  { date: 'Jan 2027',           event: 'SMMUSD TK/K Roundup',                               notes: 'SMMUSD residents' },
  { date: 'Jan – Feb 2027',     event: 'Private school applications due',                   notes: 'Private school families' },
  { date: 'Feb 1, 2027',        event: 'LAUSD outgoing inter-district permit window opens', notes: 'Transfer families' },
  { date: 'Feb 2027',           event: 'LAUSD first-round magnet offers',                   notes: 'Magnet families' },
  { date: 'Late Feb / Mar 2027', event: 'Charter school lotteries (CWC, Larchmont, etc.)', notes: 'Charter families' },
  { date: 'Feb – Mar 2027',     event: 'Private school decisions',                          notes: 'Private school families' },
  { date: 'Apr 30, 2027',       event: 'LAUSD outgoing permit window closes',               notes: 'Transfer families' },
  { date: 'Jun 2027',           event: 'SMMUSD incoming permit applications open',          notes: 'Transfer families' },
  { date: 'Aug 2027',           event: 'School year begins',                                notes: 'Everyone' },
]

// ── Scroll-spy hook ───────────────────────────────────────────────────────────

function useActiveChapter(chapterIds: string[]) {
  const [active, setActive] = useState(chapterIds[0])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    chapterIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(id) },
        { rootMargin: '-20% 0px -70% 0px' }
      )
      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [chapterIds])

  return active
}

// ── Components ────────────────────────────────────────────────────────────────

function ChapterHeading({ id, number, title }: { id: string; number: string; title: string }) {
  return (
    <div id={id} className="scroll-mt-24 pt-14 pb-4 border-b border-gray-200 mb-8">
      <span className="text-xs font-mono uppercase tracking-widest text-scout-green">Chapter {number}</span>
      <h2 className="font-serif text-3xl sm:text-4xl text-charcoal mt-2">{title}</h2>
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="font-serif text-xl text-charcoal mt-10 mb-3">{children}</h3>
}

function Callout({ children, accent = 'green' }: { children: React.ReactNode; accent?: 'green' | 'amber' }) {
  const colors = accent === 'green'
    ? 'bg-scout-green/5 border-scout-green/30 text-charcoal'
    : 'bg-amber-50 border-amber-200 text-charcoal'
  return (
    <div className={`border-l-4 rounded-r-xl px-5 py-4 my-6 text-sm leading-relaxed ${colors}`}>
      {children}
    </div>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5 my-4 ml-1">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
          <span className="text-scout-green shrink-0 mt-1 text-xs">●</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5 my-4 ml-1">
      {items.map((item, i) => (
        <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
          <span className="text-scout-green shrink-0 font-mono text-xs mt-0.5 w-4">{i + 1}.</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PlaybookPage() {
  const activeChapter = useActiveChapter(CHAPTERS.map((c) => c.id))

  useEffect(() => {
    document.title = 'LA School Selection Playbook | EarlyScouts'
    return () => { document.title = 'EarlyScouts - For parents who plan ahead.' }
  }, [])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className="bg-cream min-h-screen">
      <Nav />

      {/* Paywall banner */}
      <div className="bg-charcoal text-white px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
          <p className="text-gray-300">
            <span className="text-white font-semibold">This guide is included with Scout Access.</span>
            {' '}Unlock full academic data, AI sentiment analysis, and every future playbook.
          </p>
          <Link
            href="/pricing"
            className="shrink-0 bg-scout-green hover:opacity-90 text-white font-semibold text-xs px-5 py-2 rounded-full transition-opacity whitespace-nowrap"
          >
            Get Scout Access →
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white border-b border-gray-100 px-4 py-14">
        <div className="max-w-3xl mx-auto">
          <span className="text-xs font-mono uppercase tracking-widest text-scout-green">Los Angeles</span>
          <h1 className="font-serif text-4xl sm:text-5xl text-charcoal mt-3 mb-4 leading-tight">
            The LA School Selection Playbook
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
            Your step-by-step guide to navigating LAUSD, SMMUSD, charters, and private schools
            in Los Angeles, from first research to enrollment day.
          </p>
          <div className="flex items-center gap-4 mt-6 text-xs font-mono text-gray-400">
            <span>6 chapters</span>
            <span>·</span>
            <span>~20 min read</span>
            <span>·</span>
            <span>Updated March 2026</span>
          </div>
        </div>
      </div>

      {/* Body: TOC sidebar + content */}
      <div className="max-w-5xl mx-auto px-4 py-12 flex gap-12 items-start">

        {/* Sticky TOC — desktop only */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-24">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-4">Contents</p>
          <nav className="flex flex-col gap-1">
            {CHAPTERS.map((c) => (
              <button
                key={c.id}
                onClick={() => scrollTo(c.id)}
                className={`text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  activeChapter === c.id
                    ? 'bg-scout-green/10 text-scout-green font-semibold'
                    : 'text-gray-500 hover:text-charcoal hover:bg-gray-100'
                }`}
              >
                <span className="font-mono text-xs mr-2 opacity-50">{c.number}</span>
                {c.title}
              </button>
            ))}
          </nav>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400 leading-relaxed">
              Use EarlyScouts to compare specific schools mentioned in this guide.
            </p>
            <Link href="/schools" className="text-xs text-scout-green font-semibold mt-2 block hover:opacity-80">
              Browse Schools →
            </Link>
          </div>
        </aside>

        {/* Article content */}
        <article className="flex-1 min-w-0 max-w-2xl">

          {/* Intro */}
          <Body>
            If your child is turning 4 or 5 in the next 18 months, you&rsquo;re in the right place. This guide
            walks you through every school pathway available in Los Angeles County, the key deadlines you
            can&rsquo;t miss, and the strategies experienced families use to get into their top-choice schools.
            We update this playbook quarterly as policies change.
          </Body>

          {/* ── Chapter 1 ── */}
          <ChapterHeading id="options" number="01" title="Understanding Your Options" />

          <Body>
            Los Angeles families have more school options than almost anywhere in the country. That&rsquo;s
            both the opportunity and the overwhelm. Here&rsquo;s the landscape:
          </Body>

          <SectionHeading>Neighborhood Public Schools (LAUSD)</SectionHeading>
          <Body>
            Every address in LA is zoned to a specific neighborhood school. Your child is guaranteed a
            spot. To find yours, use the LAUSD Resident School Identifier at{' '}
            <span className="font-mono text-sm">apply.lausd.net</span>.
          </Body>
          <Body>
            Quality varies dramatically by neighborhood. Check test scores on EarlyScouts to see how your
            zoned school compares to alternatives. Some high-performing neighborhood schools (like
            Mar Vista Elementary and Beethoven Street Elementary) rival private schools academically.
          </Body>
          <Callout>
            <strong>Pros:</strong> Guaranteed admission, no application required, walkable, builds
            neighborhood community, free. <strong>Investigate:</strong> test score trends, principal
            tenure, and parent fundraising burden before deciding to pursue alternatives.
          </Callout>

          <SectionHeading>LAUSD Magnet Schools</SectionHeading>
          <Body>
            LAUSD runs over 200 magnet programs with specialized themes: STEM, arts, humanities, dual
            language. Admission is by lottery through the LAUSD Choices program. Magnets were originally
            designed for integration, so they factor in diversity goals, which means families in
            higher-income neighborhoods face a structural disadvantage, though not complete exclusion.
          </Body>
          <Body>
            <strong>Key timeline:</strong> Applications open in October; the on-time deadline is
            mid-November; first-round offers go out in February; waitlist movement continues through
            March–April. Apply early in the window (it doesn&rsquo;t improve your lottery odds, but
            late applications go to waitlist automatically). You can apply to multiple magnet programs.
            Sibling preference is strong.
          </Body>

          <SectionHeading>LAUSD Dual Language Immersion (DLE)</SectionHeading>
          <Body>
            Separate from magnets, DLE programs offer instruction in two languages, most commonly
            English-Spanish, but also English-Korean and English-Mandarin. These are among the most
            competitive programs in LAUSD.
          </Body>
          <Body>
            <strong>Notable Westside programs:</strong> Edison Language Academy (SMMUSD, English-Spanish,
            new campus), Broadway Elementary (English-Spanish), Beethoven Street Elementary (limited DLE
            strand). Note: Edison is SMMUSD, so it requires an inter-district transfer (see Chapter 2).
          </Body>

          <SectionHeading>Charter Schools</SectionHeading>
          <Body>
            Charters are free public schools that operate independently from LAUSD. They set their own
            curriculum, hire their own staff, and admit students by lottery. Quality ranges enormously;
            look for schools with at least five years of CAASPP data before committing.
          </Body>
          <Body>
            <strong>Popular Westside charters:</strong> Citizens of the World (CWC) Mar Vista (TK–8,
            diverse by design), CWC Hollywood, Silver Lake, East Valley, West Valley, Larchmont Charter
            (multiple campuses), WISH Charter (Westchester).
          </Body>
          <Body>
            <strong>CWC Lottery Timeline (2026–27):</strong> Applications open in Fall 2025 via
            SchoolMint; lotteries run in late February to early March 2026; results within two weeks
            via email. Applications after the lottery deadline go directly to waitlist.
          </Body>
          <Body><strong>CWC lottery priority order:</strong></Body>
          <NumberedList items={[
            'Siblings of current students',
            'Children of founding parents (capped at 10%)',
            'Students qualifying for free/reduced lunch',
            'Children of staff',
            'Students in the attendance area of the co-located public school',
            'All other LAUSD residents',
          ]} />
          <Callout>
            <strong>Scout Tip:</strong> Apply to multiple CWC campuses if you&rsquo;re flexible on location.
            Sibling priority is very strong: getting one child in essentially guarantees the second.
            TK enrollment at CWC guarantees Kindergarten admission the following year.
          </Callout>

          <SectionHeading>Private Schools</SectionHeading>
          <Body>
            LA has a deep private school market ranging from $15K to $40K+/year. Most require
            applications in the fall for the following year, with decisions by March. Financial aid is
            real and often substantial; do not self-select out of the process before talking to an
            admissions office.
          </Body>
          <Body>
            <strong>Westside private options to research:</strong> Wildwood School (progressive,
            arts-integrated), Brentwood School (traditional, competitive), PS1 Pluralistic
            (child-centered, Santa Monica), Turning Point School (progressive, Culver City),
            Westside Neighborhood School / WNS (new Playa Vista campus opening Fall 2026).
          </Body>

          <SectionHeading>SMMUSD Schools</SectionHeading>
          <Body>
            Santa Monica-Malibu Unified consistently outperforms LAUSD. If you live outside SMMUSD
            (Mar Vista, Venice, Palms, West LA) you can apply for an inter-district transfer to attend
            SMMUSD schools. This is one of the most sought-after strategies on the Westside.
          </Body>
          <Body>
            <strong>Why families pursue SMMUSD:</strong> The K–12 pipeline. SMMUSD elementary schools
            feed into John Adams Middle School (named a 2026 California Distinguished School) and then
            Santa Monica High School (Samohi). The quality is consistent from K through 12. LAUSD&rsquo;s
            equivalent Westside pipeline often ends at Venice High School, which drives the transfer demand.
          </Body>
          <Body>
            <strong>SMMUSD elementary schools:</strong> Edison Language Academy (dual immersion, new
            campus), Grant Elementary (bond-funded modernization underway), Franklin Elementary, Roosevelt
            Elementary, McKinley Elementary, Will Rogers Learning Community (IB program).
          </Body>


          {/* ── Chapter 2 ── */}
          <ChapterHeading id="permits" number="02" title="The LAUSD Permit System" />

          <Body>
            LAUSD has two types of permits that let students attend schools outside their neighborhood zone.
          </Body>

          <SectionHeading>Intra-District Permits (within LAUSD)</SectionHeading>
          <Body>
            Allows your child to attend a different LAUSD school than your zoned neighborhood school.
            Applications open February 1 for the following school year, and the window stays open
            year-round after that. Both the sending and receiving schools must approve, subject to
            space and staffing availability.
          </Body>
          <Body>
            Use this if a nearby LAUSD school (but not your zoned school) has a program you want, such as
            a GATE program, a strong STEM focus, or a specific teacher cohort. In practice, permits are
            easiest to get at schools with declining enrollment (ask yourself why) and nearly impossible
            at oversubscribed Westside schools.
          </Body>

          <SectionHeading>Inter-District Permits (crossing district lines)</SectionHeading>
          <Body>
            This is the most important path: how families in LAUSD boundaries get their kids into SMMUSD, Beverly
            Hills Unified, or Culver City Unified. It&rsquo;s a <em>two-step sequential process</em>:
          </Body>
          <Body>
            <strong>Step 1 - LAUSD Outgoing Permit:</strong> Application window runs February 1 through
            April 30. Apply online only at{' '}
            <span className="font-mono text-sm">permits.lausd.net</span>{' '}
            (paper applications not accepted). You can only apply to <em>one</em> outside district per year.
            Decisions typically take 30–60 days.
          </Body>
          <Body>
            <strong>Step 2 - SMMUSD Incoming Permit:</strong> SMMUSD&rsquo;s application window for fall
            enrollment opens June 23. Decisions within 60 days of a completed application. Applications
            after August 22 are considered late and reviewed pending available space.
          </Body>
          <Callout accent="amber">
            <strong>Critical timing:</strong> You need the LAUSD outgoing permit <em>first</em> before
            SMMUSD will process your incoming application. The timelines are tight. Many parents miss
            the LAUSD window and lose a full year.
          </Callout>

          <SectionHeading>SMMUSD Permit Priority Order</SectionHeading>
          <NumberedList items={[
            'Current SMMUSD students (continuing enrollment)',
            'Siblings of current students',
            'Children of SMMUSD employees',
            'Child care within SMMUSD boundaries',
            'Parent works in Santa Monica or Malibu',
            'Other / Opportunity (Malibu schools only)',
            'Change of residence (currently enrolled students)',
          ]} />
          <Body>
            Having a specific, documented reason (childcare in Santa Monica, parent workplace, Edison&rsquo;s
            dual immersion program) strengthens your application significantly. Edison is particularly
            competitive because of the DLE program.
          </Body>

          <SectionHeading>Zones of Choice</SectionHeading>
          <Body>
            LAUSD&rsquo;s Zones of Choice allow students within a designated zone to attend{' '}
            <em>any</em> school in that zone, regardless of which neighborhood school they&rsquo;re
            actually zoned for. This is separate from permits and magnets. Check{' '}
            <span className="font-mono text-sm">apply.lausd.net</span>{' '}
            to see if your address falls within a Zone of Choice.
          </Body>

          <SectionHeading>Open Enrollment (AB-1114)</SectionHeading>
          <Body>
            LAUSD&rsquo;s K–12 Open Enrollment Transfer Program allows families to apply to schools that
            have identified available seats. This is another option if your neighborhood school
            isn&rsquo;t working and you haven&rsquo;t pursued the magnet or permit routes.
          </Body>


          {/* ── Chapter 3 ── */}
          <ChapterHeading id="smmusd" number="03" title="The SMMUSD Transfer Strategy" />

          <Body>
            This deserves its own chapter because it&rsquo;s the most asked-about strategy on the Westside.
          </Body>

          <SectionHeading>Why Families Do This</SectionHeading>
          <Body>
            The SMMUSD pipeline is: Elementary (K–5) → John Adams Middle (6–8) → Santa Monica High /
            Samohi (9–12). The quality is consistently high across all three levels. For LAUSD Westside
            families, the equivalent pipeline often ends at Venice High School, which drives the transfer
            demand.
          </Body>

          <SectionHeading>The Realistic Timeline</SectionHeading>
          <Body>
            If your child is entering TK in Fall 2027:
          </Body>
          <BulletList items={[
            'February 2027: Apply for LAUSD outgoing inter-district permit (window: Feb 1 – Apr 30)',
            'April–May 2027: Receive LAUSD outgoing decision',
            'June 2027: Apply to SMMUSD incoming permit (window opens June 23)',
            'July–August 2027: Receive SMMUSD decision',
            'August 2027: School starts',
          ]} />

          <SectionHeading>What Strengthens Your Application</SectionHeading>
          <BulletList items={[
            'Child care provider located in Santa Monica',
            'Parent workplace in Santa Monica or Malibu',
            'Sibling already enrolled in SMMUSD',
            'Documented connection to the SMMUSD community',
            'Specific program need (Edison dual immersion)',
          ]} />

          <Callout>
            <strong>Scout Tip:</strong> Apply to two or three SMMUSD schools simultaneously rather than
            one. Your child can only attend one school, but applying to multiple programs increases the
            probability that at least one accepts the transfer.
          </Callout>

          <SectionHeading>Breaking News: SMMUSD Splitting Into Two Districts</SectionHeading>
          <Body>
            In December 2025, the SMMUSD board voted unanimously (7–0) to approve agreements to separate
            into the Santa Monica Unified School District (SMUSD) and the Malibu Unified School District
            (MUSD). This is pending state legislative approval and city council votes. If finalized, this
            could affect inter-district transfer policies, boundaries, and capacity. EarlyScouts is
            tracking this closely and will update this playbook as details emerge.
          </Body>
          <Callout accent="amber">
            <strong>Watch out:</strong> If the district split is finalized before your transfer application,
            verify which district governs your target school and apply to that new district directly.
            Policies established under SMMUSD may not carry over unchanged.
          </Callout>


          {/* ── Chapter 4 ── */}
          <ChapterHeading id="tk" number="04" title="TK and Kindergarten" />

          <SectionHeading>TK Eligibility</SectionHeading>
          <Body>
            California&rsquo;s Universal TK program is now available to all 4-year-olds. For the 2026–27
            school year, your child is eligible for TK if they turn 5 between September 2, 2026 and
            September 1, 2027. For Kindergarten, your child must turn 5 on or before September 1 of
            the enrollment year.
          </Body>

          <SectionHeading>Why TK Matters for Your School Decision</SectionHeading>
          <Body>
            TK is not just a free preschool year; it is your point of entry into the school. In most
            LAUSD elementary schools, a child enrolled in TK has a sibling-priority pathway for all future
            siblings. More importantly, you get a full year to evaluate whether the school is the right
            fit before your child is formally in the K–8 pipeline.
          </Body>
          <Body>
            This means the TK enrollment decision deserves just as much research as the kindergarten
            decision. Parents who treat TK as &ldquo;just preschool&rdquo; and enroll wherever is most
            convenient sometimes find themselves locked into a school they did not fully vet.
          </Body>

          <SectionHeading>SMMUSD TK/K Roundup</SectionHeading>
          <Body>
            SMMUSD holds an annual TK/K Roundup event (most recently January 22, 2026) where families
            can learn about the enrollment process, visit schools, and begin registration. Registration
            takes place at your neighborhood school. If you are pursuing an SMMUSD inter-district
            transfer for TK, this event is worth attending to understand timelines firsthand.
          </Body>

          <SectionHeading>Private TK Programs</SectionHeading>
          <Body>
            Many private schools offer pre-K and TK programs. Acceptance into the TK program typically
            provides priority or guaranteed admission for Kindergarten, a common strategy for
            families targeting competitive private schools. Note that private school TK is full tuition
            ($15K–$30K+), compared to state-funded public TK which is free.
          </Body>
          <Body>
            Not every public elementary school has a TK classroom. LAUSD has been expanding TK capacity
            rapidly, but availability is uneven. SMMUSD offers TK at all of its elementary schools.
            Charter schools are not required to offer TK and many do not; CWC is an exception.
          </Body>


          {/* ── Chapter 5 ── */}
          <ChapterHeading id="framework" number="05" title="Your Decision Framework" />

          <Body>
            After researching schools, visiting campuses, and talking to families, you still have to make
            a decision with incomplete information. Here is how to structure it.
          </Body>

          <SectionHeading>Academic Fit</SectionHeading>
          <BulletList items={[
            'Look at test score trends: are scores rising or falling over 3 years?',
            'Check grade-level breakdowns: some schools are strong in K-2 but weaker in 3-5',
            'Compare subgroup performance if your child will be in a minority group at the school',
          ]} />

          <SectionHeading>Pipeline Quality</SectionHeading>
          <BulletList items={[
            'Where does this elementary feed for middle school?',
            'Where does that middle school feed for high school?',
            'Is the quality consistent across all three levels?',
          ]} />

          <SectionHeading>Practical Logistics</SectionHeading>
          <BulletList items={[
            'Drive time during morning rush: test it on a weekday',
            'After-school care availability and cost',
            'Summer program options',
            'Parent involvement expectations (some schools expect 40+ volunteer hours/year)',
          ]} />

          <SectionHeading>Community and Culture</SectionHeading>
          <BulletList items={[
            'Visit during drop-off and pickup to observe parent dynamics',
            'Read EarlyScouts\'s AI sentiment analysis for unfiltered parent perspectives',
            'Check if the school\'s diversity matches what you want for your child',
            'Ask about how bullying and behavioral issues are handled',
          ]} />

          <SectionHeading>Financial Reality</SectionHeading>
          <BulletList items={[
            'Public school: free tuition, but factor in donations, after-school, supplies',
            'Charter: free tuition, similar ancillary costs',
            'Private: $15K–$40K+/year tuition, plus uniforms, activities, fundraising',
            'SMMUSD transfer: free tuition, but potential commute costs',
          ]} />

          <Callout>
            <strong>Framework:</strong> The families who are happiest with their choice rated each school
            on three dimensions: (1) academic fit for their specific child, (2) practical fit for their
            family, and (3) confidence in school leadership and trajectory. A school that scores highly
            on all three is the right choice, even if its average test scores are not the highest on
            your list.
          </Callout>
          <Body>
            Most parents research schools by asking &ldquo;is this a good school?&rdquo; The more useful
            question is &ldquo;is this the right school for my specific child, in my specific circumstances,
            right now?&rdquo; And the second question: &ldquo;Can I get out if it is not working?&rdquo;
            Public school enrollment in California has more flexibility than most parents realize. If a
            school is not working, you can request a transfer, re-enter the magnet lottery the following
            year, or apply to private schools mid-year. Understanding your exit options before you enroll
            reduces the anxiety of the initial decision significantly.
          </Body>


          {/* ── Chapter 6 ── */}
          <ChapterHeading id="calendar" number="06" title="Key Dates Calendar" />

          <Body>
            LA school enrollment is a multi-front campaign with deadlines that span eight months.
            Missing the LAUSD magnet deadline does not mean missing your child&rsquo;s neighborhood school
            slot, but it does mean losing access to the full option set for that year. Use this calendar
            as your master planning document for the <strong>2026–27 school year</strong>.
          </Body>

          {/* Key dates table */}
          <div className="rounded-2xl overflow-hidden border border-gray-200 my-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-charcoal text-white">
                  <th className="text-left px-5 py-3.5 font-semibold w-36 shrink-0">When</th>
                  <th className="text-left px-5 py-3.5 font-semibold">What</th>
                  <th className="text-left px-5 py-3.5 font-semibold hidden sm:table-cell">Who</th>
                </tr>
              </thead>
              <tbody>
                {KEY_DATES.map((row, i) => (
                  <tr key={`${row.date}-${row.event}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-5 py-3.5 font-mono text-xs text-scout-green font-semibold align-top whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="px-5 py-3.5 text-charcoal align-top font-medium">
                      {row.event}
                      <p className="sm:hidden text-gray-500 font-normal mt-1 text-xs">{row.notes}</p>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 align-top hidden sm:table-cell">
                      {row.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Callout>
            <strong>Reminder:</strong> Dates shift slightly year to year. Always verify exact deadlines
            at <span className="font-mono">lausd.net</span>,{' '}
            <span className="font-mono">smmusd.org</span>, and individual school websites before the
            enrollment season begins.
          </Callout>

          <Body>
            The families who navigate LA school enrollment best treat it as a project rather than a
            decision. Build a spreadsheet. Set calendar reminders for every deadline above. Assign one
            parent to own each track: magnet lottery, permit request, private school applications.
            The process is designed to reward effort, which means it rewards preparation.
          </Body>

        </article>
      </div>

      {/* CTA section */}
      <div className="bg-charcoal py-16 px-4 mt-4">
        <div className="max-w-2xl mx-auto text-center flex flex-col items-center gap-5">
          <span className="text-xs font-mono uppercase tracking-widest text-scout-green">Next Step</span>
          <h2 className="font-serif text-3xl sm:text-4xl text-white leading-tight">
            Ready to compare schools?
          </h2>
          <p className="text-gray-400 leading-relaxed">
            Start your research on EarlyScouts. Search any LA zip code to see test score trends,
            parent sentiment, district intel, and side-by-side school comparisons.
          </p>
          <Link
            href="/schools"
            className="bg-scout-green hover:opacity-90 text-white font-semibold px-8 py-3.5 rounded-full transition-opacity text-sm"
          >
            Start Your Research →
          </Link>
        </div>
      </div>

      <Footer />
    </main>
  )
}
