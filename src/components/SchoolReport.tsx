'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type {
  School,
  ContentBlock,
  ParagraphBlock,
  HeadingBlock,
  CalloutBlock,
  StatsGridBlock,
  ScoreBarsBlock,
  PhotoBlock,
  PhotoGridBlock,
  FeederFlowBlock,
  ComparisonTableBlock,
  TourQuestionsBlock,
  TimelineBlock,
  AlertItem,
  RelatedSchoolItem,
} from '@/lib/types'
import styles from './SchoolReport.module.css'
import Footer from './Footer'
import { useAuth, hasActiveAccess } from '@/lib/auth-context'
import CheckoutButton from '@/app/pricing/CheckoutButton'

// ── Slug resolution — maps short/legacy slugs to actual database IDs ─────────

const SLUG_MAP: Record<string, string> = {
  'mar-vista-elementary':                   'mar-vista-elementary-school-los-angeles-ca',
  'grand-view-blvd-elementary':             'grand-view-boulevard-elementary-school-los-angeles-ca',
  'grand-view-boulevard-elementary':        'grand-view-boulevard-elementary-school-los-angeles-ca',
  'walgrove-avenue-elementary':             'walgrove-avenue-elementary-school-los-angeles-ca',
  'walgrove-elementary':                    'walgrove-avenue-elementary-school-los-angeles-ca',
  'beethoven-street-elementary':            'beethoven-street-elementary-school-los-angeles-ca',
  'beethoven-elementary':                   'beethoven-street-elementary-school-los-angeles-ca',
  'stoner-avenue-elementary':               'stoner-avenue-elementary-school-culver-city-ca',
  'edison-language-academy':                'edison-language-academy-santa-monica-ca',
  'mark-twain-middle-school':               'mark-twain-middle-school-los-angeles-ca',
  'mark-twain-middle':                      'mark-twain-middle-school-los-angeles-ca',
  'palms-middle-school':                    'palms-middle-school-los-angeles-ca',
  'palms-middle':                           'palms-middle-school-los-angeles-ca',
  'venice-high-school':                     'venice-high-school-los-angeles-ca',
  'venice-high':                            'venice-high-school-los-angeles-ca',
  'cwc-mar-vista':                          'cwc-mar-vista-los-angeles-ca',
}

