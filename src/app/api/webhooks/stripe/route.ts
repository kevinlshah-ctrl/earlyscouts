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

type AdminClient = ReturnType<typeof getAdminClient>

// ── Profile helpers ───────────────────────────────────────────────────────────

/**
 * Update user_profiles by auth user UUID.
 * Returns the number of rows actually updated (0 = row not found).
 */
async function updateByUserId(
  supabase: AdminClient,
  userId: string,
  values: Record<string, unknown>
): Promise<number> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(values as never)
    .eq('id', userId)
    .select('id')

  if (error) {
    console.error('[webhook] updateByUserId error:', error.message, '| code:', error.code)
    return 0
  }
  const count = data?.length ?? 0
  console.log(`[webhook] updateByUserId userId=${userId} rows_updated=${count}`)
  return count
}

/**
 * Update user_profiles by stripe_customer_id.
 * Returns the number of rows actually updated.
 */
async function updateByCustomerId(
  supabase: AdminClient,
  customerId: string,
  values: Record<string, unknown>
): Promise<number> {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(values as never)
    .eq('stripe_customer_id', customerId)
    .select('id')

  if (error) {
    console.error('[webhook] updateByCustomerId error:', error.message, '| code:', error.code)
    return 0
  }
  const count = data?.length ?? 0
  console.log(`[webhook] updateByCustomerId customerId=${customerId} rows_updated=${count}`)
  return count
}

/**
 * Upsert a user_profiles row when all lookups return 0 rows.
 * Uses the userId as the primary key — safe to call even if the row exists.
 */
async function upsertProfile(
  supabase: AdminClient,
  userId: string,
  values: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase
    .from('user_profiles')
    .upsert({ id: userId, ...values } as never, { onConflict: 'id' })

  if (error) {
    console.error('[webhook] upsertProfile error:', error.message, '| code:', error.code)
  } else {
    console.log(`[webhook] upsertProfile userId=${userId} — row created/updated`)
  }
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
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // ── Full diagnostic log ──────────────────────────────────────────
        console.log('[webhook] checkout.session.completed raw fields:', JSON.stringify({
          id:                   session.id,
          payment_status:       session.payment_status,
          status:               session.status,
          customer:             session.customer,
          customer_email:       session.customer_email,
          client_reference_id:  session.client_reference_id,
          metadata:             session.metadata,
          customer_details:     session.customer_details,
        }))

        const metaUserId    = session.metadata?.userId
        const clientRefId   = session.client_reference_id  // set by /api/checkout as user.id
        const tier          = session.metadata?.tier as 'premium' | 'extended' | 'starter' | 'full_access' | undefined
        const customerId    = typeof session.customer === 'string' ? session.customer : null
        const customerEmail =
          session.customer_details?.email ??
          session.customer_email ??
          null
        const payStatus     = session.payment_status

        console.log(`[webhook] checkout.session.completed: session=${session.id} metaUserId=${metaUserId} clientRefId=${clientRefId} tier=${tier} customerId=${customerId} customerEmail=${customerEmail} payment_status=${payStatus}`)

        // Guard: only grant access for sessions that actually succeeded.
        if (payStatus === 'unpaid') {
          console.warn(`[webhook] checkout.session.completed: payment_status=unpaid, skipping`)
          break
        }

        // ── Build the update payload ─────────────────────────────────────
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        const now       = new Date().toISOString()

        const premiumUpdate: Record<string, unknown> = {
          plan_type:         'premium',
          access_expires_at: expiresAt,
          stripe_customer_id: customerId,
          updated_at:        now,
        }
        const extendedUpdate: Record<string, unknown> = {
          plan_type:           'extended',
          subscription_status: 'trialing',
          stripe_customer_id:  customerId,
          updated_at:          now,
        }
        const starterUpdate: Record<string, unknown> = {
          purchase_tier:     'starter',
          stripe_customer_id: customerId,
          updated_at:        now,
        }
        const fullAccessUpdate: Record<string, unknown> = {
          purchase_tier:     'full_access',
          stripe_customer_id: customerId,
          updated_at:        now,
        }

        const updatePayload =
          tier === 'premium'     ? premiumUpdate    :
          tier === 'extended'    ? extendedUpdate   :
          tier === 'starter'     ? starterUpdate    :
          tier === 'full_access' ? fullAccessUpdate :
          null

        if (!updatePayload) {
          console.warn('[webhook] checkout.session.completed: unrecognised tier:', tier)
          break
        }

        console.log(`[webhook] Will apply update:`, JSON.stringify(updatePayload))

        // ── Attempt 1: metadata.userId ───────────────────────────────────
        let rowsUpdated = 0
        const lookupUserId = metaUserId ?? clientRefId

        if (lookupUserId) {
          console.log(`[webhook] Attempt 1: updateByUserId id=${lookupUserId}`)
          rowsUpdated = await updateByUserId(supabase, lookupUserId, updatePayload)
        } else {
          console.warn('[webhook] Attempt 1 skipped: no userId in metadata or client_reference_id')
        }

        // ── Attempt 2: client_reference_id (if different from metadata) ──
        if (rowsUpdated === 0 && clientRefId && clientRefId !== metaUserId) {
          console.log(`[webhook] Attempt 2: updateByUserId clientRefId=${clientRefId}`)
          rowsUpdated = await updateByUserId(supabase, clientRefId, updatePayload)
        }

        // ── Attempt 3: stripe_customer_id ────────────────────────────────
        if (rowsUpdated === 0 && customerId) {
          console.log(`[webhook] Attempt 3: updateByCustomerId customerId=${customerId}`)
          rowsUpdated = await updateByCustomerId(supabase, customerId, updatePayload)
        }

        // ── Attempt 4: upsert using best available userId ────────────────
        // Note: user_profiles has no email column — do not include email in upsert
        if (rowsUpdated === 0) {
          const upsertId = lookupUserId ?? clientRefId
          if (upsertId) {
            console.warn(`[webhook] All lookups returned 0 rows — upserting new row for userId=${upsertId}`)
            await upsertProfile(supabase, upsertId, updatePayload)
          } else {
            console.error('[webhook] FATAL: no userId available for any lookup — cannot update profile. session.id=', session.id)
          }
        }

        console.log(`[webhook] checkout.session.completed complete: tier=${tier} rowsUpdated=${rowsUpdated}`)
        break
      }

      // ── invoice.paid ───────────────────────────────────────────────────
      case 'invoice.paid': {
        const invoice    = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) { console.warn('[webhook] invoice.paid: no customerId'); break }

        console.log(`[webhook] invoice.paid: customerId=${customerId} → subscription_status=active`)
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
      case 'customer.subscription.deleted': {
        const sub        = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : null
        if (!customerId) { console.warn('[webhook] customer.subscription.deleted: no customerId'); break }

        console.log(`[webhook] customer.subscription.deleted: customerId=${customerId} → tier=free canceled`)
        await updateByCustomerId(supabase, customerId, {
          plan_type:           'free',
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
    console.error(`[webhook] Unhandled error processing ${event.type}:`, msg, err instanceof Error ? err.stack : '')
    // Return 200 so Stripe doesn't retry — the error is logged, investigate in Vercel logs
  }

  return NextResponse.json({ received: true })
}
