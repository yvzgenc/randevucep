import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ServicesManager } from '@/components/dashboard/ServicesManager'

export const metadata: Metadata = { title: 'Hizmetler' }

export default async function ServicesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('business_id', business.id)
    .order('service_name')

  return (
    <ServicesManager
      businessId={business.id}
      businessType={business.business_type ?? null}
      initial={services ?? []}
    />
  )
}
