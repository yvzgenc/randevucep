// ─── Payment provider registry ────────────────────────────────────────────────
// Add new providers here; PAYMENT_PROVIDER env selects the active one.

import { IyzicoProvider } from './providers/iyzico'
import type { PaymentProvider } from './types'

export * from './types'

let _provider: PaymentProvider | null = null

/** Returns the singleton active payment provider. */
export function getPaymentProvider(): PaymentProvider {
  if (_provider) return _provider

  const name = process.env.PAYMENT_PROVIDER ?? 'iyzico'
  switch (name) {
    case 'iyzico':
      _provider = new IyzicoProvider()
      return _provider
    default:
      throw new Error(`Unknown payment provider: "${name}". Set PAYMENT_PROVIDER env var.`)
  }
}

// ─── Idempotency key ──────────────────────────────────────────────────────────

/**
 * Generates a stable idempotency key for a checkout attempt.
 * Same business + plan + billing period → same key → safe to retry.
 */
export function buildIdempotencyKey(
  businessId: number,
  planName:   string,
  period:     'monthly' | 'yearly',
): string {
  const now   = new Date()
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `biz-${businessId}-${planName}-${period}-${month}`
}
