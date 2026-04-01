import { Suspense } from 'react'
import { getDeepDiveSchools } from './getDeepDiveSchools'
import SchoolsDiscovery from './SchoolsDiscovery'

export const metadata = {
  title: 'Schools | EarlyScouts',
  description: 'Deep-dive research reports on 40+ LA schools.',
}

export default async function SchoolsPage() {
  const schools = await getDeepDiveSchools()
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FFFAF6] flex items-center justify-center">
        <div className="text-[#9B9690] text-sm font-mono">Loading schools...</div>
      </div>
    }>
      <SchoolsDiscovery allSchools={schools} />
    </Suspense>
  )
}
