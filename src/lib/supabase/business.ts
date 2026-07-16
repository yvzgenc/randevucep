// ─── Owner-business lookup helpers ───────────────────────────────────────────
// Centralizes the "does this business belong to this user" query shapes that
// were previously duplicated inline across dashboard pages and server actions.

import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Business } from '@/types/database'

/**
 * Returns the business owned by `userId`, or null if none exists yet.
 * Wrapped in React's `cache()` so multiple calls within the same request
 * (e.g. a layout and its page both needing the business) share one query.
 */
export const getOwnerBusiness = cache(async function getOwnerBusiness(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<Business | null> {
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', userId)
    .maybeSingle()
  return data
})

/**
 * Same as getOwnerBusiness, but redirects to /onboarding when there's no
 * business yet (or onboarding isn't finished, if `requireOnboarded` is set).
 * For use in page/layout Server Components only — not server actions.
 */
export async function requireOwnerBusiness(
  supabase: SupabaseClient<Database>,
  userId: string,
  opts?: { requireOnboarded?: boolean }
): Promise<Business> {
  const business = await getOwnerBusiness(supabase, userId)
  if (!business) redirect('/onboarding')
  if (opts?.requireOnboarded && !business.onboarding_completed) redirect('/onboarding')
  return business
}

/**
 * Verifies `businessId` is owned by `userId`. Returns the business row if so,
 * null otherwise. Does not redirect — for server actions that need to return
 * a typed error instead of navigating.
 */
export async function verifyBusinessOwnership(
  supabase: SupabaseClient<Database>,
  userId: string,
  businessId: number
): Promise<Business | null> {
  const { data } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .eq('owner_id', userId)
    .maybeSingle()
  return data
}
