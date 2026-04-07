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

  // Fetch the raw profile row (all columns, no mapping)
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    auth_user_id: user.id,
    auth_email:   user.email,
    profile:      data ?? null,
    _note:        data === null
      ? 'No user_profiles row found for this auth user ID'
      : 'Row found — check plan_type and access_expires_at',
  })
}
