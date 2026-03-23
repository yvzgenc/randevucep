// ─── Upcoming reminder cron job ───────────────────────────────────────────────
// Finds appointments scheduled for tomorrow that:
//   1. Have a customer email
//   2. Have NOT already had a reminder sent (reminder_sent_at IS NULL)
//   3. Are not canceled or completed
//
// Idempotency: reminder_sent_at is set atomically using a WHERE clause that
// checks it is still NULL — safe to run multiple times or concurrently.
//
// Trigger: call POST /api/cron/reminders
//   - Vercel Cron: set cron schedule in vercel.json (e.g. "0 9 * * *" = 09:00 UTC daily)
//   - External: any HTTP scheduler (cron-job.org, GitHub Actions, etc.)
//
// Security: guarded by CRON_SECRET env var (Bearer token).
// Set the same secret in your scheduler's Authorization header.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import type { Database }             from '@/types/database'
import { notifyUpcomingReminder }    from '@/lib/notifications'

interface ReminderRow {
  id:               number
  customer_name:    string
  customer_email:   string
  customer_phone:   string
  service_name:     string
  staff_name:       string
  appointment_date: string
  appointment_time: string
  businesses: {
    name:  string
    slug:  string
    phone: string | null
  } | null
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
    // No secret configured — allow only in development
    if (process.env.NODE_ENV !== 'production') return true
    console.error('[reminders] CRON_SECRET is not set in production!')
    return false
  }
  const auth = req.headers.get('authorization') ?? ''
  return auth === `Bearer ${secret}`
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Tomorrow's date in YYYY-MM-DD (UTC — adjust timezone offset if needed)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  // Fetch eligible appointments — reminder not yet sent, have email, not terminal status
  const { data: rows, error: fetchErr } = await supabase
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
    console.error('[reminders] Failed to fetch appointments:', fetchErr.message)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  const appointments = (rows ?? []) as unknown as ReminderRow[]
  const results = { sent: 0, skipped: 0, failed: 0 }

  for (const appt of appointments) {
    const email = appt.customer_email?.trim()
    if (!email || !email.includes('@')) {
      results.skipped++
      continue
    }

    const biz = appt.businesses
    if (!biz) {
      results.skipped++
      continue
    }

    // Atomically claim this row — only succeeds if reminder_sent_at is still NULL
    // Guards against concurrent runs sending duplicate reminders
    const { data: claimedRows, error: claimErr } = await supabase
  .from('appointments')
  .update({ reminder_sent_at: new Date().toISOString() })
  .eq('id', appt.id)
  .is('reminder_sent_at', null)
  .select('id')

if (claimErr) {
  results.failed++
  continue
}

if (!claimedRows || claimedRows.length === 0) {
  results.skipped++
  continue
}

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
      // Roll back the claim so it can be retried
      await supabase
        .from('appointments')
        .update({ reminder_sent_at: null })
        .eq('id', appt.id)
      results.failed++
    }
  }

  console.info(
    `[reminders] Run complete date=${tomorrowStr}`,
    `sent=${results.sent} skipped=${results.skipped} failed=${results.failed}`
  )

  return NextResponse.json({ ok: true, date: tomorrowStr, ...results })
}

// Allow GET for easy manual testing (still requires secret)
export async function GET(req: NextRequest): Promise<NextResponse> {
  return POST(req)
}
