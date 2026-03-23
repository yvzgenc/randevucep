// ─── Resend email provider ────────────────────────────────────────────────────
// Docs: https://resend.com/docs
//
// Environment variables:
//   RESEND_API_KEY   — API key from resend.com dashboard
//   EMAIL_FROM       — verified sender address (e.g. noreply@randevucep.com)
//
// This uses the Resend REST API directly (no SDK dependency).
// Add `resend` package for SDK usage: npm install resend

import type { EmailProvider, EmailMessage, NotificationResult } from '../types'

export class ResendProvider implements EmailProvider {
  readonly name = 'resend'

  private readonly apiKey: string
  private readonly from:   string

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY ?? ''
    this.from   = process.env.EMAIL_FROM     ?? 'noreply@randevucep.com'

    if (!this.apiKey) {
      console.warn('[notifications/resend] RESEND_API_KEY is not set.')
    }
  }

  async send(message: EmailMessage): Promise<NotificationResult> {
    if (!this.apiKey) {
      return { success: false, error: 'RESEND_API_KEY is not configured.' }
    }

    const to = message.toName
      ? `${message.toName} <${message.to}>`
      : message.to

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          from:    this.from,
          to:      [to],
          subject: message.subject,
          html:    message.html,
          text:    message.text,
        }),
      })

      const data = await response.json() as { id?: string; message?: string; name?: string }

      if (!response.ok) {
        const err = data.message ?? data.name ?? `HTTP ${response.status}`
        console.error('[notifications/resend] Send failed:', err)
        return { success: false, error: err }
      }

      return { success: true, messageId: data.id }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[notifications/resend] Fetch error:', msg)
      return { success: false, error: msg }
    }
  }
}
