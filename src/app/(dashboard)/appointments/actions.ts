'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyStatusChange } from '@/lib/notifications'

export type AppointmentStatus = 'Onaylı' | 'İptal' | 'Tamamlandı' | 'Gelmedi'

const VALID_STATUSES: AppointmentStatus[] = ['Onaylı', 'İptal', 'Tamamlandı', 'Gelmedi']

export interface UpdateStatusResult {
  error: string | null
  customerEmail?: string
}

type AppointmentForStatusUpdate = {
  id: number
  business_id: number | null
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  service_name: string | null
  staff_name: string | null
  appointment_date: string
  appointment_time: string
}

export async function updateAppointmentStatus(
  appointmentId: number,
  newStatus: AppointmentStatus,
  manualEmail?: string,
): Promise<UpdateStatusResult> {
  if (!VALID_STATUSES.includes(newStatus)) {
    return { error: 'Geçersiz durum.' }
  }

  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Oturum açmanız gerekiyor.' }
  }

  const appointmentQuery = await supabase
    .from('appointments')
    .select(
      `
        id,
        business_id,
        customer_name,
        customer_phone,
        customer_email,
        service_name,
        staff_name,
        appointment_date,
        appointment_time
      `
    )
    .eq('id', appointmentId)
    .single()

  if (appointmentQuery.error || !appointmentQuery.data) {
    return { error: 'Randevu bulunamadı.' }
  }

  const appt = appointmentQuery.data as AppointmentForStatusUpdate

  if (appt.business_id == null) {
    return { error: 'Randevuya bağlı işletme bulunamadı.' }
  }

  const businessQuery = await supabase
    .from('businesses')
    .select('id, name, slug, phone')
    .eq('id', appt.business_id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (businessQuery.error || !businessQuery.data) {
    return { error: 'Bu randevuyu güncelleme yetkiniz yok.' }
  }

  const biz = businessQuery.data

  const updateQuery = await supabase
    .from('appointments')
    .update({ status: newStatus })
    .eq('id', appointmentId)

  if (updateQuery.error) {
    return { error: updateQuery.error.message }
  }

  const resolvedEmail = (appt.customer_email?.trim() || manualEmail?.trim()) ?? ''

  if (
    resolvedEmail &&
    resolvedEmail.includes('@') &&
    (newStatus === 'Onaylı' || newStatus === 'İptal')
  ) {
    const appointmentDate = new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const notifData = {
      businessName: biz.name,
      businessPhone: biz.phone ?? '',
      businessSlug: biz.slug,
      customerName: appt.customer_name,
      customerPhone: appt.customer_phone ?? '',
      serviceName: appt.service_name ?? '',
      staffName: appt.staff_name ?? '',
      appointmentDate,
      appointmentTime: appt.appointment_time,
      appointmentId: appt.id,
    }

    void notifyStatusChange({
      event: newStatus === 'Onaylı' ? 'booking_confirmed' : 'booking_canceled',
      customerEmail: resolvedEmail,
      customerName: appt.customer_name,
      data: notifData,
    })
  } else if (newStatus === 'Onaylı' || newStatus === 'İptal') {
    console.info(
      `[appointments/action] Status changed to "${newStatus}" for appointment ${appointmentId} but no customer email available — notification skipped.`
    )
  }

  revalidatePath('/appointments')
  return { error: null, customerEmail: resolvedEmail || undefined }
}