// ─── Payment callback / webhook handler ──────────────────────────────────────
// Receives the iyzico callback POST at the end of the 3DS checkout flow.
// This is the ONLY place subscription status is updated from payment events.
//
// iyzico POSTs: application/x-www-form-urlencoded
//   Fields:     token, status, conversationId
//
// Security:
//   - Service-role client bypasses RLS for DB writes.
//   - Provider.verifyCallback() calls iyzico's detail endpoint server-side.
//   - Idempotency: payment row already 'success' → skip entirely.
//   - Subscription only set to 'active' when verification returns 'success'.

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient }       from '@/lib/supabase/service'
import { getPaymentProvider }        from '@/lib/payments'
import { toPlanName }                from '@/lib/plans'

/**
 * Extracts the billing period from the idempotency key.
 * Key format: biz-{businessId}-{planName}-{period}-{YYYY-MM}
 * Returns 'monthly' as a safe fallback.
 */
function parsePeriod(conversationId: string): 'monthly' | 'yearly' {
  // Split on '-' and look for the segment that is 'monthly' or 'yearly'
  const parts = conversationId.split('-')
  for (const part of parts) {
    if (part === 'monthly' || part === 'yearly') return part
  }
  return 'monthly'
}

/** Calculate subscription end date based on billing period. */
function calcEndsAt(period: 'monthly' | 'yearly'): string {
  const d = new Date()
  if (period === 'yearly') {
    d.setFullYear(d.getFullYear() + 1)
  } else {
    d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString()
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // iyzico sends form-urlencoded
  let rawPayload: Record<string, unknown>
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    rawPayload = Object.fromEntries(new URLSearchParams(text).entries())
  } else {
    try {
      rawPayload = (await req.json()) as Record<string, unknown>
    } catch {
      console.warn('[webhook] Unparseable body — returning 200 to avoid retries')
      return NextResponse.json({ received: true, warning: 'unparseable_body' })
    }
  }

  const hdrs: Record<string, string> = {}
  req.headers.forEach((value: string, key: string) => { hdrs[key] = value })

  // ── Provider verification ─────────────────────────────────────────────────
  let result
  try {
    const provider = getPaymentProvider()
    result = await provider.verifyCallback(rawPayload, hdrs)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Verification error'
    console.error('[webhook] Provider verification threw:', msg)
    return NextResponse.json({ received: true, error: msg })
  }

  console.info(
    `[webhook] Callback | provider=${result.provider}` +
    ` conversationId=${result.conversationId} status=${result.status}`
  )

  // ── DB operations ─────────────────────────────────────────────────────────
  let supabase
  try {
    supabase = createServiceClient()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Service client error'
    console.error('[webhook] Service client init failed:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const { data: payment, error: lookupErr } = await supabase
    .from('payments')
    .select('id, business_id, plan_name, status')
    .eq('provider', result.provider)
    .eq('provider_conversation_id', result.conversationId)
    .maybeSingle()

  if (lookupErr) {
    console.error('[webhook] DB lookup error:', lookupErr.message)
    return NextResponse.json({ received: true, error: 'db_lookup_failed' })
  }

  if (!payment) {
    console.warn('[webhook] No payment row for conversationId:', result.conversationId)
    return NextResponse.json({ received: true, warning: 'payment_not_found' })
  }

  // Idempotency: already successfully processed → skip
  if (payment.status === 'success') {
    console.info('[webhook] Idempotent skip | id:', payment.id)
    return NextResponse.json({ received: true, idempotent: true })
  }

  const dbStatus =
    result.status === 'success' ? 'success' as const :
    result.status === 'pending' ? 'pending' as const :
    'failed' as const

  const { error: payUpdateErr } = await supabase
    .from('payments')
    .update({
      provider_payment_id: result.paymentId || null,
      status:              dbStatus,
      payload_json:        result.rawPayload,
      paid_at:             result.status === 'success' ? new Date().toISOString() : null,
    })
    .eq('id', payment.id)

  if (payUpdateErr) {
    console.error('[webhook] Failed to update payment row:', payUpdateErr.message)
  }

  // On success: activate subscription with correct period and end date
  if (result.status === 'success') {
    // business_id is nullable in the payments schema — guard before use
    const businessId = payment.business_id
    if (businessId == null) {
      console.error('[webhook] payment.business_id is null for payment id:', payment.id)
      return NextResponse.json({ received: true, error: 'missing_business_id' })
    }

    const safePlan = toPlanName(payment.plan_name)
    const period   = parsePeriod(result.conversationId)
    const endsAt   = calcEndsAt(period)

    const { error: subErr } = await supabase
      .from('subscriptions')
      .update({
        plan_name:      safePlan,
        status:         'active',
        trial_ends_at:  null,
        started_at:     new Date().toISOString(),
        billing_period: period,
        ends_at:        endsAt,
      })
      .eq('business_id', businessId)

    if (subErr) {
      console.error('[webhook] Subscription update failed:', subErr.message,
        '| business_id:', businessId, '| plan:', safePlan)
    } else {
      console.info(
        `[webhook] Subscription activated | business=${businessId}` +
        ` plan=${safePlan} period=${period} ends=${endsAt} paymentId=${result.paymentId}`
      )
    }
  } else if (result.status === 'failure') {
    console.info(
      `[webhook] Payment failed | business=${payment.business_id ?? 'unknown'}` +
      ` reason=${result.errorMessage ?? 'unknown'}`
    )
  }

  return NextResponse.json({ received: true, status: result.status })
}

// iyzico may also redirect the browser via GET after the form flow
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl

  const status         = searchParams.get('status') ?? 'unknown'
  const conversationId = searchParams.get('conversationId') ?? ''

  // Use origin from the request as a safe fallback when NEXT_PUBLIC_APP_URL is unset
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
             || req.nextUrl.origin

  // Resolve plan name from payments row for a friendlier result page
  let plan = ''
  if (conversationId) {
    try {
      const supabase = createServiceClient()
      const { data } = await supabase
        .from('payments')
        .select('plan_name')
        .eq('provider_conversation_id', conversationId)
        .maybeSingle()
      plan = data?.plan_name ?? ''
    } catch {
      // Non-critical — result page works without it
    }
  }

  const params = new URLSearchParams({ status })
  if (plan) params.set('plan', plan)

  return NextResponse.redirect(`${appUrl}/payment/result?${params.toString()}`)
}
