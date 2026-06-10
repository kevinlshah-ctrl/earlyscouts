/**
 * audit-discovery.ts — discovery integrity audit (DB-backed)
 *
 * Run:  npm run audit:discovery     (which calls: node --env-file=.env.local scripts/audit-discovery.ts)
 * Requires Node >= 23.6 (native TypeScript type-stripping) or run via `npx tsx`.
 *
 * Reports the three failure modes this project has actually hit, and EXITS NON-ZERO
 * if any is non-empty (so it can gate CI):
 *   1. Orphans          — a school slug with report_data IS NOT NULL that appears in
 *                         NO neighborhood slug array (playbook/blueprint slugs excluded).
 *   2. Dead links       — a slug in a neighborhood array with no matching `schools` row.
 *   3. Duplicate rows   — multiple `schools` rows that are clearly the same school
 *                         (slug differing only by a `-school-` segment, or same name+zip).
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(2)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

const isPlaybook = (s: string): boolean => s.includes('playbook') || s.includes('blueprint')

interface SchoolLite { slug: string; name: string | null; zip: string | null }
interface NeighborhoodLite {
  id: string
  elementary_slugs: string[] | null
  middle_slugs: string[] | null
  high_slugs: string[] | null
  private_slugs: string[] | null
  pipeline_slugs: string[] | null
}

async function main(): Promise<void> {
  // ── Load schools (all rows + the report-bearing subset) ─────────────────────
  const { data: schoolsData, error: sErr } = await supabase
    .from('schools')
    .select('slug, name, zip')
  if (sErr || !schoolsData) { console.error('schools query failed:', sErr?.message); process.exit(2) }
  const schools = schoolsData as SchoolLite[]
  const allSchoolSlugs = new Set(schools.map((s) => s.slug))

  const { data: reportData, error: rErr } = await supabase
    .from('schools')
    .select('slug')
    .not('report_data', 'is', null)
  if (rErr || !reportData) { console.error('report query failed:', rErr?.message); process.exit(2) }
  const reportSlugs = (reportData as { slug: string }[])
    .map((r) => r.slug)
    .filter((s) => !isPlaybook(s))

  // ── Load neighborhoods + flatten mapped school slugs (exclude playbook arrays) ──
  const { data: nbData, error: nErr } = await supabase
    .from('neighborhoods')
    .select('id, elementary_slugs, middle_slugs, high_slugs, private_slugs, pipeline_slugs')
  if (nErr || !nbData) { console.error('neighborhoods query failed:', nErr?.message); process.exit(2) }
  const neighborhoods = nbData as NeighborhoodLite[]

  const mapped = new Set<string>()
  for (const n of neighborhoods) {
    for (const arr of [n.elementary_slugs, n.middle_slugs, n.high_slugs, n.private_slugs, n.pipeline_slugs]) {
      for (const slug of arr ?? []) {
        if (!isPlaybook(slug)) mapped.add(slug)
      }
    }
  }

  // ── 1. Orphans: report-bearing, not mapped ──────────────────────────────────
  const orphans = reportSlugs.filter((s) => !mapped.has(s)).sort()

  // ── 2. Dead links: mapped, no schools row ───────────────────────────────────
  const deadLinks = [...mapped].filter((s) => !allSchoolSlugs.has(s)).sort()

  // ── 3. Duplicate rows: same school across multiple rows ─────────────────────
  // (a) slugs that collapse to the same value once a `-school-` segment is removed
  const bySlugNorm = new Map<string, string[]>()
  for (const s of allSchoolSlugs) {
    const norm = s.replace('-school-', '-')
    const list = bySlugNorm.get(norm) ?? []
    list.push(s)
    bySlugNorm.set(norm, list)
  }
  const slugDupes = [...bySlugNorm.values()]
    .filter((list) => new Set(list).size > 1)
    .map((list) => [...new Set(list)].sort())

  // (b) same name + zip across multiple rows
  const byNameZip = new Map<string, string[]>()
  for (const s of schools) {
    if (!s.name || !s.zip) continue
    const k = `${s.name.trim().toLowerCase()}|${s.zip}`
    const list = byNameZip.get(k) ?? []
    list.push(s.slug)
    byNameZip.set(k, list)
  }
  const nameZipDupes = [...byNameZip.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([k, list]) => ({ key: k, slugs: list.sort() }))

  const duplicateCount = slugDupes.length + nameZipDupes.length

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log(`schools rows: ${schools.length} | report-bearing (excl playbooks): ${reportSlugs.length} | mapped school slugs: ${mapped.size}`)
  console.log(`\n1. ORPHANS (report, not mapped) = ${orphans.length}`)
  orphans.forEach((s) => console.log('   - ' + s))
  console.log(`\n2. DEAD LINKS (mapped, no schools row) = ${deadLinks.length}`)
  deadLinks.forEach((s) => console.log('   - ' + s))
  console.log(`\n3. DUPLICATE SCHOOL ROWS = ${duplicateCount}`)
  slugDupes.forEach((list) => console.log('   - [slug variant] ' + list.join('  ==  ')))
  nameZipDupes.forEach((d) => console.log('   - [same name+zip] ' + d.slugs.join('  ==  ') + `  (${d.key})`))

  const failed = orphans.length > 0 || deadLinks.length > 0 || duplicateCount > 0
  console.log(`\n${failed ? '✗ FAIL' : '✓ PASS'} — orphans=${orphans.length} deadLinks=${deadLinks.length} duplicates=${duplicateCount}`)
  process.exit(failed ? 1 : 0)
}

main().catch((err) => { console.error(err); process.exit(2) })
