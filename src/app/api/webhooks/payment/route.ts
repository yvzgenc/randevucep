// ─── Payment callback / webhook handler ──────────────────────────────────────
// Receives POST from the payment provider (iyzico callback or Stripe webhook).
// This is the ONLY place subscription status is upgraded from client-initiated
// payment attempts — never from client-side code.
//
// Security properties:
// - Uses service-role Supabase client so RLS cannot block the DB updates.
// - Verifies the payload with the provider's own signature / token check.
// - Idempotent: same paymentId → UPDATE, not duplicate INSERT.
// - Subscription is only set to 'active' when status === 'success'.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getPaymentProvider } from '@/lib/payments'
import { toPlanName } from '@/lib/plans'

/** Service-role client that bypasses RLS — used only in this server route. */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Payment webhook cannot process.'
    )
  }

  return createClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let rawPayload: Record<string, unknown>

  // iyzico sends application/x-www-form-urlencoded; Stripe sends JSON.
  // Detect by Content-Type.
  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text   = await req.text()
    const params = new URLSearchParams(text)
    rawPayload   = Object.fromEntries(params.entries())
  } else {
    try {
      rawPayload = (await req.json()) as Record<string, unknown>
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
  }

  // Collect headers for signature verification
  const headers: Record<string, string> = {}
  req.headers.forEach((value: string, key: string) => { headers[key] = value })

  let result
  try {
    const provider = getPaymentProvider()
    result         = await provider.verifyCallback(rawPayload, headers)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification failed'
    console.error('[webhook] Provider verification failed:', msg)
    // Return 200 to prevent provider retrying a fundamentally broken request
    return NextResponse.json({ error: msg }, { status: 200 })
  }

  // ── DB operations via service-role client ──────────────────────────────────
  let supabase
  try {
    supabase = createServiceClient()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Service client error'
    console.error('[webhook] Service client init failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // 1. Find the pending payment by conversationId (idempotency anchor)
  const { data: existingPayment } = await supabase
    .from('payments')
    .select('id, business_id, plan_name, status')
    .eq('provider',                 result.provider)
    .eq('provider_conversation_id', result.conversationId)
    .maybeSingle()

  if (!existingPayment) {
    // Payment record not found — possibly a provider retry for an unknown session
    console.warn('[webhook] No pending payment found for conversationId:', result.conversationId)
    return NextResponse.json({ received: true })
  }

  // 2. Idempotency: skip if already processed successfully
  if (existingPayment.status === 'success') {
    return NextResponse.json({ received: true, idempotent: true })
  }

  // 3. Determine new payment status
  const newPaymentStatus =
    result.status === 'success'  ? 'success'  :
    result.status === 'pending'  ? 'pending'   :
    'failed'

  const dbPaymentStatus =
    newPaymentStatus === 'success'  ? ('success'  as const) :
    newPaymentStatus === 'pending'  ? ('pending'  as const) :
    ('failed' as const)

  // 4. Update payment record
  await supabase
    .from('payments')
    .update({
      provider_payment_id: result.paymentId,
      status:              dbPaymentStatus,
      payload_json:        result.rawPayload as Record<string, unknown>,
      paid_at:             result.status === 'success' ? new Date().toISOString() : null,
    })
    .eq('id', existingPayment.id)

  // 5. On success: update subscription
  if (result.status === 'success') {
    const safePlan = toPlanName(existingPayment.plan_name)

    const { error: subErr } = await supabase
      .from('subscriptions')
      .update({
        plan_name:     safePlan,
        status:        'active',
        trial_ends_at: null,           // clear trial on paid activation
        started_at:    new Date().toISOString(),
        billing_period: 'monthly',
      })
      .eq('business_id', existingPayment.business_id)

    if (subErr) {
      console.error('[webhook] Subscription update failed:', subErr.message)
      // Don't return 500 — payment is recorded; fix subscription manually if needed
    } else {
      console.info(
        `[webhook] Subscription activated: business ${existingPayment.business_id} → ${safePlan}`
      )
    }
  }

  return NextResponse.json({ received: true, status: result.status })
}

// iyzico also sends a GET redirect after the form; handle it gracefully
export async function GET(req: NextRequest): Promise<NextResponse> {
  const status = req.nextUrl.searchParams.get('status') ?? 'unknown'
  // Redirect to the result page
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return NextResponse.redirect(`${appUrl}/payment/result?status=${status}`)
}
