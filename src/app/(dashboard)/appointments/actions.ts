'use server'

import { revalidatePath }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notifyStatusChange }         from '@/lib/notifications'
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
  if (
    resolvedEmail &&
    resolvedEmail.includes('@') &&
    (newStatus === 'Onaylı' || newStatus === 'İptal')
  ) {
    const appointmentDate = new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    void notifyStatusChange({
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
      },
    })
  } else if (newStatus === 'Onaylı' || newStatus === 'İptal') {
    console.info(
      `[appointments/action] Status="${newStatus}" appt=${appointmentId}` +
      ` — no customer email, notification skipped.`
    )
  }

  revalidatePath('/appointments')
  return { error: null, customerEmail: resolvedEmail || undefined }
}

// re-export so callers don't need a separate import
export { requireNonNull }
