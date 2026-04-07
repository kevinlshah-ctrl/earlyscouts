import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/debug-profile
 * Returns the current user's raw user_profiles row as JSON.
 * Requires Authorization: Bearer <access_token> header.
 *
 * Use this to verify what plan_type / access_expires_at is in the DB
 * without needing direct Supabase dashboard access.
 *
 * TODO: Remove or gate behind an admin check before public launch.
 */
export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the JWT and get the user
  const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Direct DB query — bypasses any client-side caching; service role key bypasses RLS
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[debug-profile] DB error:', error.message, 'for userId:', user.id)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Also do a targeted select of the access columns so they're easy to spot
  const { data: accessRow } = await supabase
    .from('user_profiles')
    .select('plan_type, access_expires_at, subscription_status, stripe_customer_id, updated_at')
    .eq('id', user.id)
    .maybeSingle()

  const now = new Date().toISOString()
  const expiresAt = accessRow?.access_expires_at ? new Date(accessRow.access_expires_at) : null
  const isExpired = expiresAt ? expiresAt < new Date() : null

  return NextResponse.json({
    fetched_at:   now,
    auth_user_id: user.id,
    auth_email:   user.email,
    access: {
      plan_type:          accessRow?.plan_type ?? 'NOT FOUND',
      access_expires_at:  accessRow?.access_expires_at ?? null,
      expires_in_ms:      expiresAt ? expiresAt.getTime() - Date.now() : null,
      is_expired:         isExpired,
      subscription_status: accessRow?.subscription_status ?? null,
      stripe_customer_id: accessRow?.stripe_customer_id ?? null,
      updated_at:         accessRow?.updated_at ?? null,
    },
    full_profile: data ?? null,
    _note: data === null
      ? 'ERROR: No user_profiles row found for this auth user ID — webhook may not have created it'
      : `Row found. plan_type=${accessRow?.plan_type}. Last updated: ${accessRow?.updated_at}`,
  })
}
