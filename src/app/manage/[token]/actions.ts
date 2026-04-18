'use server'

import { createServerSupabaseClient }           from '@/lib/supabase/server'
import { sendNotification, sendSmsNotification } from '@/lib/notifications'

export interface ManageResult {
  ok:      boolean
  action?: string
  error?:  string
  newDate?: string
  newTime?: string
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function hasPhone(phone: string | null | undefined): phone is string {
  return !!phone && phone.trim().length >= 10
}

// ── Confirm ───────────────────────────────────────────────────────────────────

export async function confirmAppointment(opts: {
  token:           string
  customerName:    string
  customerEmail:   string | null
  customerPhone:   string
  bizName:         string
  bizPhone:        string | null
  serviceName:     string
  apptDate:        string   // formatted display string
  apptTime:        string
  smsEnabled:      boolean
  whatsappEnabled: boolean
}): Promise<ManageResult> {
  const supabase = await createServerSupabaseClient()

  const rpcQ = await supabase.rpc('manage_appointment_by_token', {
    p_token:    opts.token,
    p_action:   'confirm',
    p_new_date: null,
    p_new_time: null,
  })

  if (rpcQ.error) return { ok: false, error: rpcQ.error.message }

  const result = rpcQ.data as { ok?: boolean; error?: string; action?: string } | null
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Onaylama başarısız.' }

  const data = {
    businessName:    opts.bizName,
    businessPhone:   opts.bizPhone ?? undefined,
    customerName:    opts.customerName,
    customerPhone:   opts.customerPhone,
    serviceName:     opts.serviceName,
    staffName:       '',
    appointmentDate: opts.apptDate,
    appointmentTime: opts.apptTime,
  }

  const tasks: Promise<unknown>[] = []

  // Email to customer
  if (opts.customerEmail?.includes('@')) {
    tasks.push(sendNotification({
      event:   'booking_confirmed',
      channel: 'email',
      to:      opts.customerEmail,
      toName:  opts.customerName,
      data,
    }))
  }

  // SMS/WhatsApp to customer
  if (hasPhone(opts.customerPhone)) {
    if (opts.whatsappEnabled) {
      tasks.push(sendSmsNotification({ event: 'booking_confirmed', channel: 'whatsapp', to: opts.customerPhone, data }))
    } else if (opts.smsEnabled) {
      tasks.push(sendSmsNotification({ event: 'booking_confirmed', channel: 'sms',      to: opts.customerPhone, data }))
    }
  }

  await Promise.allSettled(tasks)
  return { ok: true, action: result.action ?? 'confirmed' }
}

// ── Cancel ────────────────────────────────────────────────────────────────────

export async function cancelAppointment(opts: {
  token:           string
  customerName:    string
  customerEmail:   string | null
  customerPhone:   string
  bizName:         string
  bizPhone:        string | null
  serviceName:     string
  apptDate:        string   // formatted display string
  apptTime:        string
  smsEnabled:      boolean
  whatsappEnabled: boolean
}): Promise<ManageResult> {
  const supabase = await createServerSupabaseClient()

  const rpcQ = await supabase.rpc('manage_appointment_by_token', {
    p_token:    opts.token,
    p_action:   'cancel',
    p_new_date: null,
    p_new_time: null,
  })

  if (rpcQ.error) return { ok: false, error: rpcQ.error.message }

  const result = rpcQ.data as { ok?: boolean; error?: string } | null
  if (!result?.ok) return { ok: false, error: result?.error ?? 'İptal başarısız.' }

  const data = {
    businessName:    opts.bizName,
    businessPhone:   opts.bizPhone ?? undefined,
    customerName:    opts.customerName,
    customerPhone:   opts.customerPhone,
    serviceName:     opts.serviceName,
    staffName:       '',
    appointmentDate: opts.apptDate,
    appointmentTime: opts.apptTime,
  }

  const tasks: Promise<unknown>[] = []

  // Email to customer
  if (opts.customerEmail?.includes('@')) {
    tasks.push(sendNotification({
      event:   'booking_canceled',
      channel: 'email',
      to:      opts.customerEmail,
      toName:  opts.customerName,
      data,
    }))
  }

  // SMS/WhatsApp to customer
  if (hasPhone(opts.customerPhone)) {
    if (opts.whatsappEnabled) {
      tasks.push(sendSmsNotification({ event: 'booking_canceled', channel: 'whatsapp', to: opts.customerPhone, data }))
    } else if (opts.smsEnabled) {
      tasks.push(sendSmsNotification({ event: 'booking_canceled', channel: 'sms',      to: opts.customerPhone, data }))
    }
  }

  await Promise.allSettled(tasks)
  return { ok: true, action: 'canceled' }
}

// ── Reschedule ────────────────────────────────────────────────────────────────

export async function rescheduleAppointment(opts: {
  token:         string
  newDate:       string   // ISO YYYY-MM-DD
  newTime:       string   // HH:MM
  customerName:  string
  customerEmail: string | null
  bizName:       string
  bizPhone:      string | null
  serviceName:   string
}): Promise<ManageResult> {
  const supabase = await createServerSupabaseClient()

  const rpcQ = await supabase.rpc('manage_appointment_by_token', {
    p_token:    opts.token,
    p_action:   'reschedule',
    p_new_date: opts.newDate,
    p_new_time: opts.newTime,
  })

  if (rpcQ.error) return { ok: false, error: rpcQ.error.message }

  const result = rpcQ.data as { ok?: boolean; error?: string } | null
  if (!result?.ok) return { ok: false, error: result?.error ?? 'Değişiklik başarısız.' }

  // Confirmation email with new date/time
  if (opts.customerEmail?.includes('@')) {
    const newDateFmt = new Date(opts.newDate + 'T00:00:00').toLocaleDateString('tr-TR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    void sendNotification({
      event:   'booking_confirmed',
      channel: 'email',
      to:      opts.customerEmail,
      toName:  opts.customerName,
      data: {
        businessName:    opts.bizName,
        businessPhone:   opts.bizPhone ?? undefined,
        customerName:    opts.customerName,
        customerPhone:   '',
        serviceName:     opts.serviceName,
        staffName:       '',
        appointmentDate: newDateFmt,
        appointmentTime: opts.newTime,
      },
    })
  }

  return { ok: true, action: 'rescheduled', newDate: opts.newDate, newTime: opts.newTime }
}
