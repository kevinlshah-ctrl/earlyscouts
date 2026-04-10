import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, rowToSchool, type SchoolRow } from '@/lib/supabase'
import { scrapeSchoolDetailUpdate, scrapeSchoolBySlug, scrapeSchoolsForZip } from '@/lib/scraper'
import type { School } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Attaches feeder map data to a school object by querying feeder_maps.
 * feedsInto  — schools this school's graduates typically attend next
 * feedsFrom  — schools whose graduates typically attend this school
 */
async function withFeederMap(
  supabase: ReturnType<typeof createServerClient> | null,
  school: School
): Promise<School> {
  if (!supabase) return school
  try {
    const { data, error } = await supabase
      .from('feeder_maps')
      .select('feeds_into, feeds_from')
      .eq('school_id', school.id)
      .maybeSingle()

    console.log(`[FeederMap] school_id=${school.id} | data=${JSON.stringify(data)} | error=${error?.message ?? 'none'}`)

    if (error) {
      console.error(`[FeederMap] Query error for school "${school.name}":`, error.message)
      return school
    }

    school.feederMap = {
      feedsInto: Array.isArray(data?.feeds_into) ? data.feeds_into : [],
      feedsFrom: Array.isArray(data?.feeds_from) ? data.feeds_from : [],
    }

    console.log(`[FeederMap] Result: feedsInto=${JSON.stringify(school.feederMap.feedsInto)} feedsFrom=${JSON.stringify(school.feederMap.feedsFrom)}`)
  } catch (err) {
    console.error(`[FeederMap] Unexpected error for school "${school.name}":`, err)
  }
  return school
}

