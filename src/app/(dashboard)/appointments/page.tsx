import type { Metadata }              from 'next'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Appointment }           from '@/types/database'
import { AppointmentsClient }         from './AppointmentsClient'

export const metadata: Metadata = { title: 'Randevular' }

export default async function AppointmentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bizQuery = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!bizQuery.data) redirect('/onboarding')
  const business = bizQuery.data

  // Fetch last 3 months + next 2 months — enough for weekly navigation
  const from = new Date()
  from.setMonth(from.getMonth() - 3)
  const to = new Date()
  to.setMonth(to.getMonth() + 2)

  const apptQuery = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', business.id)
    .gte('appointment_date', from.toISOString().split('T')[0])
    .lte('appointment_date', to.toISOString().split('T')[0])
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })

  const appointments: Appointment[] = apptQuery.data ?? []

  return <AppointmentsClient appointments={appointments} />
}
