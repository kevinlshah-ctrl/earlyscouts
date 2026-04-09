import { calculateReadTime, calculateSourceCount } from '@/lib/report-metrics'
import type { ReportData } from '@/lib/types'

interface ReportMetaBadgesProps {
  reportData: ReportData
  size?: 'sm' | 'md'
}

export function ReportMetaBadges({ reportData, size = 'sm' }: ReportMetaBadgesProps) {
  const readTime    = calculateReadTime(reportData)
  const sourceCount = calculateSourceCount(reportData)

  const cls = size === 'sm'
    ? 'text-xs px-2 py-0.5 rounded-full'
    : 'text-sm px-3 py-1 rounded-full'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`${cls} bg-[#5B9A6F]/10 text-[#5B9A6F] font-medium`}>
        {readTime} min read
      </span>
      <span className={`${cls} bg-[#5B9A6F]/10 text-[#5B9A6F] font-medium`}>
        {sourceCount}+ sources
      </span>
    </div>
  )
}
