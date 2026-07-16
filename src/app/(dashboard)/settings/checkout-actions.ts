'use server'

import { headers }                     from 'next/headers'
import { createServerSupabaseClient }   from '@/lib/supabase/server'
import { getOwnerBusiness }             from '@/lib/supabase/business'
import { getPaymentProvider, buildIdempotencyKey } from '@/lib/payments'
import { PLANS, toPlanName }            from '@/lib/plans'

export interface StartCheckoutResult {
  error?:               string
  /** iyzico: inject this HTML into the page to trigger the 3DS form POST */
  checkoutFormContent?: string
  /** Stripe/Paddle: redirect to this URL */
  checkoutUrl?:         string
}

/**
 * Server Action: validates the upgrade request and starts a checkout session.
 *
 * Security:
 * - Runs server-side only — client never touches payment credentials.
 * - Validates the authenticated user owns the business being upgraded.
 * - Inserts a `pending` payments row before calling the provider — audit trail
 *   survives even if the provider call throws.
 * - On duplicate idempotency key (same user retrying), reuses the existing
 *   pending row and re-calls the provider for a fresh form.
 * - Subscription is NEVER updated here — only via verified webhook callback.
 */
export async function startCheckout(
  planName: string,
  period:   'monthly' | 'yearly' = 'monthly',
): Promise<StartCheckoutResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const safePlan = toPlanName(planName)
  if (safePlan === 'starter') {
    return { error: 'Starter plan ücretsizdir, ödeme gerekmez.' }
  }

  const planConfig = PLANS[safePlan]

  // Fetch business
  const business = await getOwnerBusiness(supabase, user.id)
  if (!business) {
    return { error: 'İşletme bulunamadı.' }
  }

  // Guard: don't charge for an already active (non-trial) plan
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

  const amount         = period === 'yearly'
    ? Math.round(planConfig.price_try * 10 * 100) / 100
    : planConfig.price_try

  const idempotencyKey = buildIdempotencyKey(business.id, safePlan, period)
  const appUrl         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const callbackUrl    = `${appUrl}/api/webhooks/payment`

  // Extract buyer IP for iyzico (required field)
  let buyerIp: string | undefined
  try {
    const hdrs = await headers()
    buyerIp = hdrs.get('x-forwarded-for')?.split(',')[0]?.trim()
           ?? hdrs.get('x-real-ip')
           ?? undefined
  } catch {
    // headers() unavailable in some test contexts — safe to skip
  }

  // ── Upsert the pending payment row ────────────────────────────────────────
  // On duplicate conversationId (user retrying same plan/period in same month),
  // we reuse the existing row and get a fresh checkout form from the provider.
  let paymentId: number | undefined

  const { data: inserted, error: insertErr } = await supabase
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

  if (insertErr) {
    if (insertErr.code === '23505' || insertErr.message.includes('unique')) {
      // Duplicate — fetch the existing row
      const { data: existing } = await supabase
        .from('payments')
        .select('id, status')
        .eq('provider_conversation_id', idempotencyKey)
        .maybeSingle()

      if (!existing) {
        return { error: 'Ödeme kaydı oluşturulamadı.' }
      }
      // Don't restart a completed payment
      if (existing.status === 'success') {
        return { error: 'Bu plan için ödeme zaten alınmış.' }
      }
      paymentId = existing.id
    } else {
      return { error: `Ödeme kaydı oluşturulamadı: ${insertErr.message}` }
    }
  } else {
    paymentId = inserted?.id
  }

  // ── Call iyzico ───────────────────────────────────────────────────────────
  try {
    const provider = getPaymentProvider()
    const session  = await provider.createCheckoutSession({
      businessId:     business.id,
      planName:       safePlan,
      amountTry:      amount,
      idempotencyKey,
      buyerEmail:     user.email ?? '',
      buyerName:      business.name,
      buyerIp,
      callbackUrl,
    })

    return {
      checkoutFormContent: session.checkoutFormContent,
      checkoutUrl:         session.checkoutUrl,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Ödeme başlatılamadı.'
    console.error('[checkout] Provider error:', message)

    // Mark the payment row as failed so the UI can show a clear error
    if (paymentId !== undefined) {
      await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('id', paymentId)
    }

    return { error: message }
  }
}
