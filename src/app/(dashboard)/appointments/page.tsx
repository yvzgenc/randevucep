import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireOwnerBusiness }       from '@/lib/supabase/business'
import type { Appointment, Service, StaffMember } from '@/types/database'
import { AppointmentsClient }         from './AppointmentsClient'

export const metadata: Metadata = { title: 'Randevular' }

export default async function AppointmentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const business = await requireOwnerBusiness(supabase, user.id)

  const from = new Date()
  from.setMonth(from.getMonth() - 3)
  const to = new Date()
  to.setMonth(to.getMonth() + 2)

  const [apptQ, servicesQ, staffQ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*')
      .eq('business_id', business.id)
      .gte('appointment_date', from.toISOString().split('T')[0])
      .lte('appointment_date', to.toISOString().split('T')[0])
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false }),
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'Aktif')
      .order('service_name'),
    supabase
      .from('staff')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'Aktif')
      .order('full_name'),
  ])

  const appointments: Appointment[] = apptQ.data ?? []
  const services:     Service[]     = servicesQ.data ?? []
  const staff:        StaffMember[] = staffQ.data ?? []

  return (
    <AppointmentsClient
      appointments={appointments}
      services={services}
      staff={staff}
    />
  )
}
