// ─── Notification system types ────────────────────────────────────────────────
// Provider-agnostic. Add new event types here; templates and providers adapt.

// ── Event types ───────────────────────────────────────────────────────────────

export type NotificationEvent =
  | 'booking_created_customer'   // sent to the customer after booking
  | 'booking_created_business'   // sent to the business owner after booking
  | 'booking_confirmed'          // sent to customer when owner confirms
  | 'booking_canceled'           // sent to customer when appointment is canceled
  | 'upcoming_reminder'          // sent to customer ~24h before appointment

// ── Channels ──────────────────────────────────────────────────────────────────

export type NotificationChannel = 'email' | 'sms' | 'whatsapp'

// ── Payload passed to sendNotification() ─────────────────────────────────────

export interface NotificationPayload {
  event:   NotificationEvent
  channel: NotificationChannel

  // Recipient
  to:      string          // email address or phone number
  toName?: string

  // Context data used by templates
  data: NotificationData
}

// ── Template context data ─────────────────────────────────────────────────────

export interface NotificationData {
  // Business
  businessName:    string
  businessPhone?:  string
  businessSlug?:   string

  // Customer
  customerName:    string
  customerPhone?:  string

  // Appointment
  serviceName:     string
  staffName:       string
  appointmentDate: string   // formatted: "15 Ocak 2026"
  appointmentTime: string   // "14:30"
  appointmentId?:  number

  // Booking URL for customer self-service (future)
  bookingUrl?:     string
}

// ── Provider interface ────────────────────────────────────────────────────────

export interface EmailMessage {
  to:       string
  toName?:  string
  subject:  string
  html:     string
  text:     string
}

export interface NotificationResult {
  success:   boolean
  messageId?: string
  error?:    string
}

/** Every email provider must implement this interface. */
export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<NotificationResult>
}

// ── SMS / WhatsApp skeleton ───────────────────────────────────────────────────
// Not yet implemented — placeholder for future providers.

export interface SmsMessage {
  to:   string
  body: string
}

export interface SmsProvider {
  readonly name: string
  send(message: SmsMessage): Promise<NotificationResult>
}
