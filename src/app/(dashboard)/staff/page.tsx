import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireOwnerBusiness }       from '@/lib/supabase/business'
import type { StaffWorkingDay }       from '@/types/database'
import { StaffClient }                from './StaffClient'

export const metadata: Metadata = { title: 'Personel' }

export default async function StaffPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await requireOwnerBusiness(supabase, user.id)

  const [staffQ, subQ, wdQ] = await Promise.all([
    supabase
      .from('staff')
      .select('*')
      .eq('business_id', business.id)
      .order('full_name'),
    supabase
      .from('subscriptions')
      .select('plan_name')
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('staff_working_days')
      .select('*')
      .eq('business_id', business.id),
  ])

  const workingDays: StaffWorkingDay[] = wdQ.data ?? []

  return (
    <StaffClient
      businessId={business.id}
      businessType={business.business_type ?? null}
      planName={subQ.data?.plan_name ?? null}
      staff={staffQ.data ?? []}
      workingDays={workingDays}
    />
  )
}
