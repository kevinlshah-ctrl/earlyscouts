export interface Neighborhood {
  name: string
  region: string
  zips: string[]
}

export const NEIGHBORHOODS: Neighborhood[] = [
  // LA Westside
  { name: 'Mar Vista',                   region: 'LA Westside', zips: ['90066'] },
  { name: 'Brentwood',                   region: 'LA Westside', zips: ['90049'] },
  { name: 'West LA',                     region: 'LA Westside', zips: ['90025'] },
  { name: 'Venice',                      region: 'LA Westside', zips: ['90291'] },
  { name: 'Santa Monica',                region: 'LA Westside', zips: ['90401', '90402', '90403', '90404', '90405'] },
  { name: 'Culver City',                 region: 'LA Westside', zips: ['90230', '90232'] },
  { name: 'Playa Vista / Playa del Rey', region: 'LA Westside', zips: ['90094', '90045'] },
  { name: 'Pacific Palisades',           region: 'LA Westside', zips: ['90272'] },
  { name: 'Palms',                       region: 'LA Westside', zips: ['90034'] },
  // SF Bay Area
  { name: 'Palo Alto',                   region: 'SF Bay Area', zips: ['94301', '94306'] },
  { name: 'Cupertino',                   region: 'SF Bay Area', zips: ['94087'] },
  { name: 'Berkeley',                    region: 'SF Bay Area', zips: ['94702', '94705'] },
  { name: 'San Francisco Mission',       region: 'SF Bay Area', zips: ['94110'] },
  { name: 'San Jose',                    region: 'SF Bay Area', zips: ['95125'] },
]

export function getNeighborhoodsByRegion(region: string): Neighborhood[] {
  return NEIGHBORHOODS.filter((n) => n.region === region)
}

export function searchNeighborhoods(query: string): Neighborhood[] {
  const q = query.toLowerCase()
  return NEIGHBORHOODS.filter((n) => n.name.toLowerCase().includes(q))
}

export function findNeighborhoodByName(name: string): Neighborhood | undefined {
  return NEIGHBORHOODS.find((n) => n.name.toLowerCase() === name.toLowerCase())
}
