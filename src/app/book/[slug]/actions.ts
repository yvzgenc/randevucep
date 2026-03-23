'use server'

// ─── Server-side booking action ───────────────────────────────────────────────
// Replaces the client-side supabase.rpc('book_appointment') call in BookingFlow.
// Running server-side guarantees the notification fires even if the browser tab
// closes or the network drops after booking — the response is already on the
// server by the time we call notifyBookingCreated().

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyBookingCreated }        from '@/lib/notifications'

export interface BookAppointmentArgs {
  businessId:       number
  serviceId:        number
  serviceName:      string
  serviceDuration:  number
  staffId:          number
  staffName:        string
  customerName:     string
  customerPhone:    string
  date:             string   // YYYY-MM-DD
  time:             string   // HH:MM
  price:            number
  notes:            string | null
  customerEmail:    string | null
}

export interface BookAppointmentResult {
  appointmentId?: number
  customerId?:    number
  error?:         string
}

export async function bookAppointment(
  args: BookAppointmentArgs,
): Promise<BookAppointmentResult> {
  // Use anon Supabase client — book_appointment is SECURITY DEFINER + GRANT TO anon
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc('book_appointment', {
    p_business_id:     args.businessId,
    p_service_id:      args.serviceId,
    p_service_name:    args.serviceName,
    p_service_duration: args.serviceDuration,
    p_staff_id:        args.staffId,
    p_staff_name:      args.staffName,
    p_customer_name:   args.customerName,
    p_customer_phone:  args.customerPhone,
    p_date:            args.date,
    p_time:            args.time,
    p_price:           args.price,
    p_notes:           args.notes,
    p_customer_email:  args.customerEmail || null,
  })

  if (error) {
    return { error: 'Randevu oluşturulamadı: ' + error.message }
  }

  const result = data as { error?: string; appointment_id?: number; customer_id?: number }

  if (result?.error) {
    return { error: result.error }
  }

  const appointmentId = result.appointment_id
  const customerId    = result.customer_id

  // ── Server-side notification chain ───────────────────────────────────────
  // Guaranteed to execute — browser state is irrelevant at this point.
  if (appointmentId && args.customerEmail?.includes('@')) {
    // Fetch business info for notification (needed for email/name/phone/slug)
    const { data: biz } = await supabase
      .from('businesses')
      .select('name, slug, phone, email')
      .eq('id', args.businessId)
      .maybeSingle()

    if (biz) {
      const appointmentDate = new Date(args.date + 'T00:00:00').toLocaleDateString('tr-TR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })

      // void — notification failures are logged inside notifyBookingCreated,
      // never surfaced to the user
      void notifyBookingCreated({
        customerEmail: args.customerEmail,
        customerName:  args.customerName,
        businessEmail: biz.email ?? undefined,
        data: {
          businessName:    biz.name,
          businessPhone:   biz.phone ?? undefined,
          businessSlug:    biz.slug,
          customerName:    args.customerName,
          customerPhone:   args.customerPhone,
          serviceName:     args.serviceName,
          staffName:       args.staffName,
          appointmentDate,
          appointmentTime: args.time,
          appointmentId,
        },
      })
    }
  }

  return { appointmentId, customerId }
}
