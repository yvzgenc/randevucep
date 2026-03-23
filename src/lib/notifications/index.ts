// ─── Notification system entry point ─────────────────────────────────────────
// Selects the active provider and dispatches notifications.
// Failed sends are LOGGED and return { success: false } — never throw.

import { ResendProvider }  from './providers/resend'
import { ConsoleProvider } from './providers/console'
import { renderTemplate }  from './templates'
import type {
  NotificationPayload,
  NotificationResult,
  NotificationData,
  EmailProvider,
} from './types'

export * from './types'

// ── Provider registry ─────────────────────────────────────────────────────────

let _emailProvider: EmailProvider | null = null

function getEmailProvider(): EmailProvider {
  if (_emailProvider) return _emailProvider
  const name = process.env.NOTIFICATION_PROVIDER ?? 'resend'
  switch (name) {
    case 'resend':
      _emailProvider = new ResendProvider()
      break
    case 'console':
      _emailProvider = new ConsoleProvider()
      break
    default:
      console.warn(`[notifications] Unknown provider "${name}", falling back to console.`)
      _emailProvider = new ConsoleProvider()
  }
  return _emailProvider
}

// ── Structured logger ─────────────────────────────────────────────────────────

function logResult(
  event:    string,
  to:       string,
  result:   NotificationResult,
  provider: string,
): void {
  const ts = new Date().toISOString()
  if (result.success) {
    console.info(
      `[notifications] ${ts} OK event=${event} provider=${provider}` +
      ` to=${to} messageId=${result.messageId ?? 'n/a'}`
    )
  } else {
    console.error(
      `[notifications] ${ts} FAIL event=${event} provider=${provider}` +
      ` to=${to} error=${result.error ?? 'unknown'}`
    )
  }
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

/**
 * Send a notification. Never throws.
 * All outcomes — success and failure — are logged with structured fields.
 */
export async function sendNotification(
  payload: NotificationPayload,
): Promise<NotificationResult> {
  if (payload.channel !== 'email') {
    console.info(
      `[notifications] channel="${payload.channel}" not implemented. event=${payload.event} skipped.`
    )
    return { success: true }
  }

  let rendered
  try {
    rendered = renderTemplate(payload.event, payload.data)
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Template render error'
    console.error(`[notifications] Template error event=${payload.event}:`, error)
    return { success: false, error }
  }

  const provider = getEmailProvider()

  try {
    const result = await provider.send({
      to:      payload.to,
      toName:  payload.toName,
      subject: rendered.subject,
      html:    rendered.html,
      text:    rendered.text,
    })

    logResult(payload.event, payload.to, result, provider.name)
    return result
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Provider threw unexpectedly'
    console.error(`[notifications] Uncaught error from provider=${provider.name}:`, error)
    return { success: false, error }
  }
}

// ── Convenience helpers ───────────────────────────────────────────────────────

export async function notifyBookingCreated(opts: {
  customerEmail:  string
  customerName:   string
  businessEmail?: string
  data:           NotificationData
}): Promise<void> {
  // Await both — caller uses void so failures are logged but don't propagate
  await Promise.allSettled([
    sendNotification({
      event:   'booking_created_customer',
      channel: 'email',
      to:      opts.customerEmail,
      toName:  opts.customerName,
      data:    opts.data,
    }),
    opts.businessEmail
      ? sendNotification({
          event:   'booking_created_business',
          channel: 'email',
          to:      opts.businessEmail,
          data:    opts.data,
        })
      : Promise.resolve({ success: true }),
  ])
}

export async function notifyStatusChange(opts: {
  event:         'booking_confirmed' | 'booking_canceled'
  customerEmail: string
  customerName:  string
  data:          NotificationData
}): Promise<void> {
  await sendNotification({
    event:   opts.event,
    channel: 'email',
    to:      opts.customerEmail,
    toName:  opts.customerName,
    data:    opts.data,
  })
}

export async function notifyUpcomingReminder(opts: {
  customerEmail: string
  customerName:  string
  data:          NotificationData
}): Promise<NotificationResult> {
  return sendNotification({
    event:   'upcoming_reminder',
    channel: 'email',
    to:      opts.customerEmail,
    toName:  opts.customerName,
    data:    opts.data,
  })
}
