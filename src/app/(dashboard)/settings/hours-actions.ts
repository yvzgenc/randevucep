'use server'

import { revalidatePath }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { verifyBusinessOwnership }    from '@/lib/supabase/business'

// ── Çalışma saatleri kaydet ───────────────────────────────────────────────────

export interface HourRow {
  dow:          number   // 0=Sun…6=Sat
  is_open:      boolean
  opening_time: string   // 'HH:MM'
  closing_time: string   // 'HH:MM'
}

export async function saveBusinessHours(
  businessId: number,
  rows: HourRow[],
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const business = await verifyBusinessOwnership(supabase, user.id, businessId)
  if (!business) return { error: 'Yetki hatası.' }

  const upsertRows = rows.map((r) => ({
    business_id:  businessId,
    dow:          r.dow,
    is_open:      r.is_open,
    opening_time: r.is_open ? r.opening_time : null,
    closing_time: r.is_open ? r.closing_time : null,
  }))

  const { error } = await supabase
    .from('business_hours')
    .upsert(upsertRows, { onConflict: 'business_id,dow' })

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

// ── Kapalı gün ekle ───────────────────────────────────────────────────────────

export async function addClosure(
  businessId: number,
  closedDate: string,
  reason:     string,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const business = await verifyBusinessOwnership(supabase, user.id, businessId)
  if (!business) return { error: 'Yetki hatası.' }

  const { error } = await supabase
    .from('business_closures')
    .upsert(
      { business_id: businessId, closed_date: closedDate, reason: reason.trim() || null },
      { onConflict: 'business_id,closed_date' },
    )

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}

// ── Kapalı gün sil ────────────────────────────────────────────────────────────

export async function deleteClosure(
  businessId: number,
  closureId:  number,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const business = await verifyBusinessOwnership(supabase, user.id, businessId)
  if (!business) return { error: 'Yetki hatası.' }

  const { error } = await supabase
    .from('business_closures')
    .delete()
    .eq('id', closureId)
    .eq('business_id', businessId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { error: null }
}
