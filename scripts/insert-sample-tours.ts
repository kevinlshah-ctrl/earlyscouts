/**
 * insert-sample-tours.ts
 * Run with: npx tsx scripts/insert-sample-tours.ts
 *
 * Inserts sample tour dates for schools in zip 90066 so the tour badge UI is testable.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // Get all schools in 90066 so tour badges show on the top-rated cards
  const { data: allSchools, error } = await supabase
    .from('schools')
    .select('id, name, address')
    .eq('zip', '90066')
    .limit(20)

  // Exclude schools already inserted in prior runs
  const { data: existingTours } = await supabase
    .from('tour_dates')
    .select('school_id')
    .not('school_id', 'is', null)

  const alreadyHasTours = new Set((existingTours || []).map((t: { school_id: string }) => t.school_id))
  const schools = (allSchools || []).filter(s => !alreadyHasTours.has(s.id))
  const error2 = error

  if (error2) {
    console.error('Error fetching schools:', error2.message)
    process.exit(1)
  }

  if (!schools?.length) {
    console.log('No schools found in zip 90066. Run a search for 90066 first.')
    process.exit(0)
  }

  console.log(`Found ${schools.length} schools:`)
  for (const s of schools) console.log(`  - ${s.name} (${s.id})`)

  const today = new Date()
  const schoolYear = '2026-2027'
  const sampleRows: object[] = []

  for (const school of schools) {
    const date1 = new Date(today)
    date1.setMonth(date1.getMonth() + 1)
    date1.setDate(15)

    const date2 = new Date(today)
    date2.setMonth(date2.getMonth() + 2)
    date2.setDate(8)

    sampleRows.push({
      school_id: school.id,
      district_id: 'lausd',
      event_type: 'tour',
      title: 'Campus Tour',
      date: date1.toISOString().split('T')[0],
      time: '9:00 AM - 11:00 AM',
      location: school.address || 'School campus',
      rsvp_required: false,
      rsvp_url: null,
      notes: 'Sample tour date — check school website for current schedule.',
      source_url: 'https://achieve.lausd.net/enroll',
      school_year: schoolYear,
      scraped_at: new Date().toISOString(),
    })

    sampleRows.push({
      school_id: school.id,
      district_id: 'lausd',
      event_type: 'tk_k_roundup',
      title: 'TK/K Roundup',
      date: date2.toISOString().split('T')[0],
      time: '10:00 AM - 12:00 PM',
      location: school.address || 'School campus',
      rsvp_required: true,
      rsvp_url: 'https://achieve.lausd.net/enroll',
      notes: 'Incoming TK and Kindergarten families welcome.',
      source_url: 'https://achieve.lausd.net/enroll',
      school_year: schoolYear,
      scraped_at: new Date().toISOString(),
    })
  }

  const { error: insertErr } = await supabase.from('tour_dates').insert(sampleRows)
  if (insertErr) {
    console.error('Insert error:', insertErr.message)
    process.exit(1)
  }

  console.log(`\nInserted ${sampleRows.length} sample tour dates.`)
  console.log('  Campus Tour: ' + new Date(today.getFullYear(), today.getMonth() + 1, 15).toDateString())
  console.log('  TK/K Roundup: ' + new Date(today.getFullYear(), today.getMonth() + 2, 8).toDateString())
  console.log('\nTour badges should now appear on school cards for zip 90066.')
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
