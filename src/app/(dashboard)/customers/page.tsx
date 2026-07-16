import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireOwnerBusiness }       from '@/lib/supabase/business'
import type { Customer }              from '@/types/database'
import { CustomersClient }            from './CustomersClient'

export const metadata: Metadata = { title: 'Müşteriler' }

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await requireOwnerBusiness(supabase, user.id)

  const custQuery = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  const customers: Customer[] = custQuery.data ?? []

  return <CustomersClient customers={customers} />
}
