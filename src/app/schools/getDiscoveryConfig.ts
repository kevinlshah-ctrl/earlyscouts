import { createServerClient } from '@/lib/supabase'
import type { NeighborhoodConfig } from '@/data/neighborhood-schools'
import type { ScoutTake } from '@/data/neighborhood-scout-takes'

/**
 * DB-backed discovery config loader (request-time, like getDeepDiveSchools).
 *
 * Returns the SAME shape the discovery UI currently consumes from the three static
 * files, so the UI can switch read source behind the DISCOVERY_SOURCE flag without
 * any rendering difference:
 *   - `regions`       replaces METROS[metro].regions  (ordered region LABELS)
 *   - `neighborhoods` replaces NEIGHBORHOOD_SCHOOLS    (keyed by id; `.region` is the LABEL)
 *                     with the matching SCOUT_TAKES entry attached as `scoutTake`
 *                     (null when the neighborhood has no scout take — i.e. no town chip)
 *
 * The server client is instantiated INSIDE the function to avoid stale caching.
 */

export interface DiscoveryNeighborhood extends NeighborhoodConfig {
  /** Matching SCOUT_TAKES entry, or null. Null = neighborhood is not shown as a town chip. */
  scoutTake: ScoutTake | null
}

export interface DiscoveryConfig {
  /** Region labels in display order (replaces metro-config `regions`). */
  regions: string[]
  /** Neighborhoods keyed by id (replaces NEIGHBORHOOD_SCHOOLS). `.region` is the region label. */
  neighborhoods: Record<string, DiscoveryNeighborhood>
}

interface RegionRow {
  id: string
  label: string
  metro: string
  sort_order: number
  active: boolean
}

interface NeighborhoodRow {
  id: string
  label: string
  region_id: string
  metro: string
  districts: string[] | null
  elementary_slugs: string[] | null
  middle_slugs: string[] | null
  high_slugs: string[] | null
  playbook_slugs: string[] | null
  private_slugs: string[] | null
  pipeline_slugs: string[] | null
  scout_take: ScoutTake | null
  sort_order: number
  active: boolean
}

export async function getDiscoveryConfig(metro: string = 'los-angeles'): Promise<DiscoveryConfig> {
  const supabase = createServerClient()

  const [regionsRes, neighborhoodsRes] = await Promise.all([
    supabase
      .from('regions')
      .select('id, label, metro, sort_order, active')
      .eq('metro', metro)
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase
      .from('neighborhoods')
      .select(
        'id, label, region_id, metro, districts, elementary_slugs, middle_slugs, high_slugs, playbook_slugs, private_slugs, pipeline_slugs, scout_take, sort_order, active'
      )
      .eq('metro', metro)
      .eq('active', true)
      .order('sort_order', { ascending: true }),
  ])

  if (regionsRes.error || neighborhoodsRes.error || !regionsRes.data || !neighborhoodsRes.data) {
    throw new Error(
      `getDiscoveryConfig failed: ${regionsRes.error?.message ?? ''} ${neighborhoodsRes.error?.message ?? ''}`.trim()
    )
  }

  const regionRows = regionsRes.data as RegionRow[]
  const neighborhoodRows = neighborhoodsRes.data as NeighborhoodRow[]

  // region_id -> label, so neighborhood.region stays the display label (current behavior)
  const regionLabelById = new Map(regionRows.map((r) => [r.id, r.label]))

  const regions = regionRows.map((r) => r.label)

  const neighborhoods: Record<string, DiscoveryNeighborhood> = {}
  for (const row of neighborhoodRows) {
    neighborhoods[row.id] = {
      label: row.label,
      region: regionLabelById.get(row.region_id) ?? row.region_id,
      metro: row.metro,
      districts: row.districts ?? [],
      elementarySlugs: row.elementary_slugs ?? [],
      middleSlugs: row.middle_slugs ?? [],
      highSlugs: row.high_slugs ?? [],
      playbookSlugs: row.playbook_slugs ?? [],
      privateSlugs: row.private_slugs ?? [],
      pipelineSlugs: row.pipeline_slugs ?? [],
      scoutTake: row.scout_take ?? null,
    }
  }

  return { regions, neighborhoods }
}
