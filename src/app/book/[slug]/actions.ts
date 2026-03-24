'use server'

// ─── Server-side booking action ───────────────────────────────────────────────
// Sends email AND optional SMS/WhatsApp after booking based on business settings.

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyBookingCreatedMulti }   from '@/lib/notifications'
import type { Database }               from '@/types/database'

export interface BookAppointmentArgs {
  businessId:       number
  serviceId:        number
  serviceName:      string
  serviceDuration:  number
  staffId:          number
  staffName:        string
  customerName:     string
  customerPhone:    string
  date:             string
  time:             string
  price:            number
  notes:            string | null
  customerEmail:    string | null
}

export interface BookAppointmentResult {
  appointmentId?: number
  customerId?:    number
  error?:         string
}

type ApptRow = Database['public']['Tables']['appointments']['Row']

export async function bookAppointment(
  args: BookAppointmentArgs,
): Promise<BookAppointmentResult> {
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc('book_appointment', {
    p_business_id:      args.businessId,
    p_service_id:       args.serviceId,
    p_service_name:     args.serviceName,
    p_service_duration: args.serviceDuration,
    p_staff_id:         args.staffId,
    p_staff_name:       args.staffName,
    p_customer_name:    args.customerName,
    p_customer_phone:   args.customerPhone,
    p_date:             args.date,
    p_time:             args.time,
    p_price:            args.price,
    p_notes:            args.notes,
    p_customer_email:   args.customerEmail ?? null,
  })

  if (error) {
    return { error: 'Randevu oluşturulamadı: ' + error.message }
  }

  const rpcResult = data as unknown as {
    error?:          string
    appointment_id?: number
    customer_id?:    number
  } | null

  if (!rpcResult) return { error: 'Randevu kaydı alınamadı.' }
  if (rpcResult.error) return { error: rpcResult.error }

  const appointmentId = rpcResult.appointment_id ?? undefined
  const customerId    = rpcResult.customer_id    ?? undefined

  // ── Notifications ─────────────────────────────────────────────────────────
  if (appointmentId !== undefined && args.customerEmail?.includes('@')) {
    // Fetch business info + settings in parallel
    const [bizQ, settingsQ] = await Promise.all([
      supabase
        .from('businesses')
        .select('name, slug, phone, email')
        .eq('id', args.businessId)
        .maybeSingle(),
      supabase
        .from('business_settings')
        .select('sms_notifications_enabled, whatsapp_notifications_enabled')
        .eq('business_id', args.businessId)
        .maybeSingle(),
    ])

    if (bizQ.data) {
      const biz      = bizQ.data
      const settings = settingsQ.data

      const appointmentDate = new Date(args.date + 'T00:00:00').toLocaleDateString('tr-TR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })

      const smsEnabled      = settings?.sms_notifications_enabled      ?? false
      const whatsappEnabled = settings?.whatsapp_notifications_enabled ?? false

      void notifyBookingCreatedMulti({
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
        // Only pass smsConfig if at least one channel is enabled
        sms: (smsEnabled || whatsappEnabled) ? {
          smsEnabled,
          whatsappEnabled,
          customerPhone: args.customerPhone,
        } : undefined,
      })
    }
  }

  return { appointmentId, customerId }
}
