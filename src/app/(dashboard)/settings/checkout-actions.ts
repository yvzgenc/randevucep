'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getPaymentProvider, buildIdempotencyKey } from '@/lib/payments'
import { PLANS, toPlanName, type PlanName } from '@/lib/plans'

export interface StartCheckoutResult {
  error?:              string
  /** iyzico: inject this HTML into the page to trigger the form POST */
  checkoutFormContent?: string
  /** Stripe/Paddle: redirect here */
  checkoutUrl?:        string
}

/**
 * Server Action: validates the upgrade request and initiates a checkout session.
 *
 * Security:
 * - Runs entirely server-side; client never touches payment credentials.
 * - Validates authenticated user owns the business being upgraded.
 * - Creates a `pending` payment record before calling the provider,
 *   so we have an audit trail even if the provider call fails.
 * - Subscription is NOT updated here — only after verified callback.
 */
export async function startCheckout(
  planName: string,
  period:   'monthly' | 'yearly' = 'monthly',
): Promise<StartCheckoutResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  // Validate plan
  const safePlan = toPlanName(planName)
  if (safePlan === 'starter') {
    return { error: 'Starter plan ücretsizdir, ödeme gerekmez.' }
  }

  const planConfig = PLANS[safePlan]

  // Fetch business
  const { data: business, error: bizErr } = await supabase
    .from('businesses')
    .select('id, name, phone')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (bizErr || !business) {
    return { error: 'İşletme bulunamadı.' }
  }

  // Don't let someone buy a plan they already have (not on trial)
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan_name, status, trial_ends_at')
    .eq('business_id', business.id)
    .maybeSingle()

  if (sub?.plan_name === safePlan && sub?.status === 'active') {
    const inTrial = sub.trial_ends_at
      ? new Date(sub.trial_ends_at) > new Date()
      : false
    if (!inTrial) {
      return { error: 'Bu plan zaten aktif.' }
    }
  }

  const amount = period === 'yearly'
    ? Math.round(planConfig.price_try * 10 * 100) / 100  // 10 months for yearly
    : planConfig.price_try

  const idempotencyKey = buildIdempotencyKey(business.id, safePlan, period)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const callbackUrl = `${appUrl}/api/webhooks/payment`

  // ── Record pending payment (audit trail, idempotency anchor) ─────────────
  const { data: payment, error: payErr } = await supabase
    .from('payments')
    .insert({
      business_id:              business.id,
      provider:                 'iyzico',
      provider_conversation_id: idempotencyKey,
      plan_name:                safePlan,
      amount,
      currency:                 'TRY',
      status:                   'pending',
    })
    .select('id')
    .single()

  if (payErr) {
    // May be a duplicate (same idempotency key) — that's fine, just fetch it
    if (!payErr.message.includes('unique')) {
      return { error: `Ödeme kaydı oluşturulamadı: ${payErr.message}` }
    }
  }

  // ── Call provider ─────────────────────────────────────────────────────────
  try {
    const provider = getPaymentProvider()
    const session = await provider.createCheckoutSession({
      businessId:     business.id,
      planName:       safePlan,
      amountTry:      amount,
      idempotencyKey,
      buyerEmail:     user.email ?? '',
      buyerName:      business.name,
      callbackUrl,
    })

    return {
      checkoutFormContent: session.checkoutFormContent,
      checkoutUrl:         session.checkoutUrl,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ödeme başlatılamadı.'
    // Mark the pending record as failed
    if (payment) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', payment.id)
    }
    return { error: message }
  }
}
