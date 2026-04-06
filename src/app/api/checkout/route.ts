import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    // ── Env validation ────────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    const stripeKey   = process.env.STRIPE_SECRET_KEY
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    if (!supabaseUrl || !serviceKey) {
      console.error('[checkout] Missing Supabase env vars')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }
    if (!stripeKey) {
      console.error('[checkout] Missing STRIPE_SECRET_KEY')
      return NextResponse.json({ error: 'Payment system not configured' }, { status: 500 })
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const token = request.headers.get('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      console.error('[checkout] Auth error:', authErr?.message ?? 'No user returned')
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // ── Body params ───────────────────────────────────────────────────────────
    const body       = await request.json().catch(() => ({})) as { tier?: string; couponCode?: string }
    const tier       = body.tier === 'extended' ? 'extended' : 'premium'
    const couponCode = typeof body.couponCode === 'string' && body.couponCode.trim()
      ? body.couponCode.trim().toUpperCase()
      : null

    console.log(`[checkout] user=${user.id} tier=${tier} coupon=${couponCode ?? 'none'}`)

    // ── Profile & Stripe customer ─────────────────────────────────────────────
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, stripe_customer_id')
      .eq('id', user.id)
      .single()

    const row       = profile as { email: string; stripe_customer_id: string | null } | null
    const email     = row?.email ?? user.email ?? ''

    // Validate Stripe key format before initialising — catches invalid key early
    if (!stripeKey.startsWith('sk_')) {
      console.error('[checkout] STRIPE_SECRET_KEY has invalid format (must start with sk_test_ or sk_live_). Current prefix:', stripeKey.slice(0, 7))
      return NextResponse.json({ error: 'Payment system not configured correctly' }, { status: 500 })
    }

    const stripe    = new Stripe(stripeKey)

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
        code:   couponCode,
        limit:  1,
        active: true,
      })
      if (promoCodes.data.length === 0) {
        return NextResponse.json(
          { error: 'Invalid promo code. Please check and try again.' },
          { status: 400 }
        )
      }
      discounts = [{ promotion_code: promoCodes.data[0].id }]
    }

    // ── Build checkout session ─────────────────────────────────────────────────
    let session: Stripe.Checkout.Session

    if (tier === 'premium') {
      session = await stripe.checkout.sessions.create({
        mode:     'payment',
        customer: customerId,
        line_items: [{ price: process.env.STRIPE_PREMIUM_PRICE_ID!, quantity: 1 }],
        // allow_promotion_codes and discounts are mutually exclusive in Stripe:
        // use pre-applied discount if provided, otherwise let the Checkout UI accept codes.
        ...(discounts ? { discounts } : { allow_promotion_codes: true }),
        metadata:    { userId: user.id, tier: 'premium' },
        success_url: `${appUrl}/schools?welcome=1`,
        cancel_url:  `${appUrl}/pricing`,
      })
    } else {
      session = await stripe.checkout.sessions.create({
        mode:     'subscription',
        customer: customerId,
        line_items: [
          { price: process.env.STRIPE_EXTENDED_MONTHLY_PRICE_ID!, quantity: 1 },
        ],
        ...(discounts ? { discounts } : { allow_promotion_codes: true }),
        subscription_data: {
          trial_period_days: 3,
          metadata: { userId: user.id, tier: 'extended' },
          ...(process.env.STRIPE_EXTENDED_ONETIME_PRICE_ID
            ? { add_invoice_items: [{ price: process.env.STRIPE_EXTENDED_ONETIME_PRICE_ID, quantity: 1 }] }
            : {}),
        },
        metadata:    { userId: user.id, tier: 'extended' },
        success_url: `${appUrl}/schools?welcome=1`,
        cancel_url:  `${appUrl}/pricing`,
      })
    }

    return NextResponse.json({ url: session.url })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Unhandled error:', msg, err instanceof Error ? err.stack : '')
    return NextResponse.json(
      { error: 'Payment unavailable — please try again or contact hello@earlyscouts.com' },
      { status: 500 }
    )
  }
}
