import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Appointment } from '@/types/database'
import styles from './appointments.module.css'

export const metadata: Metadata = { title: 'Randevular' }

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case 'Tamamlandı': return styles.badgeDone
    case 'İptal':
    case 'Gelmedi':   return styles.badgeCancelled
    default:          return styles.badgePending
  }
}

export default async function AppointmentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const { data: appointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', business.id)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })
    .limit(100)

  const list: Appointment[] = appointments ?? []

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Randevular</h1>
        <span className={styles.count}>{list.length} randevu</span>
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Henüz randevu yok</p>
          <p className={styles.emptyDesc}>
            Müşteriler rezervasyon sayfanızdan randevu aldığında burada görünecek.
          </p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Tarih / Saat</span>
            <span>Müşteri</span>
            <span>Hizmet</span>
            <span>Personel</span>
            <span>Durum</span>
          </div>
          {list.map((appt) => (
            <div key={appt.id} className={styles.tableRow}>
              <span>
                <span className={styles.date}>
                  {new Date(appt.appointment_date).toLocaleDateString('tr-TR')}
                </span>
                <span className={styles.time}>{appt.appointment_time}</span>
              </span>
              <span>
                <span className={styles.primary}>{appt.customer_name}</span>
                <span className={styles.phone}>{appt.customer_phone}</span>
              </span>
              <span className={styles.muted}>{appt.service_name}</span>
              <span className={styles.muted}>{appt.staff_name}</span>
              <span>
                <span className={statusBadgeClass(appt.status)}>
                  {appt.status ?? 'Bekliyor'}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
