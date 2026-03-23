'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { PLAN_NAMES, type PlanName } from '@/lib/plans'

const VALID_STATUSES = ['active', 'canceled', 'past_due'] as const
type SubscriptionStatus = (typeof VALID_STATUSES)[number]

// ─── Update plan + status ─────────────────────────────────────────────────────

export async function updateSubscription(
  businessId: number,
  planName: PlanName,
  status: SubscriptionStatus,
): Promise<{ error: string | null }> {
  // Auth + admin check
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Oturum açılmamış.' }
  if (!isAdminEmail(user.email)) return { error: 'Yetkisiz erişim.' }

  // Validate inputs (defence in depth — type system already guards these)
  if (!(PLAN_NAMES as readonly string[]).includes(planName)) {
    return { error: 'Geçersiz plan.' }
  }
  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return { error: 'Geçersiz durum.' }
  }

  const { data, error } = await supabase.rpc('admin_update_subscription', {
    calling_user_id: user.id,
    p_business_id:   businessId,
    p_plan_name:     planName,
    p_status:        status,
  })

  if (error) return { error: error.message }

  // admin_update_subscription returns Json (jsonb) — bridge through unknown
  // to safely narrow to the known shape without a direct unsound cast.
  const result = (data as unknown as { ok?: boolean; error?: string } | null)
  if (result?.error) return { error: result.error }

  revalidatePath('/admin/businesses')
  revalidatePath(`/admin/businesses/${businessId}`)

  return { error: null }
}
