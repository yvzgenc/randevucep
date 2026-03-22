import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import styles from './dashboard.module.css'

export const metadata: Metadata = { title: 'Genel Bakış' }

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const today = new Date().toISOString().split('T')[0]

  const [{ count: todayCount }, { count: totalCount }] = await Promise.all([
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('appointment_date', today),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', business.id),
  ])

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Genel Bakış</h1>
        <a
          href={`/book/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className={styles.bookingBadge}
        >
          🔗 Rezervasyon sayfanız aktif
        </a>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Bugünkü Randevular</p>
          <p className={styles.statValue}>{todayCount ?? 0}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Toplam Randevu</p>
          <p className={styles.statValue}>{totalCount ?? 0}</p>
        </div>
      </div>

      <div className={styles.placeholder}>
        <p>Randevu takvimi ve istatistikler yakında eklenecek.</p>
      </div>
    </div>
  )
}
