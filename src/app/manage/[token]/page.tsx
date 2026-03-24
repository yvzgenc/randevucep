import type { Metadata }              from 'next'
import { notFound }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ManageFlow }                 from './ManageFlow'
import styles from './manage.module.css'

interface Props {
  params: Promise<{ token: string }>
}

export const metadata: Metadata = { title: 'Randevunuzu Yönetin' }

export default async function ManagePage({ params }: Props) {
  const { token } = await params

  // Basic UUID format guard — prevent obviously bad requests reaching DB
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(token)) notFound()

  const supabase = await createServerSupabaseClient()

  // Fetch appointment by cancel_token (anon-safe: anon_read_by_token policy)
  const apptQ = await supabase
    .from('appointments')
    .select('id, customer_name, customer_email, customer_phone, service_name, service_id, staff_id, staff_name, appointment_date, appointment_time, duration_minutes, price, status, business_id, cancel_token')
    .eq('cancel_token', token)
    .maybeSingle()

  if (!apptQ.data) notFound()
  const appt = apptQ.data

  // Fetch business info
  const bizQ = await supabase
    .from('businesses')
    .select('id, name, slug, phone')
    .eq('id', appt.business_id ?? -1)
    .maybeSingle()

  // Fetch settings for slot config
  const settQ = await supabase
    .from('business_settings')
    .select('opening_time, closing_time, slot_minutes')
    .eq('business_id', appt.business_id ?? -1)
    .maybeSingle()

  // Fetch busy slots for reschedule (next 30 days)
  const today  = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const busyQ = await supabase
    .from('appointments')
    .select('appointment_date, appointment_time, staff_id, duration_minutes')
    .eq('business_id', appt.business_id ?? -1)
    .neq('id', appt.id)                     // exclude current appointment
    .in('status', ['Bekliyor', 'Onaylı'])
    .gte('appointment_date', today)
    .lte('appointment_date', future)

  const biz      = bizQ.data
  const settings = settQ.data ?? { opening_time: '09:00', closing_time: '18:00', slot_minutes: 30 }
  const busySlots = busyQ.data ?? []

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>📅</div>
          <div>
            <div className={styles.brandName}>{biz?.name ?? 'İşletme'}</div>
            <div className={styles.brandSub}>Randevu Yönetimi</div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <ManageFlow
          token={token}
          appt={appt}
          bizName={biz?.name ?? 'İşletme'}
          bizPhone={biz?.phone ?? null}
          bizSlug={biz?.slug ?? ''}
          openingTime={settings.opening_time}
          closingTime={settings.closing_time}
          slotMinutes={settings.slot_minutes}
          busySlots={busySlots}
        />
      </main>

      <footer className={styles.footer}>
        <span>📅 RandevuCep ile çalışmaktadır</span>
      </footer>
    </div>
  )
}
