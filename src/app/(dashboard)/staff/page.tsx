import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { StaffManager } from '@/components/dashboard/StaffManager'

export const metadata: Metadata = { title: 'Personel' }

export default async function StaffPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const { data: staffList } = await supabase
    .from('staff')
    .select('*')
    .eq('business_id', business.id)
    .order('full_name')

  return (
    <StaffManager
      businessId={business.id}
      businessType={business.business_type ?? null}
      initial={staffList ?? []}
    />
  )
}
