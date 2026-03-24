// ─── Upcoming reminder cron job ───────────────────────────────────────────────
// Finds appointments scheduled for tomorrow, sends reminder via email
// AND optionally SMS/WhatsApp if business_settings enables it.
//
// Idempotency: reminder_sent_at claimed atomically — safe to run concurrently.

import { NextRequest, NextResponse }        from 'next/server'
import { createClient }                     from '@supabase/supabase-js'
import type { Database }                    from '@/types/database'
import { notifyUpcomingReminderMulti }      from '@/lib/notifications'

interface BusinessInfo {
  name:  string
  slug:  string
  phone: string | null
}

interface ReminderRow {
  id:               number
  customer_name:    string
  customer_email:   string | null
  customer_phone:   string
  service_name:     string
  staff_name:       string
  appointment_date: string
  appointment_time: string
  businesses: BusinessInfo | BusinessInfo[] | null
}

interface BizSettings {
  sms_notifications_enabled:      boolean
  whatsapp_notifications_enabled: boolean
  sms_reminder_enabled:           boolean
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service client not configured')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

function verifySecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== 'production') return true
    console.error('[reminders] CRON_SECRET is not set in production!')
    return false
  }
  return req.headers.get('authorization') === `Bearer ${secret}`
}

function getBiz(raw: BusinessInfo | BusinessInfo[] | null): BusinessInfo | null {
  if (!raw) return null
  return Array.isArray(raw) ? (raw[0] ?? null) : raw
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Fetch eligible appointments (include business_id for settings lookup)
  const { data: rawRows, error: fetchErr } = await supabase
    .from('appointments')
    .select(`
      id,
      business_id,
      customer_name,
      customer_email,
      customer_phone,
      service_name,
      staff_name,
      appointment_date,
      appointment_time,
      businesses ( name, slug, phone )
    `)
    .eq('appointment_date', tomorrowStr)
    .is('reminder_sent_at', null)
    .not('customer_email', 'is', null)
    .not('status', 'in', '("İptal","Tamamlandı","Gelmedi")')

  if (fetchErr) {
    console.error('[reminders] Fetch failed:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const appointments = (rawRows ?? []) as unknown as (ReminderRow & { business_id: number | null })[]
  const results = { sent: 0, skipped: 0, failed: 0 }

  // Cache business settings per business_id to avoid repeated queries
  const settingsCache = new Map<number, BizSettings>()

  async function getSettings(bizId: number): Promise<BizSettings> {
    if (settingsCache.has(bizId)) return settingsCache.get(bizId)!
    const q = await supabase
      .from('business_settings')
      .select('sms_notifications_enabled, whatsapp_notifications_enabled, sms_reminder_enabled')
      .eq('business_id', bizId)
      .maybeSingle()
    const row: BizSettings = {
      sms_notifications_enabled:      q.data?.sms_notifications_enabled      ?? false,
      whatsapp_notifications_enabled: q.data?.whatsapp_notifications_enabled ?? false,
      sms_reminder_enabled:           q.data?.sms_reminder_enabled           ?? false,
    }
    settingsCache.set(bizId, row)
    return row
  }

  for (const appt of appointments) {
    const email = appt.customer_email?.trim() ?? ''
    if (!email || !email.includes('@')) { results.skipped++; continue }

    const biz = getBiz(appt.businesses)
    if (!biz) { results.skipped++; continue }

    // ── Atomic claim ──────────────────────────────────────────────────────────
    const now = new Date().toISOString()
    const { data: claimed, error: claimErr } = await supabase
      .from('appointments')
      .update({ reminder_sent_at: now })
      .eq('id', appt.id)
      .is('reminder_sent_at', null)
      .select('id')

    if (claimErr || !claimed || claimed.length === 0) {
      results.skipped++
      continue
    }

    // ── Fetch SMS settings ────────────────────────────────────────────────────
    const bizId    = appt.business_id
    const settings = bizId != null ? await getSettings(bizId) : null

    const smsConfig = settings?.sms_reminder_enabled
      ? {
          smsEnabled:      settings.sms_notifications_enabled,
          whatsappEnabled: settings.whatsapp_notifications_enabled,
          customerPhone:   appt.customer_phone,
        }
      : undefined

    // ── Send reminder ─────────────────────────────────────────────────────────
    const appointmentDate = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const result = await notifyUpcomingReminderMulti({
      customerEmail: email,
      customerName:  appt.customer_name,
      data: {
        businessName:    biz.name,
        businessPhone:   biz.phone ?? undefined,
        businessSlug:    biz.slug,
        customerName:    appt.customer_name,
        customerPhone:   appt.customer_phone,
        serviceName:     appt.service_name,
        staffName:       appt.staff_name,
        appointmentDate,
        appointmentTime: appt.appointment_time,
        appointmentId:   appt.id,
      },
      sms: smsConfig,
    })

    if (result.success) {
      results.sent++
    } else {
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: null })
        .eq('id', appt.id)
      results.failed++
    }
  }

  console.info(
    `[reminders] Complete date=${tomorrowStr}`,
    `sent=${results.sent} skipped=${results.skipped} failed=${results.failed}`
  )

  return NextResponse.json({ ok: true, date: tomorrowStr, ...results })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req)
}
