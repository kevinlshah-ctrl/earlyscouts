import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  console.log('[delete-account] Request received')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey     = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.error('[delete-account] Missing env vars — url:', !!supabaseUrl, 'anon:', !!anonKey, 'service:', !!serviceKey)
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) {
    console.error('[delete-account] No Authorization header')
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
  }

  // ── Step 1: Verify the JWT with the anon client ──────────────────────────
  // auth.getUser(token) validates the bearer token against Supabase Auth.
  // Using the anon key here is correct — it treats the token as a user JWT.
  // The service role key is reserved for admin operations below.
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('[delete-account] Verifying JWT...')
  const { data: { user }, error: verifyError } = await anonClient.auth.getUser(token)
  if (verifyError || !user) {
    console.error('[delete-account] JWT verification failed:', verifyError?.message ?? 'no user returned')
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
  console.log('[delete-account] JWT verified, user.id=', user.id)

  // ── Step 2: Delete user_profiles row (admin client, bypasses RLS) ────────
  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  console.log('[delete-account] Deleting user_profiles row for id=', user.id)
  const { error: profileErr } = await adminClient
    .from('user_profiles')
    .delete()
    .eq('id', user.id)

  if (profileErr) {
    // Non-fatal — row may not exist (e.g. DB trigger failed at signup).
    // Log it and continue to auth deletion.
    console.warn('[delete-account] user_profiles delete warning (non-fatal):', profileErr.message, '| code:', profileErr.code)
  } else {
    console.log('[delete-account] user_profiles row deleted (or no row existed)')
  }

  // ── Step 3: Delete the auth user via admin API ───────────────────────────
  console.log('[delete-account] Calling auth.admin.deleteUser for id=', user.id)
  const { error: deleteErr } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteErr) {
    console.error('[delete-account] auth.admin.deleteUser failed:', deleteErr.message, '| status:', deleteErr.status)
    return NextResponse.json({ error: deleteErr.message }, { status: 500 })
  }

  console.log('[delete-account] Auth user deleted successfully, id=', user.id)
  return NextResponse.json({ ok: true })
}
