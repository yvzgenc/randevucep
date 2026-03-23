// ─── iyzico Payment Provider ──────────────────────────────────────────────────
// Full implementation of the PaymentProvider interface for iyzico.
//
// iyzico API docs: https://dev.iyzipay.com/
// SDK reference:   https://github.com/iyzico/iyzipay-node
//
// Environment variables:
//   IYZICO_API_KEY    — from iyzico merchant panel
//   IYZICO_SECRET_KEY — from iyzico merchant panel
//   IYZICO_BASE_URL   — https://sandbox.iyzipay.com (test)
//                        https://api.iyzipay.com      (production)
//
// Checkout flow:
//   1. POST /payment/iyzipos/checkoutform/initialize
//      → returns checkoutFormContent (HTML form to inject)
//   2. Browser submits form → iyzico 3DS flow
//   3. iyzico POSTs to callbackUrl with { token, status, conversationId }
//   4. Server calls POST /payment/iyzipos/checkoutform/auth/ecommerce/detail
//      with token + conversationId to verify server-side
//
// Authorization header format (IYZWS):
//   IYZWS {apiKey}:{base64(HMAC-SHA256(randomKey + PKIstring, secretKey))}
//   where PKIstring = [key1]=[val1]&[key2]=[val2]...

import { createHmac, randomBytes } from 'crypto'
import type {
  PaymentProvider,
  CheckoutSession,
  CheckoutRequest,
  PaymentResult,
  ProviderName,
} from '../types'

// ─── Auth header helpers ──────────────────────────────────────────────────────

function generateRandom(): string {
  return randomBytes(12).toString('hex')
}

/**
 * Builds the PKI string from an ordered object.
 * Format: [key]=[value]&[key]=[value]...
 * Only non-null string values are included.
 */
function buildPkiString(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `[${k}]=[${v}]`)
    .join('&')
}

/**
 * Builds the iyzico IYZWS Authorization header.
 * Algorithm: "IYZWS " + apiKey + ":" + base64(HMAC-SHA256(randomKey + pkiString, secretKey))
 */
function buildAuthHeader(
  apiKey:    string,
  secretKey: string,
  randomKey: string,
  pkiString: string,
): string {
  const data      = randomKey + pkiString
  const signature = createHmac('sha256', secretKey).update(data, 'utf8').digest('base64')
  return `IYZWS ${apiKey}:${signature}`
}

// ─── iyzico response types ────────────────────────────────────────────────────

interface IyzicoInitResponse {
  status:              string
  errorCode?:          string
  errorMessage?:       string
  locale?:             string
  conversationId?:     string
  checkoutFormContent?: string
  token?:              string
  tokenExpireTime?:    number
}

interface IyzicoDetailResponse {
  status:           string
  errorCode?:       string
  errorMessage?:    string
  locale?:          string
  conversationId?:  string
  token?:           string
  paymentId?:       string
  paidPrice?:       string
  price?:           string
  currency?:        string
  installment?:     number
  basketId?:        string
  fraudStatus?:     number
  paymentStatus?:   string
}

// ─── Provider implementation ──────────────────────────────────────────────────

export class IyzicoProvider implements PaymentProvider {
  readonly name: ProviderName = 'iyzico'

  private readonly apiKey:    string
  private readonly secretKey: string
  private readonly baseUrl:   string

  constructor() {
    this.apiKey    = process.env.IYZICO_API_KEY    ?? ''
    this.secretKey = process.env.IYZICO_SECRET_KEY ?? ''
    this.baseUrl   = (process.env.IYZICO_BASE_URL ?? 'https://sandbox.iyzipay.com').replace(/\/$/, '')

    if (!this.apiKey || !this.secretKey) {
      console.warn('[iyzico] IYZICO_API_KEY or IYZICO_SECRET_KEY is not set.')
    }
  }

  private assertConfigured(): void {
    if (!this.apiKey || !this.secretKey) {
      throw new Error(
        'iyzico credentials are not configured. ' +
        'Set IYZICO_API_KEY, IYZICO_SECRET_KEY, and IYZICO_BASE_URL.'
      )
    }
  }

  /**
   * Builds headers for a given endpoint request.
   * randomKey is generated fresh per request for replay protection.
   */
  private buildHeaders(randomKey: string, pkiString: string): Record<string, string> {
    return {
      'Content-Type':         'application/json',
      'Accept':               'application/json',
      'Authorization':        buildAuthHeader(this.apiKey, this.secretKey, randomKey, pkiString),
      'x-iyzi-rnd':           randomKey,
      'x-iyzi-client-version': 'iyzipay-node-2.0.50',
    }
  }

  // ── createCheckoutSession ───────────────────────────────────────────────────

