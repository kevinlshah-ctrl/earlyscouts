import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function DELETE() {
  const cookieStore = cookies()

  // Use cookie-based auth to get the user
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client for deletion
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Delete profile row first (non-fatal if row doesn't exist)
  await supabaseAdmin.from('user_profiles').delete().eq('id', user.id)

  // Delete auth user
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  // Clear all cookies in response
  const response = NextResponse.json({ success: true })
  cookieStore.getAll().forEach(cookie => {
    response.cookies.delete(cookie.name)
  })

  return response
}
