export interface MetroConfig {
  id: string
  label: string
  regions: string[]  // region labels in display order
}

export const METROS: Record<string, MetroConfig> = {
  'los-angeles': {
    id: 'los-angeles',
    label: 'Los Angeles',
    regions: [
      'Westside',
      'Beach Cities',
      'Hollywood & Mid-City',
      'Northeast LA & Pasadena',
    ],
  },
  // Future:
  // 'san-francisco': { id: 'san-francisco', label: 'San Francisco Bay Area', regions: [...] },
  // 'austin': { id: 'austin', label: 'Austin', regions: [...] },
}

export const DEFAULT_METRO = 'los-angeles'

export function getMetroList() {
  return Object.values(METROS)
}