function resolveSlug(slug: string): string {
  return SLUG_MAP[slug] ?? slug
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseInlineMarkdown(text: string | null | undefined): React.ReactNode[] {
  if (!text) return []
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

const ALERT_ICON_MAP: Record<string, string> = {
  calendar:     '📅',
  construction: '🏗️',
  star:         '⭐',
  info:         '📌',
  warning:      '⚠️',
  school:       '🏫',
  clock:        '🕐',
  money:        '💰',
  book:         '📚',
  check:        '✅',
  people:       '👥',
}

// ── Stat Tooltips ────────────────────────────────────────────────────────────

const STAT_TOOLTIPS: Record<string, string> = {
  'Math':                       "The % of students who scored 'proficient' or above on the California CAASPP math test. The LAUSD average is 37% and the CA average is also 37%. A score of 60%+ is strong; 80%+ is exceptional.",
  'Math Proficiency':           "The % of students who scored 'proficient' or above on the California CAASPP math test. The LAUSD average is 37% and the CA average is also 37%. A score of 60%+ is strong; 80%+ is exceptional.",
  'Reading':                    "The % of students who scored 'proficient' or above on the California CAASPP English Language Arts test. The LAUSD average is 46% and the CA average is 49%.",
  'ELA':                        "The % of students who scored 'proficient' or above on the California CAASPP English Language Arts test. The LAUSD average is 46% and the CA average is 49%.",
  'ELA Proficiency':            "The % of students who scored 'proficient' or above on the California CAASPP English Language Arts test. The LAUSD average is 46% and the CA average is 49%.",
  'Science':                    "The % proficient on the CA CAST science assessment. LAUSD average is 27%, CA average is 33%. Tested in 5th and 8th grade only.",
  'Science Proficiency':        "The % proficient on the CA CAST science assessment. LAUSD average is 27%, CA average is 33%. Tested in 5th and 8th grade only.",
  'Student:Teacher':            "Students per full-time teacher. Lower means more individual attention. The CA average is 21:1. This is a school-wide ratio; actual class size may be higher.",
  'Student:Teacher Ratio':      "Students per full-time teacher. Lower means more individual attention. The CA average is 21:1. This is a school-wide ratio; actual class size may be higher.",
  'Students':                   "Total enrolled students this year. Schools under 300 tend to feel more intimate. Schools over 500 typically offer more programs and extracurriculars.",
  'Enrollment':                 "Total enrolled students this year. Schools under 300 tend to feel more intimate. Schools over 500 typically offer more programs and extracurriculars.",
  'Low Income':                 "% of students qualifying for Free or Reduced-Price Lunch (FRPL). Important context for test scores: comparing a 10%-FRPL school to a 90%-FRPL school without noting this gap is misleading.",
  'FRPL':                       "% of students qualifying for Free or Reduced-Price Lunch, a common measure of economic need. High-FRPL schools face very different challenges than low-FRPL schools.",
  'Economically Disadvantaged': "% of students qualifying for Free or Reduced-Price Lunch, a common measure of economic need. High-FRPL schools face very different challenges than low-FRPL schools.",
  'GreatSchools':               "Rated 1–10 based on test scores, student growth over time, and equity. A 7+ is strong. A school can score high even with modest test scores if students are making exceptional progress.",
  'GS':                         "Rated 1–10 based on test scores, student growth over time, and equity. A 7+ is strong. A school can score high even with modest test scores if students are making exceptional progress.",
  'Niche Grade':                "Niche grades schools A+ through F using test scores, parent/student reviews, teacher quality, and more. Data comes from the U.S. Department of Education plus millions of user reviews.",
  'CA State Ranking':           "Rank among all ~5,800 CA public elementary schools (SchoolDigger). 'Top 5%' means this school outperforms 95% of all elementary schools statewide.",
  'CA Ranking':                 "Rank among all ~5,800 CA public elementary schools (SchoolDigger). 'Top 5%' means this school outperforms 95% of all elementary schools statewide.",
  'LAUSD Ranking':              "Rank among 487 LAUSD elementary schools, the 2nd-largest school district in the US.",
  'Spending/Student':           "Total annual spending per student including all federal, state, and local funding. The LAUSD average is ~$17,000 per student.",
  'Per Student Spending':       "Total annual spending per student including all federal, state, and local funding. The LAUSD average is ~$17,000 per student.",
  'Avg Standard Score':         "SchoolDigger's normalized score comparing state test results. Above 50 = above average statewide. Above 90 = exceptional.",
  'Graduation':                 "% of students earning a diploma within 4 years of starting 9th grade. The CA average is ~87%.",
  'Graduation Rate':            "% of students earning a diploma within 4 years of starting 9th grade. The CA average is ~87%.",
  'AP Rate':                    "% of students taking at least one AP course. High participation signals a strong academic culture and college readiness.",
  'AP Participation':           "% of students taking at least one AP course. High participation signals a strong academic culture and college readiness.",
  '90-10 Model':                "Dual language model: 90% target language / 10% English in kindergarten, shifting toward 50-50 by upper elementary. English scores may look lower in early grades; this is expected and temporary.",
  '50-50 Model':                "Dual language model: instruction split evenly between English and the target language from day one. Students have two teachers and alternate between languages.",
  '50/50 Model':                "Dual language model: instruction split evenly between English and the target language from day one. Students have two teachers and alternate between languages.",
  'Dual Language':              "Students learn academic content in two languages. Programs need a mix of native English and native target-language speakers in each class to work as designed.",
  'DL':                         "Students learn academic content in two languages. Programs need a mix of native English and native target-language speakers in each class to work as designed.",
  'Chapters':                   "The number of chapters in this guide. Designed to be read start-to-finish or used as a reference: permits, timelines, priority tiers, appeal processes, and more.",
  'Sections':                   "The number of chapters in this guide. Designed to be read start-to-finish or used as a reference: permits, timelines, priority tiers, appeal processes, and more.",
}

function StatTooltip({ label }: { label: string }) {
  const tip = STAT_TOOLTIPS[label]
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  if (!tip) return null

  return (
    <span
      ref={ref}
      className={styles.tooltipWrapper}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        className={styles.tooltipTrigger}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        aria-label={`About ${label}`}
        type="button"
      >
        ⓘ
      </button>
      {open && (
        <span className={styles.tooltipBox} role="tooltip">
          {tip}
          <span className={styles.tooltipArrow} />
        </span>
      )}
    </span>
  )
}

// ── Block Renderers ───────────────────────────────────────────────────────────

function RenderParagraph({ block }: { block: ParagraphBlock }) {
  return (
    <p className={styles.para}>
      {parseInlineMarkdown(block.text)}
    </p>
  )
}

function RenderHeading({ block }: { block: HeadingBlock }) {
  return <h3 className={styles.sectionH3}>{block.text}</h3>
}

function RenderCallout({ block }: { block: CalloutBlock }) {
  const variantClass =
    block.variant === 'amber' ? styles.calloutAmber
    : block.variant === 'red' ? styles.calloutRed
    : block.variant === 'sky' ? styles.calloutSky
    : ''
  const labelClass =
    block.variant === 'amber' ? styles.calloutLabelAmber
    : block.variant === 'red' ? styles.calloutLabelRed
    : block.variant === 'sky' ? styles.calloutLabelSky
    : ''
  return (
    <div className={`${styles.callout} ${variantClass}`}>
      <div className={`${styles.calloutLabel} ${labelClass}`}>{block.label}</div>
      <p className={styles.calloutText}>{parseInlineMarkdown(block.text)}</p>
    </div>
  )
}

function RenderStatsGrid({ block }: { block: StatsGridBlock }) {
  return (
    <div className={styles.statsGrid}>
      {block.items.map((item, i) => (
        <div key={i} className={styles.statBox}>
          <div className={styles.statLabel}>
            {item.label}
            <StatTooltip label={item.label} />
          </div>
          <div className={`${styles.statValue} ${item.green ? styles.statValueGreen : ''}`}>
            {item.value}
          </div>
          {item.context && <div className={styles.statContext}>{item.context}</div>}
        </div>
      ))}
    </div>
  )
}

function RenderScoreBars({ block }: { block: ScoreBarsBlock }) {
  const colorClass: Record<string, string> = {
    green: styles.scoreBarGreen,
    sky:   styles.scoreBarSky,
    peach: styles.scoreBarPeach,
    honey: styles.scoreBarHoney,
    gray:  styles.scoreBarGray,
  }
  return (
    <div>
      {block.items.map((item, i) => (
        <div key={i} className={styles.scoreRow}>
          <div className={`${styles.scoreLabel} ${block.wide_labels ? styles.scoreLabelWide : ''}`}>
            {item.label}
          </div>
          <div className={styles.scoreBarBg}>
            <div
              className={`${styles.scoreBar} ${colorClass[item.color] || styles.scoreBarGreen}`}
              style={{ width: `${Math.min(item.pct, 100)}%` }}
            />
          </div>
          <div className={styles.scorePct}>{item.pct}%</div>
        </div>
      ))}
      {block.source && <div className={styles.scoreSource}>Source: {block.source}</div>}
    </div>
  )
}

function RenderPhoto({ block }: { block: PhotoBlock }) {
  return (
    <div className={styles.photoBlock}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={block.src} alt={block.alt} />
      {block.caption && <div className={styles.photoCaption}>{block.caption}</div>}
    </div>
  )
}

function RenderPhotoGrid({ block }: { block: PhotoGridBlock }) {
  return (
    <div className={styles.photoGrid}>
      {block.photos.map((p, i) => (
        <div key={i} className={styles.photoBlock}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={p.alt} className={styles.photoGridImg} />
          {p.caption && <div className={styles.photoCaption}>{p.caption}</div>}
        </div>
      ))}
    </div>
  )
}

function RenderFeederFlow({ block }: { block: FeederFlowBlock }) {
  return (
    <div className={styles.feederFlow}>
      {block.schools.map((school, i) => {
        const boxClass =
          school.level === 'current' ? styles.feederBoxCurrent
          : school.level === 'middle' ? styles.feederBoxMiddle
          : styles.feederBoxHigh
        const nameEl = school.slug
          ? <Link href={`/schools/${resolveSlug(school.slug)}`} className={styles.feederLink}>{school.name}</Link>
          : school.name
        return (
          <div key={i}>
            {i > 0 && !block.schools[i - 1]?.is_or && (
              <div className={styles.feederArrow}>↓</div>
            )}
            {block.schools[i - 1]?.is_or && (
              <div className={styles.feederOr}>or</div>
            )}
            <div className={`${styles.feederBox} ${boxClass}`}>
              {nameEl}
              {school.detail && <div className={styles.feederSub}>{school.detail}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function RenderComparisonTable({ block }: { block: ComparisonTableBlock }) {
  return (
    <div className={styles.compTableWrap}>
    <table className={styles.compTable}>
      <thead>
        <tr>
          {block.columns.map((col, i) => <th key={i}>{col}</th>)}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i} className={row.highlight ? styles.compTableHighlight : ''}>
            {row.cells.map((cell, j) => (
              <td key={j} className={j === 0 ? styles.compTableSchoolName : ''}>
                {j === 0 && row.slug
                  ? <Link href={`/schools/${resolveSlug(row.slug)}`} className={styles.compLink}>{cell}</Link>
                  : cell
                }
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

function RenderTourQuestions({ block }: { block: TourQuestionsBlock }) {
  return (
    <div className={styles.tourCard}>
      <h3 className={styles.tourCardTitle}>{block.title}</h3>
      <div className={styles.tourCardSub}>{block.subtitle}</div>
      {block.questions.map((q, i) => (
        <div key={i} className={styles.tourQ}>
          <div className={styles.tourQNum}>{String(i + 1).padStart(2, '0')}</div>
          <div className={styles.tourQText}>{q}</div>
        </div>
      ))}
    </div>
  )
}

function RenderTimeline({ block }: { block: TimelineBlock }) {
  return (
    <div className={styles.timeline}>
      {block.items.map((item, i) => (
        <div key={i} className={styles.timelineItem}>
          <div className={styles.timelineDate}>{item.date}</div>
          <div className={styles.timelineContent}>{item.text}</div>
        </div>
      ))}
    </div>
  )
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'paragraph':        return <RenderParagraph block={block} />
    case 'heading':          return <RenderHeading block={block} />
    case 'callout':          return <RenderCallout block={block} />
    case 'stats_grid':       return <RenderStatsGrid block={block} />
    case 'score_bars':       return <RenderScoreBars block={block} />
    case 'photo':            return <RenderPhoto block={block} />
    case 'photo_grid':       return <RenderPhotoGrid block={block} />
    case 'feeder_flow':      return <RenderFeederFlow block={block} />
    case 'comparison_table': return <RenderComparisonTable block={block} />
    case 'tour_questions':   return <RenderTourQuestions block={block} />
    case 'timeline':         return <RenderTimeline block={block} />
    case 'section_divider':  return <div className={styles.sectionDivider} />
    default: return null
  }
}

// ── Section ───────────────────────────────────────────────────────────────────

function ReportSectionComp({ section }: { section: import('@/lib/types').ReportSection }) {
  return (
    <div id={section.id} className={styles.section}>
      <div className={styles.sectionLabel}>
        <span className={styles.sectionNum}>{section.number}</span>
        {section.tag}
      </div>
      <h2 className={styles.sectionTitle}>{section.title}</h2>
      {section.subtitle && <div className={styles.sectionSubtitle}>{section.subtitle}</div>}
      {section.content.map((block, i) => (
        <ContentBlockRenderer key={i} block={block} />
      ))}
    </div>
  )
}

// ── Lazy Section ─────────────────────────────────────────────────────────────
// Renders a lightweight placeholder until the section is within 800px of the
// viewport, then swaps in the real content. This prevents the 30–60 s DOM-parse
// freeze that occurs when all playbook chapters mount simultaneously.

function LazySection({
  section,
  eager = false,
}: {
  section: import('@/lib/types').ReportSection
  eager?: boolean
}) {
  const [visible, setVisible] = useState(eager)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (eager || visible) return
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '800px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [eager, visible])

  if (visible) return <ReportSectionComp section={section} />

  // Placeholder — keeps the id so TOC anchor links resolve before content loads
  return <div ref={ref} id={section.id} style={{ minHeight: '600px' }} />
}

// ── Alerts Card ───────────────────────────────────────────────────────────────

function AlertsCard({ alerts }: { alerts: AlertItem[] }) {
  if (!alerts.length) return null
  return (
    <div className={styles.alertsCard}>
      <div className={styles.alertsLabel}>
        <span>⚡</span>
        Things to Know Right Now
      </div>
      {alerts.map((alert, i) => (
        <div key={i} className={styles.alertItem}>
          <div className={styles.alertIcon}>{ALERT_ICON_MAP[alert.icon] || alert.icon}</div>
          <div className={styles.alertContent}>
            <div className={styles.alertTitle}>{alert.title}</div>
            <div className={styles.alertText}>{alert.text}</div>
            {alert.cta_text && alert.cta_url && (
              alert.cta_url.startsWith('#') || alert.cta_url.startsWith('/')
                ? <Link href={alert.cta_url} className={styles.alertCta}>{alert.cta_text} →</Link>
                : <a href={alert.cta_url} target="_blank" rel="noopener noreferrer" className={styles.alertCta}>{alert.cta_text} →</a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Related Schools ───────────────────────────────────────────────────────────

function RelatedSchools({ schools }: { schools: RelatedSchoolItem[] }) {
  if (!schools.length) return null
  return (
    <div className={styles.relatedSection}>
      <div className={styles.relatedLabel}>
        Continue Researching
        <div className={styles.relatedLine} />
      </div>
      <div className={styles.relatedGrid}>
        {schools.map((s) => (
          <Link key={s.slug} href={`/schools/${resolveSlug(s.slug)}`} className={styles.relatedCard}>
            <div className={styles.relatedTag}>{s.tag}</div>
            <div className={styles.relatedName}>{s.name}</div>
            <div className={styles.relatedArrow}>→</div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function SchoolReport({
  school,
  forcePaywall = false,
}: {
  school: School
  forcePaywall?: boolean
}) {
  const data = school.reportData!
  const hero = data.hero ?? {}
  const quick_stats = data.quick_stats ?? []
  const sections = data.sections ?? []
  const verdict = data.verdict ?? { paragraphs: [], best_for: '', consider_alternatives: '' }

  // isGuide must be computed first — used to skip satellite image for playbooks/blueprints
  const isGuide = school.slug.includes('playbook') || school.slug.includes('blueprint') ||
    school.name.toLowerCase().includes('blueprint') || school.name.toLowerCase().includes('playbook')

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? 'AIzaSyCkqvCW3lrcveaWyD7MgNNYlucMzFH-C3s'
  const heroTyped = hero as import('@/lib/types').ReportHero
  const svQuery  = heroTyped.street_view_query || school.address || `${school.city}, CA`
  // Guides don't have real addresses — skip the satellite fetch to avoid a black hero.
  // The heroArea CSS gradient provides a clean fallback for guide pages.
  const heroImageUrl = !isGuide
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(svQuery)}&zoom=18&size=900x400&maptype=satellite&scale=2&key=${mapsKey}`
    : null

  // Accent stats go in the hero meta pills; all 4 stats go in the strip
  const accentStats = quick_stats.filter(s => s.accent)

  const schoolType = school.type || 'public'
  const typeLabel = schoolType.charAt(0).toUpperCase() + schoolType.slice(1)

  const { profile, user, signOut, isConfirmingAccess } = useAuth()
  // forcePaywall=true overrides even isGuide — used by server-gated guide pages
  // that have already stripped sections before sending to the client.
  // isConfirmingAccess is true while the post-Stripe webhook poll is in flight —
  // treat as paid to prevent the paywall from flashing before the DB update lands.
  const isPaid = !forcePaywall && (isGuide || hasActiveAccess(profile) || isConfirmingAccess)

  // ── Debug: log access state whenever it changes ───────────────────────────
  useEffect(() => {
    console.log('[SchoolReport] access state:', {
      slug:               school.slug,
      plan_type:          profile?.subscription_tier ?? 'none',
      access_expires_at:  profile?.access_expires_at ?? 'none',
      isConfirmingAccess,
      isPaid,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.subscription_tier, profile?.access_expires_at, isConfirmingAccess, isPaid])

  const [scrolled, setScrolled] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false)
  const headerDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!headerDropdownOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target as Node)) {
        setHeaderDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [headerDropdownOpen])

  const initials = (() => {
    const name = profile?.display_name ?? user?.email ?? ''
    if (profile?.display_name) {
      const parts = profile.display_name.trim().split(/\s+/)
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  })()
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Dynamic page title
  useEffect(() => {
    document.title = `${school.name} | EarlyScouts`
    return () => { document.title = 'EarlyScouts - For parents who plan ahead.' }
  }, [school.name])

  const relatedSchools = data.related_schools ?? []
  const isGuideSlug = (slug: string) => slug.includes('playbook') || slug.includes('blueprint')
  const isMiddleOrHigh = (s: RelatedSchoolItem) => {
    const tag = (s.tag ?? '').toLowerCase()
    const slug = s.slug.toLowerCase()
    return tag.includes('middle') || tag.includes('high') || slug.includes('middle') || slug.includes('high')
  }
  const elementarySchools = relatedSchools.filter((s) => !isMiddleOrHigh(s) && !isGuideSlug(s.slug))
  const middleHighSchools = relatedSchools.filter((s) => isMiddleOrHigh(s) && !isGuideSlug(s.slug))

  return (
    <>
      {/* ── Sticky Header ── */}
      <div className={`${styles.stickyHeader} ${scrolled ? styles.stickyHeaderScrolled : ''}`}>

        {/* Free preview banner — only for non-paid users on school pages */}
        {!isPaid && !bannerDismissed && (
          <div className={styles.previewBanner}>
            <span className={styles.previewBannerText}>
              Unlock all schools &amp; guides · $59.99
            </span>
            <Link href="/pricing" className={styles.previewBannerBtn}>
              Get Access
            </Link>
            <button
              onClick={() => setBannerDismissed(true)}
              className={styles.previewBannerDismiss}
              aria-label="Dismiss banner"
            >
              ×
            </button>
          </div>
        )}

        {/* Site Header */}
        <div className={styles.siteHeader}>
          <Link href="/" className={styles.siteHeaderLogo}>
            Early<span>Scouts</span>
          </Link>
          <nav className={styles.siteHeaderNav}>
            <Link href="/schools" className={styles.siteHeaderLink}>Schools</Link>
            <Link href="/guides" className={styles.siteHeaderLink}>Guides</Link>
            <Link href="/pricing" className={styles.siteHeaderLink}>Pricing</Link>
            <Link href="/about" className={styles.siteHeaderLink}>About</Link>
          </nav>
          <div className={styles.siteHeaderCtas}>
            {user ? (
              <div className={styles.headerAvatarWrap} ref={headerDropdownRef}>
                <button
                  onClick={() => setHeaderDropdownOpen(o => !o)}
                  className={styles.headerAvatar}
                  aria-label="Account menu"
                >
                  {initials}
                </button>
                {headerDropdownOpen && (
                  <div className={styles.headerDropdown}>
                    <Link
                      href="/profile"
                      className={styles.headerDropdownItem}
                      onClick={() => setHeaderDropdownOpen(false)}
                    >
                      My Profile
                    </Link>
                    <button
                      onClick={() => { setHeaderDropdownOpen(false); signOut() }}
                      className={styles.headerDropdownItem}
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/signin" className={styles.siteHeaderSignIn}>Sign In</Link>
                <Link href="/onboarding" className={styles.siteHeaderGetStarted}>Get Started</Link>
              </>
            )}
          </div>
        </div>

        {/* Related Schools Nav — grouped by level */}
        {relatedSchools.length > 0 && (
          <div className={styles.relatedNav}>
            {elementarySchools.length > 0 && (
              <div className={styles.relatedNavRow}>
                <span className={styles.relatedNavLabel}>Elementary:</span>
                <div className={styles.relatedNavScroll}>
                  {elementarySchools.map((rs, i) => (
                    <Link key={i} href={`/schools/${resolveSlug(rs.slug)}`} className={styles.relatedNavPill}>
                      {rs.name.replace(' Elementary School', '').replace(' Elementary', '').replace(' School', '')}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {middleHighSchools.length > 0 && (
              <div className={styles.relatedNavRow}>
                <span className={styles.relatedNavLabel}>Middle &amp; High:</span>
                <div className={styles.relatedNavScroll}>
                  {middleHighSchools.map((rs, i) => (
                    <Link key={i} href={`/schools/${resolveSlug(rs.slug)}`} className={styles.relatedNavPill}>
                      {rs.name.replace(' School', '')}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guides Nav Row */}
        <div className={styles.relatedNav} style={{ paddingTop: 0 }}>
          <div className={styles.relatedNavRow}>
            <span className={styles.relatedNavLabel}>Guides:</span>
            <div className={styles.relatedNavScroll}>
              <Link href="/guides/smmusd-transfer-playbook" className={styles.guideNavPill}>
                📋 SMMUSD Transfer Blueprint
              </Link>
              <Link href="/guides/ccusd-transfer-playbook" className={styles.guideNavPill}>
                📋 CCUSD Transfer Blueprint
              </Link>
              <Link href="/guides/lausd-school-choice-playbook" className={styles.guideNavPill}>
                📋 LAUSD School Choice Blueprint
              </Link>
              <Link href="/guides/beach-cities-school-choice-blueprint" className={styles.guideNavPill}>
                📋 Beach Cities Blueprint
              </Link>
            </div>
          </div>
        </div>

      </div>{/* end stickyHeader */}

    <div className={styles.report}>

      {/* ── Hero ── */}
      <div className={styles.heroArea}>
        {heroImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImageUrl}
            alt=""
            className={styles.heroImage}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className={styles.heroColorWash} />
        <div className={styles.heroOverlay}>
          <div className={styles.heroBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            EarlyScouts Deep Dive
          </div>
          <h1 className={styles.heroTitle}>{school.name}</h1>
          {!isGuide && <div className={styles.heroAddress}>{school.address}, {school.city}, CA {school.zip}</div>}
          <div className={styles.metaRow}>
            {!isGuide && <span className={styles.metaPill}>{typeLabel} / {school.district}</span>}
            {isGuide && <span className={styles.metaPill}>{school.district}</span>}
            {!isGuide && <span className={styles.metaPill}>Grades {school.grades}</span>}
            {!isGuide && <span className={styles.metaPill}>~{(school.enrollment ?? 0).toLocaleString()} Students</span>}
            {isGuide && <span className={styles.metaPill}>Comprehensive guide · {data.total_sections ?? sections.length} chapters</span>}
            {isGuide && <span className={styles.metaPill}>Updated {new Date(data.generated_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>}
            {!isGuide && accentStats.map((s, i) => (
              <span key={i} className={`${styles.metaPill} ${styles.metaPillAccent}`}>{s.label} {s.value}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scout Strip — hidden for guide/playbook pages ── */}
      {!isGuide && quick_stats.length > 0 && (
        <div className={styles.scoutStrip}>
          {quick_stats.map((s, i) => (
            <div key={i} className={styles.scoutStripItem}>
              <div className={`${styles.ssValue} ${s.accent ? '' : i < 2 ? styles.ssValueGreen : ''}`}>{s.value}</div>
              <div className={styles.ssLabel}>
                {s.label}
                <StatTooltip label={s.label} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumb}>
        {isGuide
          ? <Link href="/guides" className={styles.breadcrumbLink}>← All Guides</Link>
          : <Link href="/schools" className={styles.breadcrumbLink}>← All Schools</Link>
        }
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{school.name}</span>
      </div>

      {/* ── SMMUSD Transfer Banner ── */}
      {school.district?.toLowerCase().includes('santa monica') && (
        <div className={styles.smmusdBanner}>
          <span className={styles.smmusdBannerIcon}>🏫</span>
          <span className={styles.smmusdBannerText}>This is an SMMUSD school.</span>
          <Link href="/guides/smmusd-transfer-playbook" className={styles.smmusdBannerLink}>
            How to transfer in → SMMUSD Transfer Blueprint
          </Link>
        </div>
      )}

      {/* ── Alerts ── */}
      {data.alerts && data.alerts.length > 0 && (
        <AlertsCard alerts={data.alerts} />
      )}

      {/* ── Sections ── */}
      {isPaid ? (
        // Full access — first section eager, rest lazy-rendered via IntersectionObserver
        sections.map((section, i) => (
          <LazySection key={section.id} section={section} eager={i === 0} />
        ))
      ) : (
        // Free preview — first two sections visible, CTA card, then locked sections
        <>
          {sections.slice(0, 2).map(section => (
            <ReportSectionComp key={section.id} section={section} />
          ))}

          {/* Mid-content CTA card */}
          <div className={styles.freePreviewCard}>
            <p className={styles.freePreviewLabel}>Free Preview</p>
            <h3 className={styles.freePreviewTitle}>You&apos;re reading the free preview</h3>
            <p className={styles.freePreviewBody}>
              Access every school report and transfer guide.
            </p>
            <Link href="/pricing" className={styles.freePreviewCta}>
              Get Full Access · $59.99
            </Link>
            <p className={styles.freePreviewSubtext}>30 days of full access · one-time payment</p>
          </div>

          {/* Locked sections — blurred preview with fade */}
          {sections.slice(2).map(section => (
            <div key={section.id} className={styles.lockedSection}>
              <div className={styles.lockedSectionLabel}>
                <span className={styles.lockedSectionLock}>🔒</span>
                <span className={styles.lockedSectionTitle}>{section.title}</span>
              </div>
              <div className={styles.lockedSectionPreview} aria-hidden="true">
                <div className={styles.lockedSectionContent}>
                  <ReportSectionComp section={section} />
                </div>
                <div className={styles.lockedSectionFade} />
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── Verdict — paid only ── */}
      {isPaid && (
        <div className={styles.verdict}>
          <h2 className={styles.verdictTitle}>The Scout&apos;s Verdict</h2>
          {verdict.paragraphs.map((p, i) => (
            <p key={i} className={styles.verdictPara}>{parseInlineMarkdown(p)}</p>
          ))}
          <div className={styles.verdictDivider} />
          <div className={styles.bestForLabel}>Best For</div>
          <p className={styles.bestForText}>{verdict.best_for}</p>
          <div className={styles.considerLabel}>Consider Alternatives If</div>
          <p className={styles.considerText}>{verdict.consider_alternatives}</p>
        </div>
      )}

      {/* ── Related Schools ── */}
      {data.related_schools && data.related_schools.length > 0 && (
        <RelatedSchools schools={data.related_schools} />
      )}

      {/* ── Footer ── */}
      <div className={styles.reportFooter}>
        <div className={styles.reportFooterBrand}>EarlyScouts</div>
        <p className={styles.reportFooterText}>
          For parents who plan ahead.<br />
          Generated {new Date(data.generated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
        </p>
      </div>

    </div>

    <Footer />
    </>
  )
}
