/**
 * Neighborhood-to-school mapping for EarlyScouts discovery page.
 * Source of truth: only schools with report_data in Supabase appear here.
 * Last updated: April 8, 2026 — expanded Hollywood Hills (added 7 elementaries, le-conte middle, marshall high)
 */

export interface NeighborhoodConfig {
  label: string
  region: string
  districts: string[]
  elementarySlugs: string[]
  middleSlugs: string[]
  highSlugs: string[]
  playbookSlugs: string[]
  privateSlugs?: string[]
}

export const NEIGHBORHOOD_SCHOOLS: Record<string, NeighborhoodConfig> = {

  // ═══════════════════════════════════════════════════════════════
  // WESTSIDE
  // ═══════════════════════════════════════════════════════════════

  'mar-vista': {
    label: 'Mar Vista',
    region: 'Westside',
    districts: ['LAUSD'],
    elementarySlugs: [
      'mar-vista-elementary-school-los-angeles-ca',
      'stoner-avenue-elementary-school-culver-city-ca',
      'grand-view-boulevard-elementary-school-los-angeles-ca',
      'walgrove-avenue-elementary-school-los-angeles-ca',
      'beethoven-street-elementary-school-los-angeles-ca',
      'short-avenue-elementary-school-los-angeles-ca',
      'broadway-elementary-school-los-angeles-ca',
      'clover-avenue-elementary-school-los-angeles-ca',
      'richland-avenue-elementary-school-los-angeles-ca',
      'charnock-road-elementary-school-los-angeles-ca',
      'westminster-avenue-elementary-school-los-angeles-ca',
      'cwc-mar-vista-los-angeles-ca',
      'goethe-international-charter-school-los-angeles-ca',
      'ocean-charter-school-los-angeles-ca',
      'wish-charter-schools-los-angeles-ca',
      'open-charter-magnet-school-los-angeles-ca',
    ],
    middleSlugs: [
      'mark-twain-middle-school-los-angeles-ca',
      'palms-middle-school-los-angeles-ca',
      'marina-del-rey-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'venice-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'smmusd-transfer-playbook',
      'ccusd-transfer-playbook',
      'lausd-school-choice-playbook',
      'la-charter-magnet-school-choice-playbook',
    ],
  },

  'venice': {
    label: 'Venice',
    region: 'Westside',
    districts: ['LAUSD'],
    elementarySlugs: [
      'beethoven-street-elementary-school-los-angeles-ca',
      'walgrove-avenue-elementary-school-los-angeles-ca',
      'westminster-avenue-elementary-school-los-angeles-ca',
      'broadway-elementary-school-los-angeles-ca',
      'coeur-dalene-avenue-elementary-school-los-angeles-ca',
      'ocean-charter-school-los-angeles-ca',
    ],
    middleSlugs: [
      'mark-twain-middle-school-los-angeles-ca',
      'marina-del-rey-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'venice-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'smmusd-transfer-playbook',
      'lausd-school-choice-playbook',
    ],
  },

  'palms': {
    label: 'Palms / Cheviot Hills',
    region: 'Westside',
    districts: ['LAUSD'],
    elementarySlugs: [
      'clover-avenue-elementary-school-los-angeles-ca',
      'overland-avenue-elementary-school-los-angeles-ca',
      'castle-heights-elementary-school-los-angeles-ca',
      'richland-avenue-elementary-school-los-angeles-ca',
      'short-avenue-elementary-school-los-angeles-ca',
      'braddock-drive-elementary-school-culver-city-ca',
    ],
    middleSlugs: [
      'palms-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'venice-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'ccusd-transfer-playbook',
      'lausd-school-choice-playbook',
    ],
  },

  'playa-vista': {
    label: 'Playa Vista / Playa del Rey',
    region: 'Westside',
    districts: ['LAUSD'],
    elementarySlugs: [
      'playa-vista-elementary-school-los-angeles-ca',
      'goethe-international-charter-school-los-angeles-ca',
      'playa-del-rey-elementary-school-los-angeles-ca',
      'westchester-enriched-sciences-magnets-los-angeles-ca',
    ],
    middleSlugs: [
      'marina-del-rey-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'venice-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
      'la-charter-magnet-school-choice-playbook',
    ],
  },

  'santa-monica': {
    label: 'Santa Monica',
    region: 'Westside',
    districts: ['SMMUSD'],
    elementarySlugs: [
      'edison-language-academy-santa-monica-ca',
      'franklin-elementary-school-santa-monica-ca',
      'grant-elementary-school-santa-monica-ca',
      'roosevelt-elementary-school-santa-monica-ca',
      'mckinley-elementary-school-santa-monica-ca',
      'will-rogers-elementary-school-santa-monica-ca',
      'john-muir-elementary-santa-monica-ca',
    ],
    middleSlugs: [
      'john-adams-middle-school-santa-monica-ca',
      'lincoln-middle-school-santa-monica-ca',
    ],
    highSlugs: [
      'santa-monica-high-school-santa-monica-ca',
    ],
    playbookSlugs: [
      'smmusd-transfer-playbook',
    ],
    privateSlugs: [
      'crossroads-school-santa-monica-ca',
      'carlthorp-school-santa-monica-ca',
      'new-roads-school-santa-monica-ca',
    ],
  },

  'culver-city': {
    label: 'Culver City',
    region: 'Westside',
    districts: ['CCUSD'],
    elementarySlugs: [
      'el-marino-language-school-culver-city-ca',
      'farragut-elementary-school-culver-city-ca',
      'la-ballona-elementary-school-culver-city-ca',
      'linwood-e-howe-elementary-school-culver-city-ca',
      'el-rincon-elementary-school-culver-city-ca',
    ],
    middleSlugs: [
      'culver-city-middle-school-culver-city-ca',
    ],
    highSlugs: [
      'culver-city-high-school-culver-city-ca',
    ],
    playbookSlugs: [
      'ccusd-transfer-playbook',
    ],
  },

  'malibu': {
    label: 'Malibu',
    region: 'Westside',
    districts: ['SMMUSD'],
    elementarySlugs: [
      'webster-elementary-school-malibu-ca',
    ],
    middleSlugs: [],
    highSlugs: [],
    playbookSlugs: [
      'smmusd-transfer-playbook',
    ],
  },

  'west-la': {
    label: 'West LA',
    region: 'Westside',
    districts: ['LAUSD'],
    elementarySlugs: [
      'overland-avenue-elementary-los-angeles-ca',
      'westwood-charter-elementary-los-angeles-ca',
      'laces-magnet-los-angeles-ca',
      'new-west-charter-school-los-angeles-ca',
      'community-magnet-charter-school-los-angeles-ca',
      'wish-charter-schools-los-angeles-ca',
    ],
    middleSlugs: [
      'emerson-community-charter-middle-los-angeles-ca',
    ],
    highSlugs: [
      'university-high-school-charter-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
      'la-charter-magnet-school-choice-playbook',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // BRENTWOOD / PALISADES
  // ═══════════════════════════════════════════════════════════════

  'brentwood-palisades': {
    label: 'Brentwood / Palisades',
    region: 'Westside',
    districts: ['LAUSD'],
    elementarySlugs: [
      'kenter-canyon-elementary-los-angeles-ca',
      'palisades-charter-elementary-los-angeles-ca',
      'canyon-charter-elementary-los-angeles-ca',
      'marquez-charter-elementary-los-angeles-ca',
      'brentwood-science-magnet-los-angeles-ca',
    ],
    middleSlugs: [
      'paul-revere-charter-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'palisades-charter-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
    ],
    privateSlugs: [
      'brentwood-school-los-angeles-ca',
      'wildwood-school-los-angeles-ca',
      'windward-school-los-angeles-ca',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // BEACH CITIES
  // ═══════════════════════════════════════════════════════════════

  'manhattan-beach': {
    label: 'Manhattan Beach',
    region: 'Beach Cities',
    districts: ['MBUSD'],
    elementarySlugs: [
      'meadows-avenue-elementary-manhattan-beach-ca',
      'pennekamp-elementary-manhattan-beach-ca',
      'pacific-elementary-manhattan-beach-ca',
      'grand-view-elementary-manhattan-beach-ca',
      'opal-robinson-elementary-manhattan-beach-ca',
    ],
    middleSlugs: [
      'manhattan-beach-middle-school-manhattan-beach-ca',
    ],
    highSlugs: [
      'mira-costa-high-school-manhattan-beach-ca',
    ],
    playbookSlugs: [
      'beach-cities-school-choice-blueprint',
    ],
  },

  'el-segundo': {
    label: 'El Segundo',
    region: 'Beach Cities',
    districts: ['ESUSD'],
    elementarySlugs: [
      'richmond-street-elementary-el-segundo-ca',
      'center-street-elementary-el-segundo-ca',
    ],
    middleSlugs: [
      'el-segundo-middle-school-el-segundo-ca',
    ],
    highSlugs: [
      'el-segundo-high-school-el-segundo-ca',
    ],
    playbookSlugs: [
      'beach-cities-school-choice-blueprint',
    ],
  },

  'hermosa-beach': {
    label: 'Hermosa Beach',
    region: 'Beach Cities',
    districts: ['HBCSD'],
    elementarySlugs: [
      'hermosa-valley-school-hermosa-beach-ca',
      'hermosa-view-elementary-hermosa-beach-ca',
      'hermosa-vista-elementary-hermosa-beach-ca',
    ],
    middleSlugs: [],
    highSlugs: [],
    playbookSlugs: [
      'beach-cities-school-choice-blueprint',
    ],
  },

  'redondo-beach': {
    label: 'Redondo Beach',
    region: 'Beach Cities',
    districts: ['RBUSD'],
    elementarySlugs: [
      'alta-vista-elementary-redondo-beach-ca',
      'beryl-heights-elementary-redondo-beach-ca',
      'washington-elementary-redondo-beach-ca',
      'madison-elementary-redondo-beach-ca',
      'lincoln-elementary-redondo-beach-ca',
      'jefferson-elementary-redondo-beach-ca',
      'tulita-elementary-redondo-beach-ca',
      'birney-elementary-redondo-beach-ca',
    ],
    middleSlugs: [
      'adams-middle-school-redondo-beach-ca',
      'parras-middle-school-redondo-beach-ca',
    ],
    highSlugs: [
      'redondo-union-high-school-redondo-beach-ca',
    ],
    playbookSlugs: [
      'beach-cities-school-choice-blueprint',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // EAST LA (Silver Lake / Los Feliz / Eagle Rock / Atwater)
  // ═══════════════════════════════════════════════════════════════

  'silver-lake': {
    label: 'Silver Lake / Echo Park',
    region: 'East LA',
    districts: ['LAUSD'],
    elementarySlugs: [
      'micheltorena-elementary-los-angeles-ca',
      'allesandro-elementary-los-angeles-ca',
      'clifford-street-elementary-los-angeles-ca',
      'delevan-drive-elementary-los-angeles-ca',
      'elysian-heights-arts-magnet-los-angeles-ca',
      'rockdale-vapa-magnet-los-angeles-ca',
      'cwc-silver-lake-los-angeles-ca',
    ],
    middleSlugs: [
      'thomas-starr-king-middle-los-angeles-ca',
    ],
    highSlugs: [
      'john-marshall-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
      'la-charter-magnet-school-choice-playbook',
    ],
  },

  'los-feliz': {
    label: 'Los Feliz',
    region: 'East LA',
    districts: ['LAUSD'],
    elementarySlugs: [
      'ivanhoe-elementary-los-angeles-ca',
      'franklin-avenue-elementary-los-angeles-ca',
      'los-feliz-stemm-magnet-los-angeles-ca',
      'glenfeliz-elementary-los-angeles-ca',
    ],
    middleSlugs: [
      'thomas-starr-king-middle-los-angeles-ca',
    ],
    highSlugs: [
      'john-marshall-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
    ],
  },

  'eagle-rock': {
    label: 'Eagle Rock / Highland Park',
    region: 'East LA',
    districts: ['LAUSD'],
    elementarySlugs: [
      'eagle-rock-elementary-los-angeles-ca',
      'dahlia-heights-elementary-los-angeles-ca',
      'toland-way-elementary-los-angeles-ca',
      'aldama-elementary-los-angeles-ca',
      'yorkdale-elementary-los-angeles-ca',
      'buchanan-street-elementary-los-angeles-ca',
      'arroyo-seco-museum-science-magnet-los-angeles-ca',
    ],
    middleSlugs: [],
    highSlugs: [
      'eagle-rock-high-school-los-angeles-ca',
      'benjamin-franklin-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
    ],
  },

  'atwater-village': {
    label: 'Atwater Village / Mt. Washington',
    region: 'East LA',
    districts: ['LAUSD'],
    elementarySlugs: [
      'atwater-avenue-elementary-los-angeles-ca',
      'glenfeliz-elementary-los-angeles-ca',
      'mt-washington-elementary-los-angeles-ca',
    ],
    middleSlugs: [
      'thomas-starr-king-middle-los-angeles-ca',
    ],
    highSlugs: [
      'john-marshall-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // HOLLYWOOD HILLS
  // ═══════════════════════════════════════════════════════════════

  'hollywood-hills': {
    label: 'Hollywood Hills',
    region: 'Hollywood Hills',
    districts: ['LAUSD'],
    elementarySlugs: [
      // Core Hollywood Hills elementaries
      'wonderland-avenue-elementary-los-angeles-ca',
      'gardner-street-elementary-los-angeles-ca',
      'cheremoya-avenue-elementary-los-angeles-ca',
      'micheltorena-elementary-los-angeles-ca',
      'franklin-avenue-elementary-los-angeles-ca',
      'los-feliz-stemm-magnet-los-angeles-ca',
      'atwater-avenue-elementary-los-angeles-ca',
      // Charter / magnet (escape options)
      'larchmont-charter-school-los-angeles-ca',
      'cwc-hollywood-los-angeles-ca',
      'laces-magnet-los-angeles-ca',
      // Over-the-hill charters (~15 min via Laurel Canyon)
      'carpenter-charter-studio-city-ca',
      'colfax-charter-valley-village-ca',
    ],
    middleSlugs: [
      'bancroft-middle-school-los-angeles-ca',
      'le-conte-middle-school-los-angeles-ca',
      'john-burroughs-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'hollywood-high-school-los-angeles-ca',
      'john-marshall-high-school-los-angeles-ca',
      'fairfax-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'hollywood-hills-school-choice-playbook',
      'lausd-school-choice-playbook',
      'la-charter-magnet-school-choice-playbook',
    ],
    privateSlugs: [
      'the-oaks-school-los-angeles-ca',
      'hollywood-schoolhouse-los-angeles-ca',
    ],
  },

  'studio-city': {
    label: 'Studio City',
    region: 'Hollywood Hills',
    districts: ['LAUSD'],
    elementarySlugs: [
      'carpenter-charter-studio-city-ca',
      'colfax-charter-valley-village-ca',
      'wonderland-avenue-elementary-los-angeles-ca',
    ],
    middleSlugs: [
      'john-burroughs-middle-school-los-angeles-ca',
    ],
    highSlugs: [],
    playbookSlugs: [
      'lausd-school-choice-playbook',
    ],
  },

  'hancock-park': {
    label: 'Hancock Park',
    region: 'Hollywood Hills',
    districts: ['LAUSD'],
    elementarySlugs: [
      'hancock-park-elementary-los-angeles-ca',
      'third-street-elementary-los-angeles-ca',
      'laces-magnet-los-angeles-ca',
      'larchmont-charter-school-los-angeles-ca',
    ],
    middleSlugs: [
      'le-conte-middle-school-los-angeles-ca',
    ],
    highSlugs: [
      'fairfax-high-school-los-angeles-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
      'la-charter-magnet-school-choice-playbook',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SOUTH PASADENA
  // ═══════════════════════════════════════════════════════════════

  'south-pasadena': {
    label: 'South Pasadena',
    region: 'East LA',
    districts: ['SPUSD'],
    elementarySlugs: [
      'marengo-elementary-south-pasadena-ca',
      'arroyo-vista-elementary-south-pasadena-ca',
      'monterey-hills-elementary-south-pasadena-ca',
    ],
    middleSlugs: [
      'south-pasadena-middle-school-south-pasadena-ca',
    ],
    highSlugs: [
      'south-pasadena-senior-high-south-pasadena-ca',
    ],
    playbookSlugs: [
      'lausd-school-choice-playbook',
    ],
  },
}

// ── Derived exports ──────────────────────────────────────────────────────────

export const NEIGHBORHOOD_LIST = Object.entries(NEIGHBORHOOD_SCHOOLS).map(([id, data]) => ({
  id,
  ...data,
}))

export function getNeighborhoodById(id: string): NeighborhoodConfig | null {
  return NEIGHBORHOOD_SCHOOLS[id] || null
}

/** Get all neighborhoods in a region */
export function getNeighborhoodsByRegion(region: string) {
  return NEIGHBORHOOD_LIST.filter((n) => n.region === region)
}

/** Get all unique regions */
export function getRegions(): string[] {
  const regions = new Set(NEIGHBORHOOD_LIST.map((n) => n.region))
  return Array.from(regions)
}

/** Map a neighborhood label (e.g. "Mar Vista") to its ID (e.g. "mar-vista") */
export const NEIGHBORHOOD_LABEL_TO_ID: Record<string, string> = Object.fromEntries(
  NEIGHBORHOOD_LIST.map((n) => [n.label, n.id])
)

/** Find the first neighborhood ID that contains this school/guide slug */
export function getNeighborhoodForSlug(slug: string): string | null {
  for (const [id, hood] of Object.entries(NEIGHBORHOOD_SCHOOLS)) {
    const allSlugs = [
      ...hood.elementarySlugs,
      ...hood.middleSlugs,
      ...hood.highSlugs,
      ...hood.playbookSlugs,
      ...(hood.privateSlugs ?? []),
    ]
    if (allSlugs.includes(slug)) return id
  }
  return null
}

/** Get all slugs across all neighborhoods (for DEEP_DIVE_SLUGS validation) */
export function getAllDeepDiveSlugs(): Set<string> {
  const slugs = new Set<string>()
  for (const hood of Object.values(NEIGHBORHOOD_SCHOOLS)) {
    for (const s of hood.elementarySlugs) slugs.add(s)
    for (const s of hood.middleSlugs) slugs.add(s)
    for (const s of hood.highSlugs) slugs.add(s)
    for (const s of hood.playbookSlugs) slugs.add(s)
    for (const s of hood.privateSlugs || []) slugs.add(s)
  }
  return slugs
}
