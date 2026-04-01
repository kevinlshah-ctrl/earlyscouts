/**
 * schools.ts
 * School data access functions.
 * Phase 1: Read from static JSON (deprecated, kept for reference)
 * Phase 2: All data flows through /api/schools/* routes which use on-demand scraping.
 *
 * Do not import JSON files directly — use the API routes instead.
 */

export function getSchoolsByZip(_zip: string) {
  console.warn('getSchoolsByZip is deprecated. Use GET /api/schools/search?zip= instead.')
  return []
}

export function getSchoolBySlug(_slug: string) {
  console.warn('getSchoolBySlug is deprecated. Use GET /api/schools/{slug} instead.')
  return null
}

export function getSchoolsForCompare(_slugs: string[]) {
  console.warn('getSchoolsForCompare is deprecated. Use GET /api/schools/compare?ids= instead.')
  return []
}
