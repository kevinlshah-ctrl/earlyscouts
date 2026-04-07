import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

// In Next.js App Router, request bodies are NOT auto-parsed.
// await request.text() returns the raw bytes Stripe needs for signature verification.

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// ── Profile helpers ───────────────────────────────────────────────────────────

async function updateByUserId(
  supabase: ReturnType<typeof getAdminClient>,
  userId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabase
    .from('user_profiles')
    .update(values as never)
    .eq('id', userId)
  if (error) console.error('[webhook] updateByUserId error:', error.message)
}

async function updateByCustomerId(
  supabase: ReturnType<typeof getAdminClient>,
  customerId: string,
  values: Record<string, unknown>
) {
  const { error } = await supabase
    .from('user_profiles')
    .update(values as never)
    .eq('stripe_customer_id', customerId)
  if (error) console.error('[webhook] updateByCustomerId error:', error.message)
}

// ── Webhook handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig     = request.headers.get('stripe-signature')
  const secret  = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    console.error('[webhook] Missing stripe-signature header or STRIPE_WEBHOOK_SECRET env var')
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Signature verification failed:', msg)
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 })
  }

  console.log(`[webhook] Received event: ${event.type} id=${event.id}`)

  const supabase = getAdminClient()

  // ── Event dispatch ────────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── checkout.session.completed ─────────────────────────────────────
      // Fires when a user completes checkout (payment OR $0 promo code).
      // payment_status is 'paid' for both real payments and $0 promo codes.
      case 'checkout.session.completed': {
        const session    = event.data.object as Stripe.Checkout.Session
        const userId     = session.metadata?.userId
        const tier       = session.metadata?.tier as 'premium' | 'extended' | undefined
        const customerId = typeof session.customer === 'string' ? session.customer : null
        const payStatus  = session.payment_status // 'paid' | 'unpaid' | 'no_payment_required'

        console.log(`[webhook] checkout.session.completed: session=${session.id} userId=${userId} tier=${tier} customerId=${customerId} payment_status=${payStatus}`)

        if (!userId || !tier) {
          console.warn('[webhook] checkout.session.completed: missing metadata — no profile update')
          break
        }

        // Guard: only grant access for sessions that actually succeeded.
        // 'no_payment_required' covers $0 promo codes — treat same as 'paid'.
        if (payStatus === 'unpaid') {
          console.warn(`[webhook] checkout.session.completed: payment_status=unpaid, skipping access grant for userId=${userId}`)
          break
        }

        if (tier === 'premium') {
          // One-time payment: grant 3-day access window
          const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          console.log(`[webhook] Granting premium access to userId=${userId} expires=${expiresAt}`)
          await updateByUserId(supabase, userId, {
            plan_type:   'premium',
            access_expires_at:   expiresAt,
            stripe_customer_id:  customerId,
            updated_at:          new Date().toISOString(),
          })
          console.log(`[webhook] premium access granted userId=${userId}`)
        } else {
          // Extended subscription: Stripe trial period covers days 1-3, active on day 4+
          console.log(`[webhook] Granting extended/trialing access to userId=${userId}`)
          await updateByUserId(supabase, userId, {
            plan_type:   'extended',
            subscription_status: 'trialing',
            stripe_customer_id:  customerId,
            updated_at:          new Date().toISOString(),
          })
          console.log(`[webhook] extended/trialing access granted userId=${userId}`)
        }
        break
      }

      // ── invoice.paid ───────────────────────────────────────────────────
      // Fires on every successful subscription charge (after trial, and monthly).
      case 'invoice.paid': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) { console.warn('[webhook] invoice.paid: no customerId'); break }

        console.log(`[webhook] invoice.paid: customerId=${customerId} → subscription_status=active`)
        // Only update subscription status; tier was already set on checkout.session.completed
        await updateByCustomerId(supabase, customerId, {
          subscription_status: 'active',
          updated_at: new Date().toISOString(),
        })
        break
      }

      // ── invoice.payment_failed ─────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) { console.warn('[webhook] invoice.payment_failed: no customerId'); break }

        console.log(`[webhook] invoice.payment_failed: customerId=${customerId} → subscription_status=past_due`)
        await updateByCustomerId(supabase, customerId, {
          subscription_status: 'past_due',
          updated_at: new Date().toISOString(),
        })
        break
      }

      // ── customer.subscription.updated ─────────────────────────────────
      // Fires when the subscription transitions between states (trial → active, etc.)
      case 'customer.subscription.updated': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        if (!customerId) { console.warn('[webhook] customer.subscription.updated: no customerId'); break }

        const statusMap: Record<string, string> = {
          trialing: 'trialing',
          active:   'active',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid:   'past_due',
          paused:   'past_due',
        }
        const newStatus = statusMap[sub.status] ?? 'active'
        console.log(`[webhook] customer.subscription.updated: customerId=${customerId} sub.status=${sub.status} → ${newStatus}`)

        await updateByCustomerId(supabase, customerId, {
          subscription_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        break
      }

      // ── customer.subscription.deleted ─────────────────────────────────
      // Fires when a subscription is fully canceled.
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        if (!customerId) { console.warn('[webhook] customer.subscription.deleted: no customerId'); break }

        console.log(`[webhook] customer.subscription.deleted: customerId=${customerId} → tier=free canceled`)
        await updateByCustomerId(supabase, customerId, {
          plan_type:   'free',
          subscription_status: 'canceled',
          updated_at:          new Date().toISOString(),
        })
        break
      }

      default:
        console.log(`[webhook] Unhandled event type: ${event.type} — no action needed`)
        break
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown handler error'
    console.error(`[webhook] Unhandled error processing ${event.type}:`, msg)
    // Return 200 so Stripe doesn't retry — the error is logged, investigate in Vercel logs
  }

  return NextResponse.json({ received: true })
}
