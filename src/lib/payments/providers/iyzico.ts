// ─── iyzico Payment Provider ──────────────────────────────────────────────────
// Implements the PaymentProvider interface for iyzico.
//
// iyzico API docs: https://dev.iyzipay.com/
//
// Environment variables required:
//   IYZICO_API_KEY     — API key from iyzico merchant panel
//   IYZICO_SECRET_KEY  — Secret key from iyzico merchant panel
//   IYZICO_BASE_URL    — https://sandbox.iyzipay.com  (test)
//                         https://api.iyzipay.com       (production)
//
// iyzico checkout flow:
//   1. POST /payment/iyzipos/checkoutform/initialize (returns HTML form)
//   2. User submits form → iyzico redirects to callbackUrl with token
//   3. POST /payment/iyzipos/checkoutform/auth/ecommerce/detail
//      to verify the token server-side
//
// This file provides the skeleton structure. Wire up the actual HTTP calls
// once iyzico merchant credentials are available.

import { createHash, createHmac } from 'crypto'
import type {
  PaymentProvider,
  CheckoutSession,
  CheckoutRequest,
  PaymentResult,
  ProviderName,
} from '../types'

// ─── HMAC / SHA1 helpers (iyzico PKI string) ──────────────────────────────────

function generateRandomString(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length)
}

/**
 * iyzico PKI string format for request signing:
 * apiKey + randomKey + currentTime + secretKey + conversationId + price + ...
 * See iyzico docs for exact field order per endpoint.
 */
function generatePkiString(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([, v]) => v)
    .join('')
}

function generateAuthorizationHeader(
  apiKey:    string,
  secretKey: string,
  pkiString: string,
): string {
  const randomKey  = generateRandomString()
  const combined   = apiKey + randomKey + pkiString + secretKey
  const hash       = createHash('sha1').update(combined).digest('base64')
  return `IYZWSv2 apiKey:${apiKey}&randomKey:${randomKey}&signature:${hash}`
}

// ─── Provider class ───────────────────────────────────────────────────────────

export class IyzicoProvider implements PaymentProvider {
  readonly name: ProviderName = 'iyzico'

  private readonly apiKey:    string
  private readonly secretKey: string
  private readonly baseUrl:   string

  constructor() {
    this.apiKey    = process.env.IYZICO_API_KEY    ?? ''
    this.secretKey = process.env.IYZICO_SECRET_KEY ?? ''
    this.baseUrl   = process.env.IYZICO_BASE_URL   ?? 'https://sandbox.iyzipay.com'

    if (!this.apiKey || !this.secretKey) {
      // Warn at startup but don't throw — allows the app to boot without creds
      console.warn('[iyzico] IYZICO_API_KEY or IYZICO_SECRET_KEY is not set.')
    }
  }

  /** Build the Authorization header for an iyzico request. */
  private buildAuthHeader(pkiString: string): string {
    return generateAuthorizationHeader(this.apiKey, this.secretKey, pkiString)
  }

