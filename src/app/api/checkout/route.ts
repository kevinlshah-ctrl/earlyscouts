import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const stripeKey    = process.env.STRIPE_SECRET_KEY!
  const appUrl       = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // ── Body params ───────────────────────────────────────────────────────────
  const body = await request.json().catch(() => ({})) as { tier?: string; couponCode?: string }
  const tier       = body.tier === 'extended' ? 'extended' : 'premium'
  const couponCode = typeof body.couponCode === 'string' ? body.couponCode.trim().toUpperCase() : null

  // ── Profile & Stripe customer ─────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single()

  const row = profile as { email: string; stripe_customer_id: string | null } | null
  const email = row?.email ?? user.email ?? ''

  const stripe = new Stripe(stripeKey)

  // Create a Stripe customer on first purchase so webhook can look up by customer ID
  let customerId = row?.stripe_customer_id ?? null
  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await supabase
      .from('user_profiles')
      .update({ stripe_customer_id: customerId } as never)
      .eq('id', user.id)
  }

  // ── Promo code lookup ─────────────────────────────────────────────────────
  let discounts: { promotion_code: string }[] | undefined

  if (couponCode) {
    const promoCodes = await stripe.promotionCodes.list({
      code: couponCode,
      limit: 1,
      active: true,
    })
    if (promoCodes.data.length === 0) {
      return NextResponse.json({ error: 'Invalid promo code. Please check and try again.' }, { status: 400 })
    }
    discounts = [{ promotion_code: promoCodes.data[0].id }]
  }

  // ── Build checkout session ─────────────────────────────────────────────────

  let session: Stripe.Checkout.Session

  try {
    if (tier === 'premium') {
      // One-time payment — $34.99 for 3 days
      session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: customerId,
        line_items: [
          {
            price: process.env.STRIPE_PREMIUM_PRICE_ID!,
            quantity: 1,
          },
        ],
        ...(discounts ? { discounts } : {}),
        metadata: { userId: user.id, tier: 'premium' },
        success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${appUrl}/pricing`,
      })
    } else {
      // Subscription — $34.99 setup fee today + $9.99/mo starting day 4
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: process.env.STRIPE_EXTENDED_MONTHLY_PRICE_ID!,
            quantity: 1,
          },
          {
            price: process.env.STRIPE_EXTENDED_ONETIME_PRICE_ID!,
            quantity: 1,
          },
        ],
        ...(discounts ? { discounts } : {}),
        subscription_data: {
          trial_period_days: 3,
          metadata: { userId: user.id, tier: 'extended' },
        },
        metadata: { userId: user.id, tier: 'extended' },
        success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${appUrl}/pricing`,
      })
    }
  } catch (err) {
    throw err
  }

  return NextResponse.json({ url: session.url })
}