  async createCheckoutSession(req: CheckoutRequest): Promise<CheckoutSession> {
    this.assertConfigured()

    const randomKey = generateRandom()
    const priceStr  = req.amountTry.toFixed(2)

    // PKI string fields for initialize — order matches iyzico node SDK
    const pkiString = buildPkiString({
      locale:         'tr',
      conversationId: req.idempotencyKey,
      price:          priceStr,
      paidPrice:      priceStr,
      currency:       'TRY',
      basketId:       `plan-${req.planName}-biz-${req.businessId}`,
      paymentGroup:   'SUBSCRIPTION',
      callbackUrl:    req.callbackUrl,
    })

    const [firstName, ...rest] = req.buyerName.trim().split(' ')
    const lastName = rest.join(' ') || 'Kullanici'

    const body = {
      locale:              'tr',
      conversationId:      req.idempotencyKey,
      price:               priceStr,
      paidPrice:           priceStr,
      currency:            'TRY',
      basketId:            `plan-${req.planName}-biz-${req.businessId}`,
      paymentGroup:        'SUBSCRIPTION',
      callbackUrl:         req.callbackUrl,
      enabledInstallments: [1, 2, 3, 6, 9, 12],
      buyer: {
        id:                  String(req.businessId),
        name:                firstName ?? 'Ad',
        surname:             lastName,
        email:               req.buyerEmail,
        identityNumber:      '00000000000',
        registrationAddress: 'Türkiye',
        city:                'Istanbul',
        country:             'Turkey',
        ip:                  req.buyerIp ?? '85.34.78.112',
      },
      shippingAddress: {
        contactName: req.buyerName,
        city:        'Istanbul',
        country:     'Turkey',
        address:     'Türkiye',
      },
      billingAddress: {
        contactName: req.buyerName,
        city:        'Istanbul',
        country:     'Turkey',
        address:     'Türkiye',
      },
      basketItems: [
        {
          id:        `plan-${req.planName}`,
          name:      `RandevuCep ${req.planName} Plan`,
          category1: 'SaaS Abonelik',
          itemType:  'VIRTUAL',
          price:     priceStr,
        },
      ],
    }

    const response = await fetch(
      `${this.baseUrl}/payment/iyzipos/checkoutform/initialize`,
      {
        method:  'POST',
        headers: this.buildHeaders(randomKey, pkiString),
        body:    JSON.stringify(body),
      }
    )

    let data: IyzicoInitResponse
    try {
      data = (await response.json()) as IyzicoInitResponse
    } catch {
      throw new Error(`iyzico returned non-JSON response (HTTP ${response.status})`)
    }

    if (data.status !== 'success' || !data.checkoutFormContent) {
      const errMsg = data.errorMessage ?? data.errorCode ?? `HTTP ${response.status}`
      console.error('[iyzico] Checkout initialize failed:', errMsg, '| conversationId:', req.idempotencyKey)
      throw new Error(`iyzico ödeme başlatılamadı: ${errMsg}`)
    }

    console.info('[iyzico] Checkout initialized | conversationId:', req.idempotencyKey)

    return {
      provider:            'iyzico',
      conversationId:      req.idempotencyKey,
      checkoutFormContent: data.checkoutFormContent,
    }
  }

  // ── verifyCallback ──────────────────────────────────────────────────────────

  async verifyCallback(
    payload: Record<string, unknown>,
    _headers: Record<string, string>,
  ): Promise<PaymentResult> {
    this.assertConfigured()

    // iyzico POSTs form-urlencoded with: token, status, conversationId
    const token = typeof payload['token'] === 'string' ? payload['token'] : null
    if (!token) {
      throw new Error('iyzico callback: missing token in payload.')
    }

    const conversationId = typeof payload['conversationId'] === 'string'
      ? payload['conversationId']
      : null
    if (!conversationId) {
      throw new Error('iyzico callback: missing conversationId in payload.')
    }

    // iyzico also includes a top-level status in the callback POST
    // 'failure' here means the user cancelled or card declined before our detail call
    const callbackStatus = typeof payload['status'] === 'string' ? payload['status'] : null
    if (callbackStatus === 'failure') {
      console.info('[iyzico] Callback reported failure before detail call | conversationId:', conversationId)
      return {
        provider:       'iyzico',
        paymentId:      '',
        conversationId,
        status:         'failure',
        rawPayload:     payload,
        errorMessage:   'Ödeme kullanıcı tarafından iptal edildi veya kart reddedildi.',
      }
    }

    // Server-side verification: fetch full payment detail
    const randomKey = generateRandom()
    const pkiString = buildPkiString({
      locale:         'tr',
      conversationId,
      token,
    })

    const response = await fetch(
      `${this.baseUrl}/payment/iyzipos/checkoutform/auth/ecommerce/detail`,
      {
        method:  'POST',
        headers: this.buildHeaders(randomKey, pkiString),
        body:    JSON.stringify({ locale: 'tr', conversationId, token }),
      }
    )

    let data: IyzicoDetailResponse
    try {
      data = (await response.json()) as IyzicoDetailResponse
    } catch {
      throw new Error(`iyzico detail returned non-JSON response (HTTP ${response.status})`)
    }

    const rawPayload = { ...payload, detail: data } as Record<string, unknown>

    if (data.status !== 'success') {
      const errMsg = data.errorMessage ?? data.errorCode ?? 'payment_failed'
      console.info('[iyzico] Payment verification failed:', errMsg, '| conversationId:', conversationId)
      return {
        provider:       'iyzico',
        paymentId:      data.paymentId ?? '',
        conversationId: data.conversationId ?? conversationId,
        status:         'failure',
        rawPayload,
        errorMessage:   errMsg,
      }
    }

    // fraudStatus: 1 = not fraudulent, -1 = blocked by fraud
    if (data.fraudStatus === -1) {
      console.warn('[iyzico] Payment blocked by fraud filter | paymentId:', data.paymentId)
      return {
        provider:       'iyzico',
        paymentId:      data.paymentId ?? '',
        conversationId: data.conversationId ?? conversationId,
        status:         'failure',
        rawPayload,
        errorMessage:   'Ödeme fraud filtresi tarafından engellendi.',
      }
    }

    const paidAmount = data.paidPrice ? parseFloat(data.paidPrice) : undefined

    console.info(
      '[iyzico] Payment verified successfully | paymentId:', data.paymentId,
      '| paidPrice:', data.paidPrice,
      '| conversationId:', conversationId
    )

    return {
      provider:       'iyzico',
      paymentId:      data.paymentId ?? '',
      conversationId: data.conversationId ?? conversationId,
      status:         'success',
      paidAmount,
      currency:       data.currency ?? 'TRY',
      rawPayload,
    }
  }
}

/** Returns true if required iyzico env vars are present. */
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
