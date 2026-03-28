import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Customer }              from '@/types/database'
import { CustomersClient }            from './CustomersClient'

export const metadata: Metadata = { title: 'Müşteriler' }

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bizQuery = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!bizQuery.data) redirect('/onboarding')

  const custQuery = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', bizQuery.data.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  const customers: Customer[] = custQuery.data ?? []

  return <CustomersClient customers={customers} />
}
