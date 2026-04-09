import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
}

// GET — used by <a href="/api/stripe/portal"> links; redirects directly to Stripe
export async function GET(request: NextRequest) {
  const supabase = makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/signin', request.url))

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/pricing', request.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.earlyscouts.com'
  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${appUrl}/profile`,
  })
  return NextResponse.redirect(session.url)
}

// POST — kept for any existing callers that fetch the URL and redirect client-side
export async function POST() {
  const supabase = makeSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.earlyscouts.com'
  const session = await stripe.billingPortal.sessions.create({
    customer:   profile.stripe_customer_id,
    return_url: `${appUrl}/profile`,
  })
  return NextResponse.json({ url: session.url })
}
