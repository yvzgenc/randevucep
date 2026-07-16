import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireOwnerBusiness }       from '@/lib/supabase/business'
import { ServicesClient }             from './ServicesClient'

export const metadata: Metadata = { title: 'Hizmetler' }

export default async function ServicesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await requireOwnerBusiness(supabase, user.id)

  const [servicesQ, subQ] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .order('service_name'),
    supabase
      .from('subscriptions')
      .select('plan_name')
      .eq('business_id', business.id)
      .maybeSingle(),
  ])

  return (
    <ServicesClient
      businessId={business.id}
      businessType={business.business_type ?? null}
      planName={subQ.data?.plan_name ?? null}
      services={servicesQ.data ?? []}
    />
  )
}
