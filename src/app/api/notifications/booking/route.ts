// ─── Booking notification endpoint ───────────────────────────────────────────
// Called from BookingFlow after a successful booking.
// Persists customer_email on the appointment row (for future use in reminders
// and status change notifications), then sends confirmation emails.
//
// Security: validates the appointment exists and belongs to the given business.
// All failures are logged; the route always returns 200 to avoid breaking UX.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import type { Database }             from '@/types/database'
import { notifyBookingCreated }      from '@/lib/notifications'

interface BookingNotifyBody {
  appointmentId: number
  businessId:    number
  customerEmail: string
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service client not configured')
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: BookingNotifyBody

  try {
    body = (await req.json()) as BookingNotifyBody
  } catch {
    console.warn('[notify/booking] Invalid JSON body')
    return NextResponse.json({ ok: false, reason: 'invalid_body' }, { status: 200 })
  }

  const { appointmentId, businessId, customerEmail } = body

  if (!appointmentId || !businessId) {
    console.warn('[notify/booking] Missing appointmentId or businessId')
    return NextResponse.json({ ok: false, reason: 'missing_ids' }, { status: 200 })
  }

  const trimEmail = customerEmail?.trim() ?? ''

  if (!trimEmail || !trimEmail.includes('@')) {
    // No email — persist nothing, skip notification
    return NextResponse.json({ ok: true, skipped: 'no_email' })
  }

  try {
    const supabase = createServiceClient()

    // Fetch appointment + business in parallel
    const [{ data: appt, error: apptErr }, { data: biz, error: bizErr }] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .eq('business_id', businessId)
        .single(),
      supabase
        .from('businesses')
        .select('id, name, slug, phone, email')
        .eq('id', businessId)
        .single(),
    ])

    if (apptErr || !appt) {
      console.error('[notify/booking] Appointment not found', { appointmentId, businessId, error: apptErr?.message })
      return NextResponse.json({ ok: false, reason: 'appointment_not_found' })
    }
    if (bizErr || !biz) {
      console.error('[notify/booking] Business not found', { businessId, error: bizErr?.message })
      return NextResponse.json({ ok: false, reason: 'business_not_found' })
    }

    // Persist customer_email on the appointment for reminders + status notifications
    const { error: saveErr } = await supabase
      .from('appointments')
      .update({ customer_email: trimEmail })
      .eq('id', appointmentId)

    if (saveErr) {
      // Non-fatal — log and continue
      console.warn('[notify/booking] Failed to persist customer_email:', saveErr.message)
    }

    const appointmentDate = new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const manageUrl = appt.cancel_token ? `${baseUrl}/manage/${appt.cancel_token}` : undefined

    await notifyBookingCreated({
      customerEmail: trimEmail,
      customerName:  appt.customer_name,
      businessEmail: biz.email ?? undefined,
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
    })
  } catch (err) {
    console.error('[notify/booking] Unexpected error:', err instanceof Error ? err.message : err)
  }

  return NextResponse.json({ ok: true })
}
