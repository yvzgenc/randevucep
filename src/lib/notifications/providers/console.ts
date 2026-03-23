// ─── Console (dev) email provider ────────────────────────────────────────────
// Logs email content to the terminal instead of sending real emails.
// Used when NOTIFICATION_PROVIDER=console (or as fallback when no API key set).

import type { EmailProvider, EmailMessage, NotificationResult } from '../types'

export class ConsoleProvider implements EmailProvider {
  readonly name = 'console'

  async send(message: EmailMessage): Promise<NotificationResult> {
    console.log(
      '\n📧 [notifications/console] Email (not sent — dev mode)\n' +
      `  To:      ${message.to}\n` +
      `  Subject: ${message.subject}\n` +
      `  Body:    ${message.text.slice(0, 120).replace(/\n/g, ' ')}…\n`
    )
    return { success: true, messageId: `console-${Date.now()}` }
  }
}
