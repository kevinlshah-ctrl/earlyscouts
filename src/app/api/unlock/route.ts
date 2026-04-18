import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const LIMITS = { school: 3, guide: 1 } as const

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { slug?: string; type?: string }
  const { slug, type } = body

  if (!slug || !type || (type !== 'school' && type !== 'guide')) {
    return NextResponse.json({ error: 'Missing or invalid slug/type' }, { status: 400 })
  }

  // Must be a starter-tier user
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('purchase_tier')
    .eq('id', user.id)
    .maybeSingle()

  const purchaseTier = (profile as { purchase_tier?: string } | null)?.purchase_tier
  if (purchaseTier !== 'starter') {
    return NextResponse.json({ error: 'Starter plan required' }, { status: 403 })
  }

  // Count existing unlocks of this type
  const { count, error: countErr } = await supabase
    .from('user_unlocks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('unlock_type', type)

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 })
  }

  const used  = count ?? 0
  const limit = LIMITS[type as keyof typeof LIMITS]

  if (used >= limit) {
    return NextResponse.json({ error: 'Unlock limit reached', remaining: 0 }, { status: 403 })
  }

  // Upsert — idempotent if already unlocked
  const { error: insertErr } = await supabase
    .from('user_unlocks')
    .upsert(
      { user_id: user.id, slug, unlock_type: type },
      { onConflict: 'user_id,slug' }
    )

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  const remaining = limit - (used + 1)
  console.log(`[unlock] userId=${user.id} type=${type} slug=${slug} remaining=${remaining}`)
  return NextResponse.json({ success: true, remaining })
}