  /**
   * Initiate an iyzico checkout form.
   *
   * Returns the raw HTML form content that must be injected into the page
   * so the browser POSTs to iyzico's 3DS flow.
   *
   * NOTE: This is a skeleton. Uncomment and adjust the fetch call once
   * you have real credentials and have tested the request shape.
   */
  async createCheckoutSession(req: CheckoutRequest): Promise<CheckoutSession> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error(
        'iyzico credentials are not configured. ' +
        'Set IYZICO_API_KEY, IYZICO_SECRET_KEY, and IYZICO_BASE_URL.'
      )
    }

    const body = {
      locale:           'tr',
      conversationId:   req.idempotencyKey,
      price:            req.amountTry.toFixed(2),
      paidPrice:        req.amountTry.toFixed(2),
      currency:         'TRY',
      basketId:         `plan-${req.planName}-biz-${req.businessId}`,
      paymentGroup:     'SUBSCRIPTION',
      callbackUrl:      req.callbackUrl,
      enabledInstallments: [1],
      buyer: {
        id:             String(req.businessId),
        name:           req.buyerName.split(' ')[0] ?? 'Ad',
        surname:        req.buyerName.split(' ').slice(1).join(' ') || 'Soyad',
        email:          req.buyerEmail,
        identityNumber: '00000000000',   // replace with real TCKN if collected
        registrationAddress: 'Türkiye',
        city:           'Istanbul',
        country:        'Turkey',
        ip:             '85.34.78.112',  // should be real user IP in production
      },
      shippingAddress: {
        contactName:    req.buyerName,
        city:           'Istanbul',
        country:        'Turkey',
        address:        'Türkiye',
      },
      billingAddress: {
        contactName:    req.buyerName,
        city:           'Istanbul',
        country:        'Turkey',
        address:        'Türkiye',
      },
      basketItems: [
        {
          id:        `plan-${req.planName}`,
          name:      `RandevuCep ${req.planName} Plan`,
          category1: 'SaaS Abonelik',
          itemType:  'VIRTUAL',
          price:     req.amountTry.toFixed(2),
        },
      ],
    }

    // ── Actual iyzico API call (uncomment when credentials are ready) ──────
    //
    // const pkiString = generatePkiString({
    //   apiKey: this.apiKey,
    //   conversationId: req.idempotencyKey,
    //   price: body.price,
    //   paidPrice: body.paidPrice,
    // })
    // const response = await fetch(
    //   `${this.baseUrl}/payment/iyzipos/checkoutform/initialize`,
    //   {
    //     method:  'POST',
    //     headers: {
    //       'Content-Type':  'application/json',
    //       'Authorization': this.buildAuthHeader(pkiString),
    //       'x-iyzi-rnd':    generateRandomString(),
    //       'x-iyzi-client-version': 'iyzipay-node-2.0.50',
    //     },
    //     body: JSON.stringify(body),
    //   }
    // )
    // const data = await response.json()
    // if (data.status !== 'success') {
    //   throw new Error(`iyzico error: ${data.errorMessage ?? 'Unknown'}`)
    // }
    // return {
    //   provider:            'iyzico',
    //   conversationId:      req.idempotencyKey,
    //   checkoutFormContent: data.checkoutFormContent,
    // }

    // ── Placeholder response (remove when going live) ────────────────────
    throw new Error(
      'iyzico checkout is not yet live. ' +
      'Configure IYZICO_API_KEY / IYZICO_SECRET_KEY and uncomment the API call.'
    )
    // eslint-disable-next-line no-unreachable
    return { provider: 'iyzico', conversationId: req.idempotencyKey }
  }

  /**
   * Verify an incoming iyzico checkout callback.
   *
   * iyzico POSTs a `token` to the callbackUrl. We must call
   * /payment/iyzipos/checkoutform/auth/ecommerce/detail with that token
   * to get the final payment result and verify it server-side.
   */
  async verifyCallback(
    payload:  Record<string, unknown>,
    _headers: Record<string, string>,
  ): Promise<PaymentResult> {
    if (!this.apiKey || !this.secretKey) {
      throw new Error('iyzico credentials are not configured.')
    }

    const token = payload['token']
    if (typeof token !== 'string' || !token) {
      throw new Error('iyzico callback: missing token in payload.')
    }

    const conversationId = payload['conversationId']
    if (typeof conversationId !== 'string') {
      throw new Error('iyzico callback: missing conversationId in payload.')
    }

    // ── Actual verification call (uncomment when credentials are ready) ───
    //
    // const body = { locale: 'tr', conversationId, token }
    // const pkiString = generatePkiString({ apiKey: this.apiKey, conversationId, token })
    // const response = await fetch(
    //   `${this.baseUrl}/payment/iyzipos/checkoutform/auth/ecommerce/detail`,
    //   {
    //     method:  'POST',
    //     headers: {
    //       'Content-Type':  'application/json',
    //       'Authorization': this.buildAuthHeader(pkiString),
    //       'x-iyzi-rnd':    generateRandomString(),
    //     },
    //     body: JSON.stringify(body),
    //   }
    // )
    // const data = await response.json()
    // return {
    //   provider:       'iyzico',
    //   paymentId:      String(data.paymentId ?? ''),
    //   conversationId: data.conversationId ?? conversationId,
    //   status:         data.status === 'success' ? 'success' : 'failure',
    //   paidAmount:     parseFloat(data.paidPrice ?? '0'),
    //   currency:       'TRY',
    //   rawPayload:     data,
    //   errorMessage:   data.errorMessage,
    // }

    // ── Placeholder ──────────────────────────────────────────────────────
    throw new Error(
      'iyzico callback verification is not yet live. ' +
      'Uncomment the API call and configure credentials.'
    )
  }
}

/** Validate that required iyzico env vars are present. Logs a warning if not. */
export function validateIyzicoConfig(): boolean {
  const missing = ['IYZICO_API_KEY', 'IYZICO_SECRET_KEY', 'IYZICO_BASE_URL'].filter(
    (k) => !process.env[k]
  )
  if (missing.length > 0) {
    console.warn(`[iyzico] Missing env vars: ${missing.join(', ')}`)
    return false
  }
  return true
}
