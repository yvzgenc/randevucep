// ─── Upcoming reminder cron job ───────────────────────────────────────────────
// Finds appointments scheduled for tomorrow that have a customer_email and
// have NOT already received a reminder (reminder_sent_at IS NULL).
//
// Idempotency: reminder_sent_at is claimed atomically with a conditional UPDATE.
// If the UPDATE touches 0 rows, another instance already claimed it — skip.
//
// Trigger: POST /api/cron/reminders
//   Vercel Cron: configured in vercel.json ("0 7 * * *" = 07:00 UTC daily)
//   External:    any HTTP scheduler with Authorization: Bearer $CRON_SECRET

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import type { Database }             from '@/types/database'
import { notifyUpcomingReminder }    from '@/lib/notifications'

// ─── Types ────────────────────────────────────────────────────────────────────

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
  businesses:       BusinessInfo | BusinessInfo[] | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

/** Normalise the businesses join — Supabase may return object or array. */
function getBiz(raw: BusinessInfo | BusinessInfo[] | null): BusinessInfo | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Fetch eligible appointments
  const { data: rawRows, error: fetchErr } = await supabase
    .from('appointments')
    .select(`
      id,
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

  const appointments = (rawRows ?? []) as unknown as ReminderRow[]
  const results = { sent: 0, skipped: 0, failed: 0 }

  for (const appt of appointments) {
    const email = appt.customer_email?.trim() ?? ''
    if (!email || !email.includes('@')) {
      results.skipped++
      continue
    }

    const biz = getBiz(appt.businesses)
    if (!biz) {
      results.skipped++
      continue
    }

    // ── Atomic claim ─────────────────────────────────────────────────────────
    // .select('id') on the update builder returns the affected rows.
    // 0 rows → another instance already claimed → skip (no { count, head } needed).
    const now = new Date().toISOString()
    const { data: claimed, error: claimErr } = await supabase
      .from('appointments')
      .update({ reminder_sent_at: now })
      .eq('id', appt.id)
      .is('reminder_sent_at', null)   // guard: only update unclaimed rows
      .select('id')

    if (claimErr) {
      console.error('[reminders] Claim error for appointment', appt.id, ':', claimErr.message)
      results.skipped++
      continue
    }

    if (!claimed || claimed.length === 0) {
      // Already claimed by a concurrent cron run
      results.skipped++
      continue
    }

    // ── Send reminder ─────────────────────────────────────────────────────────
    const appointmentDate = new Date(appt.appointment_date + 'T00:00:00').toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const result = await notifyUpcomingReminder({
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
    })

    if (result.success) {
      results.sent++
    } else {
      // Roll back claim so the next run can retry
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
