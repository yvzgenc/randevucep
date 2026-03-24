import type { Metadata }         from 'next'
import { redirect }              from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Appointment }      from '@/types/database'
import { AppointmentActions }    from './AppointmentActions'
import styles from './appointments.module.css'

export const metadata: Metadata = { title: 'Randevular' }

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case 'Tamamlandı': return styles.badgeDone
    case 'Onaylı':     return styles.badgeConfirmed
    case 'İptal':
    case 'Gelmedi':    return styles.badgeCancelled
    default:           return styles.badgePending
  }
}

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

  const apptQuery = await supabase
    .from('appointments')
    .select('*')
    .eq('business_id', business.id)
    .order('appointment_date', { ascending: false })
    .order('appointment_time', { ascending: false })
    .limit(100)

  const list: Appointment[] = apptQuery.data ?? []

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Randevular</h1>
        {list.length > 0 && (
          <span className={styles.count}>{list.length} randevu</span>
        )}
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.4 }}>📅</div>
          <p className={styles.emptyTitle}>Henüz randevu yok</p>
          <p className={styles.emptyDesc}>
            Müşteriler rezervasyon sayfanızdan randevu aldığında burada görünecek.
            <br />
            Rezervasyon sayfanızı paylaşarak başlayın.
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
            <span></span>
          </div>
          {list.map((appt) => (
            <div key={appt.id} className={styles.tableRow}>
              <span>
                <span className={styles.date}>
                  {new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'short',
                  })}
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
              <span>
                <AppointmentActions
                  appointmentId={appt.id}
                  currentStatus={appt.status}
                  savedEmail={appt.customer_email ?? null}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
