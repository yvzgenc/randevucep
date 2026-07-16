// ─── Upcoming reminder cron job ───────────────────────────────────────────────
// Runs every 2 hours. For each appointment without reminder_sent_at, checks
// whether (appointment_datetime - now) ≈ business's reminder_hours_before (±1h).
// Idempotency: reminder_sent_at claimed atomically — safe to run concurrently.

import { NextRequest, NextResponse }        from 'next/server'
import { createServiceClient }              from '@/lib/supabase/service'
import { notifyUpcomingReminderMulti }      from '@/lib/notifications'

interface BusinessInfo {
  name:  string
  slug:  string
  phone: string | null
}

interface ReminderRow {
  id:               number
  business_id:      number | null
  customer_name:    string
  customer_email:   string | null
  customer_phone:   string
  cancel_token:     string
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
  reminder_hours_before:          number
}

const WINDOW_HOURS = 1  // ±1h tolerance around the target send time

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
  const now = new Date()

  // Fetch appointments in [today, 3 days out] that haven't been reminded yet
  const todayStr   = now.toISOString().split('T')[0]
  const maxDate    = new Date(now.getTime() + 3 * 24 * 3600 * 1000)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  const { data: rawRows, error: fetchErr } = await supabase
    .from('appointments')
    .select(`
      id,
      business_id,
      customer_name,
      customer_email,
      customer_phone,
      cancel_token,
      service_name,
      staff_name,
      appointment_date,
      appointment_time,
      businesses ( name, slug, phone )
    `)
    .gte('appointment_date', todayStr)
    .lte('appointment_date', maxDateStr)
    .is('reminder_sent_at', null)
    .not('customer_email', 'is', null)
    .not('status', 'in', '("İptal","Tamamlandı","Gelmedi")')

  if (fetchErr) {
    console.error('[reminders] Fetch failed:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const appointments = (rawRows ?? []) as unknown as ReminderRow[]
  const results = { sent: 0, skipped: 0, failed: 0 }

  const settingsCache = new Map<number, BizSettings>()

  async function getSettings(bizId: number): Promise<BizSettings> {
    if (settingsCache.has(bizId)) return settingsCache.get(bizId)!
    const q = await supabase
      .from('business_settings')
      .select('sms_notifications_enabled, whatsapp_notifications_enabled, sms_reminder_enabled, reminder_hours_before')
      .eq('business_id', bizId)
      .maybeSingle()
    const row: BizSettings = {
      sms_notifications_enabled:      q.data?.sms_notifications_enabled      ?? false,
      whatsapp_notifications_enabled: q.data?.whatsapp_notifications_enabled ?? false,
      sms_reminder_enabled:           q.data?.sms_reminder_enabled           ?? false,
      reminder_hours_before:          q.data?.reminder_hours_before ?? 24,
    }
    settingsCache.set(bizId, row)
    return row
  }

  for (const appt of appointments) {
    const email = appt.customer_email?.trim() ?? ''
    if (!email || !email.includes('@')) { results.skipped++; continue }

    const biz = getBiz(appt.businesses)
    if (!biz) { results.skipped++; continue }

    const bizId    = appt.business_id
    const settings = bizId != null ? await getSettings(bizId) : null

    // ── Check timing window ───────────────────────────────────────────────────
    const reminderHours = settings?.reminder_hours_before ?? 24
    const apptDatetime  = new Date(`${appt.appointment_date}T${appt.appointment_time}:00`)
    const diffHours     = (apptDatetime.getTime() - now.getTime()) / 3_600_000

    if (Math.abs(diffHours - reminderHours) > WINDOW_HOURS) continue

    // ── Atomic claim ──────────────────────────────────────────────────────────
    const { data: claimed, error: claimErr } = await supabase
      .from('appointments')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', appt.id)
      .is('reminder_sent_at', null)
      .select('id')

    if (claimErr || !claimed || claimed.length === 0) {
      results.skipped++
      continue
    }

    // ── Build SMS config ──────────────────────────────────────────────────────
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

    const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const manageUrl = appt.cancel_token ? `${baseUrl}/manage/${appt.cancel_token}` : undefined

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
        manageUrl,
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
    `[reminders] Complete now=${now.toISOString()}`,
    `sent=${results.sent} skipped=${results.skipped} failed=${results.failed}`
  )

  return NextResponse.json({ ok: true, ...results })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req)
}
