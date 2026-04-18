'use server'

import { revalidatePath }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyStatusChangeMulti, sendSmsNotification } from '@/lib/notifications'
import { requireNonNull }             from '@/lib/supabase/guards'
import type { Database }              from '@/types/database'

export type AppointmentStatus = 'Onaylı' | 'İptal' | 'Tamamlandı' | 'Gelmedi'

const VALID_STATUSES: AppointmentStatus[] = ['Onaylı', 'İptal', 'Tamamlandı', 'Gelmedi']

export interface UpdateStatusResult {
  error:          string | null
  customerEmail?: string
}

// Full row type from database schema — used after select('*') to avoid
// GenericStringError that occurs when Supabase SDK cannot parse a partial
// select string into column types.
type ApptRow = Database['public']['Tables']['appointments']['Row']
type BizRow  = Pick<
  Database['public']['Tables']['businesses']['Row'],
  'id' | 'name' | 'slug' | 'phone'
>

export async function updateAppointmentStatus(
  appointmentId: number,
  newStatus:     AppointmentStatus,
  manualEmail?:  string,
): Promise<UpdateStatusResult> {
  if (!VALID_STATUSES.includes(newStatus)) {
    return { error: 'Geçersiz durum.' }
  }

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  // select('*') gives full typed row — no GenericStringError
  const apptQuery = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .single()

  if (apptQuery.error || !apptQuery.data) {
    return { error: 'Randevu bulunamadı.' }
  }

  const appt: ApptRow = apptQuery.data

  // business_id is nullable in schema — explicit guard before .eq()
  const businessId = appt.business_id
  if (businessId == null) {
    return { error: 'Randevuya bağlı işletme bulunamadı.' }
  }

  // Confirm ownership
  const bizQuery = await supabase
    .from('businesses')
    .select('id, name, slug, phone')
    .eq('id', businessId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (bizQuery.error || !bizQuery.data) {
    return { error: 'Bu randevuyu güncelleme yetkiniz yok.' }
  }

  const biz: BizRow = bizQuery.data

  // Update status
  const updateQuery = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)

  if (updateQuery.error) return { error: updateQuery.error.message }

  // Resolve email: DB value takes priority, manual input is fallback
  const resolvedEmail = appt.customer_email?.trim() || manualEmail?.trim() || ''

  // Send notification for actionable status changes
  if (newStatus === 'Onaylı' || newStatus === 'İptal') {
    const appointmentDate = new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const manageUrl = appt.cancel_token ? `${baseUrl}/manage/${appt.cancel_token}` : undefined

    // Fetch SMS settings for this business (best-effort)
    const settQ = await supabase
      .from('business_settings')
      .select('sms_notifications_enabled, whatsapp_notifications_enabled')
      .eq('business_id', businessId)
      .maybeSingle()

    const smsSettings = settQ.data

    if (resolvedEmail && resolvedEmail.includes('@')) {
      void notifyStatusChangeMulti({
        event:         newStatus === 'Onaylı' ? 'booking_confirmed' : 'booking_canceled',
        customerEmail: resolvedEmail,
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
        sms: {
          smsEnabled:      smsSettings?.sms_notifications_enabled      ?? false,
          whatsappEnabled: smsSettings?.whatsapp_notifications_enabled ?? false,
          customerPhone:   appt.customer_phone,
        },
      })
    } else {
      // No email — still try SMS if enabled
      const phone = appt.customer_phone?.trim()
      if (phone && phone.length >= 10 && smsSettings) {
        const event = newStatus === 'Onaylı' ? 'booking_confirmed' : 'booking_canceled'
        const data  = {
          businessName:    biz.name,
          businessPhone:   biz.phone ?? undefined,
          customerName:    appt.customer_name,
          customerPhone:   appt.customer_phone,
          serviceName:     appt.service_name,
          staffName:       appt.staff_name,
          appointmentDate,
          appointmentTime: appt.appointment_time,
          appointmentId:   appt.id,
          manageUrl,
        }
        if (smsSettings.whatsapp_notifications_enabled) {
          void sendSmsNotification({ event, channel: 'whatsapp', to: phone, data })
        } else if (smsSettings.sms_notifications_enabled) {
          void sendSmsNotification({ event, channel: 'sms',      to: phone, data })
        }
      } else {
        console.info(`[appointments/action] Status="${newStatus}" appt=${appointmentId} — no email or SMS config, skipped.`)
      }
    }
  }

  revalidatePath('/appointments')
  return { error: null, customerEmail: resolvedEmail || undefined }
}

export async function updateAppointmentNote(
  appointmentId: number,
  note: string,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  // Ownership check via business
  const apptQ = await supabase
    .from('appointments')
    .select('business_id')
    .eq('id', appointmentId)
    .single()

  if (!apptQ.data?.business_id) return { error: 'Randevu bulunamadı.' }

  const bizQ = await supabase
    .from('businesses')
    .select('id')
    .eq('id', apptQ.data.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!bizQ.data) return { error: 'Bu randevuyu düzenleme yetkiniz yok.' }

  const { error } = await supabase
    .from('appointments')
    .update({ notes: note.trim() || null })
    .eq('id', appointmentId)

  if (error) return { error: error.message }

  revalidatePath('/appointments')
  return { error: null }
}

// re-export so callers don't need a separate import
export { requireNonNull }
