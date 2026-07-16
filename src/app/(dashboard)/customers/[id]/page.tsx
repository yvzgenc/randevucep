import type { Metadata }              from 'next'
import Link                           from 'next/link'
import { notFound, redirect }         from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireOwnerBusiness }       from '@/lib/supabase/business'
import type { Appointment }           from '@/types/database'
import { CustomerDetail }             from './CustomerDetail'
import styles from './customer-detail.module.css'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const q = await supabase
    .from('customers')
    .select('full_name')
    .eq('id', Number(id))
    .maybeSingle()
  return { title: q.data ? `${q.data.full_name} — Müşteri` : 'Müşteri Detayı' }
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const numId = Number(id)
  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify business ownership
  const business = await requireOwnerBusiness(supabase, user.id)
  const bizId = business.id

  // Fetch customer (must belong to this business)
  const custQuery = await supabase
    .from('customers')
    .select('*')
    .eq('id', numId)
    .eq('business_id', bizId)
    .maybeSingle()

  if (!custQuery.data) notFound()
  const customer = custQuery.data

  // Fetch all appointments for this customer
  // Match by phone (primary key for customer identity across bookings)
  const apptQuery = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', bizId)
    .eq('customer_phone', customer.phone)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })

  const appointments: Appointment[] = apptQuery.data ?? []

  return (
    <div>
      <Link href="/customers" className={styles.backLink}>
        ← Müşteriler
      </Link>
      <CustomerDetail customer={customer} appointments={appointments} />
    </div>
  )
}
