// ─── Twilio SMS + WhatsApp provider ──────────────────────────────────────────
// Implements SmsProvider for both regular SMS and WhatsApp (via Twilio).
//
// Environment variables required:
//   TWILIO_ACCOUNT_SID   — from console.twilio.com
//   TWILIO_AUTH_TOKEN    — from console.twilio.com
//   TWILIO_FROM_PHONE    — your Twilio phone number (e.g. +905xxxxxxxxx)
//   TWILIO_WHATSAPP_FROM — WhatsApp-enabled number (e.g. whatsapp:+14155238886)
//                          For sandbox: whatsapp:+14155238886
//                          For production: your approved WhatsApp Business number
//
// Twilio API docs: https://www.twilio.com/docs/sms/api
// WhatsApp docs:  https://www.twilio.com/docs/whatsapp/api

import type { SmsMessage, NotificationResult, SmsProvider } from '../types'

export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio-sms'

  private readonly accountSid: string
  private readonly authToken:  string
  private readonly fromPhone:  string

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID  ?? ''
    this.authToken  = process.env.TWILIO_AUTH_TOKEN   ?? ''
    this.fromPhone  = process.env.TWILIO_FROM_PHONE   ?? ''

    if (!this.accountSid || !this.authToken || !this.fromPhone) {
      console.warn('[twilio-sms] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM_PHONE')
    }
  }

  async send(message: SmsMessage): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken || !this.fromPhone) {
      return { success: false, error: 'Twilio SMS credentials not configured.' }
    }

    return sendTwilioMessage({
      accountSid: this.accountSid,
      authToken:  this.authToken,
      from:       this.fromPhone,
      to:         message.to,
      body:       message.body,
    })
  }
}

export class TwilioWhatsAppProvider implements SmsProvider {
  readonly name = 'twilio-whatsapp'

  private readonly accountSid: string
  private readonly authToken:  string
  private readonly fromNumber: string   // e.g. whatsapp:+14155238886

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID    ?? ''
    this.authToken  = process.env.TWILIO_AUTH_TOKEN     ?? ''
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM  ?? ''

    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      console.warn('[twilio-whatsapp] Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_WHATSAPP_FROM')
    }
  }

  async send(message: SmsMessage): Promise<NotificationResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      return { success: false, error: 'Twilio WhatsApp credentials not configured.' }
    }

    // Twilio WhatsApp: prefix both To and From with "whatsapp:"
    const toWhatsApp = message.to.startsWith('whatsapp:')
      ? message.to
      : `whatsapp:${normalisePhone(message.to)}`

    return sendTwilioMessage({
      accountSid: this.accountSid,
      authToken:  this.authToken,
      from:       this.fromNumber,
      to:         toWhatsApp,
      body:       message.body,
    })
  }
}

// ─── Core Twilio API call ─────────────────────────────────────────────────────

interface TwilioRequest {
  accountSid: string
  authToken:  string
  from:       string
  to:         string
  body:       string
}

interface TwilioApiResponse {
  sid?:          string
  status?:       string
  error_code?:   number | null
  error_message?: string | null
  message?:      string  // API-level error message
  code?:         number  // API-level error code
}

async function sendTwilioMessage(req: TwilioRequest): Promise<NotificationResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${req.accountSid}/Messages.json`

  const body = new URLSearchParams({
    From: req.from,
    To:   req.to,
    Body: req.body,
  })

  const credentials = Buffer.from(`${req.accountSid}:${req.authToken}`).toString('base64')

  let response: Response
  try {
    response = await fetch(url, {
      method:  'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Network error'
    console.error('[twilio] Fetch error:', error)
    return { success: false, error }
  }

  let data: TwilioApiResponse
  try {
    data = (await response.json()) as TwilioApiResponse
  } catch {
    return { success: false, error: `Twilio returned non-JSON (HTTP ${response.status})` }
  }

  if (!response.ok || data.error_code || data.code) {
    const errMsg = data.error_message ?? data.message ?? `HTTP ${response.status}`
    console.error('[twilio] API error:', errMsg, '| to:', req.to)
    return { success: false, error: errMsg }
  }

  return { success: true, messageId: data.sid }
}

// ─── Phone normalisation ──────────────────────────────────────────────────────

/**
 * Normalise a Turkish phone number to E.164 format (+90XXXXXXXXXX).
 * Handles: 05xx, 5xx, +905xx, 905xx formats.
 * Non-Turkish numbers are passed through unchanged.
 */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  // Already E.164 with country code
  if (raw.startsWith('+')) return raw

  // Turkish mobile: starts with 0 (e.g. 0532...)
  if (digits.length === 11 && digits.startsWith('0')) {
    return '+9' + digits   // +90 + 10 digits
  }

  // Turkish without leading 0 (e.g. 5321234567)
  if (digits.length === 10 && digits.startsWith('5')) {
    return '+90' + digits
  }

  // Already has 90 prefix (e.g. 905321234567)
  if (digits.length === 12 && digits.startsWith('90')) {
    return '+' + digits
  }

  // Unknown format — return as-is; Twilio will reject if invalid
  return raw
}
