import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, rowToSchool, type SchoolRow } from '@/lib/supabase'
import { scrapeSchoolsForZip } from '@/lib/scraper'

const ZIP_CACHE_TTL_DAYS = 7

// Convert a School (our type) to a Supabase insert object
function schoolToRow(
  school: Awaited<ReturnType<typeof scrapeSchoolsForZip>>[number]
) {
  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    type: school.type,
    district: school.district || null,
    state: school.state,
    city: school.city,
    zip: school.zip,
    address: school.address || null,
    lat: school.lat || null,
    lng: school.lng || null,
    website: school.website || null,
    grades: school.grades || null,
    enrollment: school.enrollment || null,
    student_teacher_ratio: school.studentTeacherRatio || null,
    greatschools_rating: school.ratings.greatSchools,
    niche_grade: school.ratings.niche,
    state_ranking: school.ratings.stateRanking,
    math_proficiency: school.academics.mathProficiency,
    reading_proficiency: school.academics.readingProficiency,
    demographics: school.demographics,
    free_reduced_lunch_pct: school.freeReducedLunchPct || null,
    title_one: school.titleOne || false,
    programs: school.programs,
    tuition: school.financials.tuition
      ? `$${school.financials.tuition.toLocaleString()}/yr`
      : null,
    sentiment: school.sentiment,
    greatschools_url: school.greatschoolsUrl || null,
    niche_url: school.nicheUrl || null,
    key_insight: school.keyInsight || null,
    scraped_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const zip = req.nextUrl.searchParams.get('zip')?.trim()

  if (!zip || !/^\d{5}$/.test(zip)) {
    return NextResponse.json(
      { error: 'Valid 5-digit zip code required' },
      { status: 400 }
    )
  }

  let supabase: ReturnType<typeof createServerClient>
  try {
    supabase = createServerClient()
  } catch (err) {
    console.error('[Search] Supabase not configured:', err)
    // Supabase not set up yet — run scraper and return results directly (no caching)
    try {
      console.log(`[Search] No DB — scraping directly for ZIP ${zip}`)
      const schools = await scrapeSchoolsForZip(zip)
      console.log(`[Search] Direct scrape returned ${schools.length} schools for ZIP ${zip}`)
      return NextResponse.json({
        zip,
        city: schools[0]?.city || '',
        state: schools[0]?.state || '',
        schools,
        schoolCount: schools.length,
        _note: 'No database configured — results not cached',
      })
    } catch (scrapeErr) {
      console.error(`[Search] Direct scrape also failed for ${zip}:`, scrapeErr)
      return NextResponse.json(
        { error: 'School data unavailable. Configure Supabase env vars or check scraper logs.', schools: [], schoolCount: 0 },
        { status: 503 }
      )
    }
  }

  // 1. Check zip_cache
  const { data: cache } = await supabase
    .from('zip_cache')
    .select('*')
    .eq('zip', zip)
    .maybeSingle()

  const isFresh = cache && new Date(cache.stale_after) > new Date()

  if (!isFresh) {
    console.log(`[Search] Cache miss for ZIP ${zip} — scraping...`)
    try {
      const schools = await scrapeSchoolsForZip(zip)

      if (schools.length > 0) {
        // Deduplicate by school ID (keep last occurrence) to avoid Postgres
        // "ON CONFLICT DO UPDATE command cannot affect a row a second time"
        const schoolsById = new Map(schools.map((s) => [s.id, s]))
        const dedupedSchools = Array.from(schoolsById.values())

        // Upsert schools
        const rows = dedupedSchools.map(schoolToRow)
        const { error: schoolsError } = await supabase
          .from('schools')
          .upsert(rows, { onConflict: 'id' })

        if (schoolsError) {
          console.error(`[Search] School upsert failed for ZIP ${zip}:`, schoolsError.message)
          // Don't cache — next request will retry the full scrape
        } else {
          // Upsert zip_schools mappings (deduped by school_id)
          const zipMappingsById = new Map(dedupedSchools.map((s) => [s.id, {
            zip,
            school_id: s.id,
            distance_miles: null,
            is_zoned: false,
          }]))
          const zipMappings = Array.from(zipMappingsById.values())
          const { error: zipSchoolsError } = await supabase
            .from('zip_schools')
            .upsert(zipMappings, { onConflict: 'zip,school_id' })

          if (zipSchoolsError) {
            console.error(`[Search] zip_schools upsert failed for ZIP ${zip}:`, zipSchoolsError.message)
            // Don't cache — next request will retry
          } else {
            // Only mark as cached AFTER all inserts completed successfully
            const staleAfter = new Date()
            staleAfter.setDate(staleAfter.getDate() + ZIP_CACHE_TTL_DAYS)
            await supabase.from('zip_cache').upsert(
              {
                zip,
                city: schools[0]?.city || '',
                state: schools[0]?.state || '',
                school_count: schools.length,
                scraped_at: new Date().toISOString(),
                stale_after: staleAfter.toISOString(),
              },
              { onConflict: 'zip' }
            )
          }
        }
      } else if (!cache) {
        // No results and no cache — store empty cache to avoid re-scraping immediately
        const staleAfter = new Date()
        staleAfter.setDate(staleAfter.getDate() + 1)
        await supabase.from('zip_cache').upsert(
          {
            zip,
            city: '',
            state: '',
            school_count: 0,
            scraped_at: new Date().toISOString(),
            stale_after: staleAfter.toISOString(),
          },
          { onConflict: 'zip' }
        )

        return NextResponse.json({
          zip,
          city: '',
          state: '',
          schools: [],
          schoolCount: 0,
        })
      }
    } catch (err) {
      console.error(`[Search] Scraping failed for ${zip}:`, err)
      if (!cache) {
        return NextResponse.json(
          {
            error: 'Unable to load schools. Try again in a moment.',
            zip,
            schools: [],
            schoolCount: 0,
          },
          { status: 503 }
        )
      }
      // Fall through to return stale cache
    }
  }

  // 2. Return from cache
  const { data: zipSchools } = await supabase
    .from('zip_schools')
    .select('school_id')
    .eq('zip', zip)

  if (!zipSchools?.length) {
    return NextResponse.json({
      zip,
      city: cache?.city || '',
      state: cache?.state || '',
      schools: [],
      schoolCount: 0,
    })
  }

  const ids = zipSchools.map((z: { school_id: string }) => z.school_id)
  const { data: rows } = await supabase
    .from('schools')
    .select('*')
    .in('id', ids)
    .order('greatschools_rating', { ascending: false, nullsFirst: false })

  const schools = (rows as SchoolRow[] || []).map(rowToSchool)

  // Attach YoY trend badges from assessment_scores (non-blocking)
  try {
    if (ids.length > 0) {
      const { data: trendRows } = await supabase
        .from('assessment_scores')
        .select('school_id, subject, school_year, pct_proficient')
        .in('school_id', ids)
        .eq('grade_level', 'all')
        .eq('subgroup', 'all')
        .in('subject', ['math', 'ela'])
        .order('school_year', { ascending: false })

      if (trendRows?.length) {
        // Group by school_id + subject, keep top-2 years
        const bySchoolSubject = new Map<string, { year: string; pct: number | null }[]>()
        for (const r of trendRows as { school_id: string; subject: string; school_year: string; pct_proficient: number | null }[]) {
          const key = `${r.school_id}|${r.subject}`
          if (!bySchoolSubject.has(key)) bySchoolSubject.set(key, [])
          const arr = bySchoolSubject.get(key)!
          if (arr.length < 2) arr.push({ year: r.school_year, pct: r.pct_proficient })
        }

        for (const school of schools) {
          const mathRows = bySchoolSubject.get(`${school.id}|math`) ?? []
          const elaRows = bySchoolSubject.get(`${school.id}|ela`) ?? []
          const mathYoy = mathRows.length === 2 && mathRows[0].pct != null && mathRows[1].pct != null
            ? Math.round((mathRows[0].pct - mathRows[1].pct) * 10) / 10
            : null
          const readingYoy = elaRows.length === 2 && elaRows[0].pct != null && elaRows[1].pct != null
            ? Math.round((elaRows[0].pct - elaRows[1].pct) * 10) / 10
            : null
          if (mathYoy !== null || readingYoy !== null) {
            school.trends = { mathYoyChange: mathYoy, readingYoyChange: readingYoy }
          }
        }
      }
    }
  } catch (_) { /* trend badges are non-critical */ }

  // Attach latest high-impact board insight per school (non-blocking)
  try {
    if (ids.length > 0) {
      const { data: intelRows } = await supabase
        .from('board_insights')
        .select('school_id, headline, category, impact_level')
        .in('school_id', ids)
        .eq('impact_level', 'high')
        .order('meeting_date', { ascending: false })

      if (intelRows?.length) {
        const intelBySchool = new Map<string, { headline: string; category: string; impact_level: string }>()
        for (const r of intelRows as { school_id: string; headline: string; category: string; impact_level: string }[]) {
          if (!intelBySchool.has(r.school_id)) {
            intelBySchool.set(r.school_id, { headline: r.headline, category: r.category, impact_level: r.impact_level })
          }
        }
        for (const school of schools) {
          const intel = intelBySchool.get(school.id)
          if (intel) school.latestIntel = intel
        }
      }
    }
  } catch (_) { /* intel badges are non-critical */ }

  // Patch sentiment.reviewCount from scraped_reviews (non-blocking)
  // The count stored in schools.sentiment was scraped from GreatSchools structured data
  // and is often 0 or stale. The scraped_reviews table is the source of truth.
  try {
    if (ids.length > 0) {
      const { data: countRows } = await supabase
        .from('scraped_reviews')
        .select('school_id')
        .in('school_id', ids)

      if (countRows?.length) {
        const countBySchool = new Map<string, number>()
        for (const r of countRows as { school_id: string }[]) {
          countBySchool.set(r.school_id, (countBySchool.get(r.school_id) ?? 0) + 1)
        }
        for (const school of schools) {
          const actualCount = countBySchool.get(school.id)
          if (actualCount !== undefined && actualCount > school.sentiment.reviewCount) {
            school.sentiment.reviewCount = actualCount
          }
        }
      }
    }
  } catch (_) { /* review count patch is non-critical */ }

  return NextResponse.json({
    zip,
    city: cache?.city || schools[0]?.city || '',
    state: cache?.state || schools[0]?.state || '',
    schools,
    schoolCount: schools.length,
  })
}
