import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Missing auth token' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const supabaseAdmin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Verify the JWT belongs to a real user
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token)
  if (verifyError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }

  // Explicitly delete user_profiles row first — CASCADE may not be configured
  const { error: profileErr } = await supabaseAdmin
    .from('user_profiles')
    .delete()
    .eq('id', user.id)

  if (profileErr) {
    console.warn('[delete-account] user_profiles delete warning:', profileErr.message)
    // Non-fatal: row may not exist; continue to auth deletion
  }

  // Delete the auth user
  const { error } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (error) {
    console.error('[delete-account] deleteUser failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
