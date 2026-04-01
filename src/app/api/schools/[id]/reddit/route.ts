import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const schoolId = params.id

  const { data, error } = await supabase
    .from('reddit_summaries')
    .select('*')
    .eq('school_id', schoolId)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ hasData: false })
  }

  return NextResponse.json({
    hasData: true,
    summary: {
      themes: data.themes ?? [],
      summary: data.summary ?? '',
      overallSentiment: data.overall_sentiment ?? 'neutral',
      mentionCount: data.mention_count ?? 0,
      subredditsFound: data.subreddits_found ?? [],
      notableThreads: data.notable_threads ?? [],
      generatedAt: data.generated_at,
    },
  })
}
