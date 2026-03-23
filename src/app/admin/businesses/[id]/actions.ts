'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { PLAN_NAMES, type PlanName } from '@/lib/plans'

const VALID_STATUSES = ['active', 'canceled', 'past_due'] as const
type SubStatus = (typeof VALID_STATUSES)[number]

export interface ActionResult {
  success: boolean
  message: string
}

/** Update subscription plan for a given business. */
export async function updatePlan(
  businessId: number,
  planName: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return { success: false, message: 'Yetkisiz erişim.' }
  }

  if (!(PLAN_NAMES as readonly string[]).includes(planName)) {
    return { success: false, message: 'Geçersiz plan adı.' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ plan_name: planName as PlanName })
    .eq('business_id', businessId)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath(`/admin/businesses/${businessId}`)
  revalidatePath('/admin/businesses')
  return { success: true, message: `Plan "${planName}" olarak güncellendi.` }
}

/** Update subscription status for a given business. */
export async function updateStatus(
  businessId: number,
  status: string,
): Promise<ActionResult> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return { success: false, message: 'Yetkisiz erişim.' }
  }

  if (!(VALID_STATUSES as readonly string[]).includes(status)) {
    return { success: false, message: 'Geçersiz status.' }
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({ status: status as SubStatus })
    .eq('business_id', businessId)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath(`/admin/businesses/${businessId}`)
  revalidatePath('/admin/businesses')
  return { success: true, message: `Status "${status}" olarak güncellendi.` }
}
