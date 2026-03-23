// ─── Provider-agnostic payment types ─────────────────────────────────────────
// All payment providers must implement the PaymentProvider interface.
// This keeps checkout and webhook logic independent of the provider.

/** The identifier of a supported payment provider. */
export type ProviderName = 'iyzico'

/** What the frontend needs to redirect/open the checkout. */
export interface CheckoutSession {
  /** Unique conversation / session id from the provider. */
  conversationId: string
  /**
   * For iyzico: the HTML form content to POST-redirect.
   * For Stripe/Paddle: the checkout URL.
   */
  checkoutFormContent?: string
  checkoutUrl?:         string
  /** Provider name, for recording in the payments table. */
  provider: ProviderName
}

/** Normalised result after verifying a provider callback. */
export interface PaymentResult {
  provider:        ProviderName
  paymentId:       string
  conversationId:  string
  /** 'success' | 'failure' | 'pending' */
  status:          'success' | 'failure' | 'pending'
  /** Amount actually charged (may differ from requested if partial). */
  paidAmount?:     number
  currency?:       string
  /** Full raw payload for audit storage. */
  rawPayload:      Record<string, unknown>
  errorMessage?:   string
}

/** Input required to start a checkout session. */
export interface CheckoutRequest {
  businessId:      number
  planName:        string
  amountTry:       number
  /** Idempotency key — becomes the conversationId sent to provider. */
  idempotencyKey:  string
  buyerEmail:      string
  buyerName:       string
  buyerIp?:        string
  callbackUrl:     string
}

/** Every payment provider must satisfy this interface. */
export interface PaymentProvider {
  readonly name: ProviderName

  /**
   * Initiate a checkout session.
   * Returns form HTML (iyzico) or a redirect URL (Stripe, Paddle).
   */
  createCheckoutSession(req: CheckoutRequest): Promise<CheckoutSession>

  /**
   * Verify and parse an incoming webhook / callback payload.
   * Must throw if the signature is invalid.
   */
  verifyCallback(
    payload: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<PaymentResult>
}
