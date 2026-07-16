'use server'

import { revalidatePath }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getOwnerBusiness }           from '@/lib/supabase/business'

export interface AddAppointmentInput {
  serviceId:   number
  serviceName: string
  serviceDuration: number
  staffId:     number
  staffName:   string
  date:        string   // YYYY-MM-DD
  time:        string   // HH:MM
  customerName:  string
  customerPhone: string
  customerEmail: string
  notes:       string
  price:       number
}

export interface AddAppointmentResult {
  error: string | null
}

export async function addAppointmentAction(
  input: AddAppointmentInput,
): Promise<AddAppointmentResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const business = await getOwnerBusiness(supabase, user.id)
  if (!business) return { error: 'İşletme bulunamadı.' }
  const businessId = business.id

  // Use existing book_appointment RPC — same as online booking
  const { data, error } = await supabase.rpc('book_appointment', {
    p_business_id:      businessId,
    p_service_id:       input.serviceId,
    p_service_name:     input.serviceName,
    p_service_duration: input.serviceDuration,
    p_staff_id:         input.staffId,
    p_staff_name:       input.staffName,
    p_customer_name:    input.customerName.trim(),
    p_customer_phone:   input.customerPhone.trim(),
    p_date:             input.date,
    p_time:             input.time,
    p_price:            input.price,
    p_notes:            input.notes.trim() || null,
    p_customer_email:   input.customerEmail.trim() || null,
  })

  if (error) return { error: error.message }

  const result = data as { error?: string; appointment_id?: number } | null
  if (result?.error) return { error: result.error }

  revalidatePath('/appointments')
  revalidatePath('/dashboard')
  return { error: null }
}
