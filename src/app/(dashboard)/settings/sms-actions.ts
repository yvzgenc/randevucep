'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { verifyBusinessOwnership }    from '@/lib/supabase/business'

interface SaveSmsSettingsInput {
  businessId:           number
  smsEnabled:           boolean
  whatsappEnabled:      boolean
  smsReminderEnabled:   boolean
  reminderHoursBefore:  number
}

export async function saveSmsSettings(
  input: SaveSmsSettingsInput,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  // Verify ownership
  const business = await verifyBusinessOwnership(supabase, user.id, input.businessId)
  if (!business) return { error: 'İşletme bulunamadı.' }

  // Upsert settings
  const { error: upsertErr } = await supabase
    .from('business_settings')
    .upsert(
      {
        business_id:                    input.businessId,
        sms_notifications_enabled:      input.smsEnabled,
        whatsapp_notifications_enabled: input.whatsappEnabled,
        sms_reminder_enabled:           input.smsReminderEnabled,
        reminder_hours_before:          input.reminderHoursBefore,
      },
      { onConflict: 'business_id' }
    )

  if (upsertErr) return { error: upsertErr.message }
  return { error: null }
}