const DETAIL_CACHE_TTL_DAYS = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const slug = params.id
  if (!slug) return NextResponse.json({ error: 'School ID required' }, { status: 400 })

  // Try Supabase — gracefully skip if not configured
  let supabase: ReturnType<typeof createServerClient> | null = null
  try {
    supabase = createServerClient()
  } catch {
    console.warn(`[Detail] Supabase not configured — scraping directly for "${slug}"`)
  }

  let row: SchoolRow | null = null

  if (supabase) {
    const { data } = await supabase
      .from('schools')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()
    row = data as SchoolRow | null
  }

  const scraped = row?.scraped_at ? new Date(row.scraped_at) : null
  const ageMs = scraped ? Date.now() - scraped.getTime() : Infinity
  const isStale = ageMs > DETAIL_CACHE_TTL_DAYS * 24 * 60 * 60 * 1000
  // A row is "fully enriched" if it has test scores, demographics, or student:teacher ratio
  const isEnriched = Boolean(
    row && (row.math_proficiency != null || row.student_teacher_ratio != null ||
    (row.demographics && Object.values(row.demographics as Record<string,number>).some(v => v > 0)))
  )

  // If the school already has a structured report, return it immediately — no scraping needed
  if (row?.report_data) {
    console.log(`[Detail] Report data present for "${slug}" — skipping enrichment check`)
    return NextResponse.json(await withFeederMap(supabase, rowToSchool(row as SchoolRow)))
  }

  if (row && !isStale && isEnriched) {
    console.log(`[Detail] Cache hit for "${slug}"`)
    return NextResponse.json(await withFeederMap(supabase, rowToSchool(row as SchoolRow)))
  }

  // No row in DB (or stale) — determine how to get the data
  const gsUrl = row?.greatschools_url || ''
  const nicheUrl = row?.niche_url || ''

  // If we have no source URLs at all, the school was never cached — scrape by slug
  if (!gsUrl && !nicheUrl) {
    if (row) {
      // Stale row with no URLs — return what we have
      return NextResponse.json(await withFeederMap(supabase, rowToSchool(row as SchoolRow)))
    }
    console.log(`[Detail] School "${slug}" not in DB — running slug-based scrape`)
    try {
      const school = await scrapeSchoolBySlug(slug)
      if (school) {
        // Immediately enrich with detail scrape if we have a GS URL
        let enriched: School & { greatschoolsUrl: string; nicheUrl: string } = school
        if (school.greatschoolsUrl) {
          console.log(`[Detail] Running detail enrichment from ${school.greatschoolsUrl}`)
          try {
            const update = await scrapeSchoolDetailUpdate(school.greatschoolsUrl, school.nicheUrl || '')
            console.log(`[Detail] Enrichment: math=${update?.academics?.mathProficiency} reading=${update?.academics?.readingProficiency} FRL=${update?.freeReducedLunchPct} ratio=${update?.studentTeacherRatio}`)
            if (update) {
              enriched = {
                ...school,
                studentTeacherRatio: update.studentTeacherRatio || school.studentTeacherRatio,
                freeReducedLunchPct: update.freeReducedLunchPct ?? school.freeReducedLunchPct,
                titleOne: update.titleOne ?? school.titleOne,
                programs: update.programs || school.programs,
                demographics: update.demographics || school.demographics,
                academics: {
                  mathProficiency: update.academics?.mathProficiency ?? null,
                  readingProficiency: update.academics?.readingProficiency ?? null,
                },
                ratings: {
                  greatSchools: update.ratings?.greatSchools ?? school.ratings.greatSchools,
                  niche: update.ratings?.niche ?? school.ratings.niche,
                  stateRanking: update.ratings?.stateRanking ?? school.ratings.stateRanking,
                },
                sentiment: update.sentiment || school.sentiment,
                website: update.website || school.website,
              }
            }
          } catch (enrichErr) {
            console.error(`[Detail] Enrichment failed, returning basic data:`, enrichErr)
          }
        }

        if (supabase) {
          await supabase.from('schools').upsert(
            {
              id: enriched.id, slug: enriched.slug, name: enriched.name,
              type: enriched.type, city: enriched.city, state: enriched.state,
              zip: enriched.zip, address: enriched.address, lat: enriched.lat,
              lng: enriched.lng, grades: enriched.grades, enrollment: enriched.enrollment,
              district: enriched.district, website: enriched.website,
              greatschools_rating: enriched.ratings.greatSchools,
              niche_grade: enriched.ratings.niche,
              math_proficiency: enriched.academics.mathProficiency,
              reading_proficiency: enriched.academics.readingProficiency,
              demographics: enriched.demographics, programs: enriched.programs,
              sentiment: enriched.sentiment,
              free_reduced_lunch_pct: enriched.freeReducedLunchPct,
              title_one: enriched.titleOne,
              student_teacher_ratio: enriched.studentTeacherRatio,
              greatschools_url: enriched.greatschoolsUrl,
              niche_url: enriched.nicheUrl,
              scraped_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
        }
        return NextResponse.json(await withFeederMap(supabase, enriched))
      }
    } catch (err) {
      console.error(`[Detail] Slug-based scrape failed for "${slug}":`, err)
    }
    return NextResponse.json({ error: 'School not found' }, { status: 404 })
  }

  // We have source URLs — scrape detail enrichment
  console.log(`[Detail] Scraping detail for "${slug}" | gsUrl=${gsUrl} | isEnriched=${isEnriched} | isStale=${isStale}`)
  try {
    const update = await scrapeSchoolDetailUpdate(gsUrl, nicheUrl)
    console.log(`[Detail] scrapeSchoolDetailUpdate returned: math=${update?.academics?.mathProficiency} reading=${update?.academics?.readingProficiency} FRL=${update?.freeReducedLunchPct} ratio=${update?.studentTeacherRatio}`)

    if (update && supabase) {
      const upsertData: Record<string, unknown> = {
        ...(row || {}),
        id: slug, slug,
        name: update.name || row?.name || slug,
        grades: update.grades || row?.grades,
        enrollment: update.enrollment || row?.enrollment,
        student_teacher_ratio: update.studentTeacherRatio || row?.student_teacher_ratio,
        address: update.address || row?.address,
        website: update.website || row?.website,
        free_reduced_lunch_pct: update.freeReducedLunchPct ?? row?.free_reduced_lunch_pct,
        title_one: update.titleOne ?? row?.title_one ?? false,
        programs: update.programs || row?.programs,
        demographics: update.demographics || row?.demographics,
        math_proficiency: update.academics?.mathProficiency ?? row?.math_proficiency,
        reading_proficiency: update.academics?.readingProficiency ?? row?.reading_proficiency,
        greatschools_rating: update.ratings?.greatSchools ?? row?.greatschools_rating,
        niche_grade: update.ratings?.niche ?? row?.niche_grade,
        state_ranking: update.ratings?.stateRanking ?? row?.state_ranking,
        sentiment: update.sentiment || row?.sentiment,
        scraped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      await supabase.from('schools').upsert(upsertData, { onConflict: 'id' })

      const { data: refreshed } = await supabase
        .from('schools').select('*').eq('slug', slug).maybeSingle()
      if (refreshed) return NextResponse.json(await withFeederMap(supabase, rowToSchool(refreshed as SchoolRow)))
    }
  } catch (err) {
    console.error(`[Detail] Scraping failed for "${slug}":`, err)
  }

  if (row) return NextResponse.json(await withFeederMap(supabase, rowToSchool(row as SchoolRow)))
  return NextResponse.json({ error: 'School not found' }, { status: 404 })
}
