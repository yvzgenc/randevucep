import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import styles from './admin.module.css'

export const metadata: Metadata = { title: 'Admin — Genel Bakış' }

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const now = new Date().toISOString()

  const [
    { count: totalBusinesses },
    { count: trialCount },
    { count: paidActiveCount },
    { count: canceledCount },
  ] = await Promise.all([
    // All onboarded businesses
    supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('onboarding_completed', true),

    // Trial: active status AND trial_ends_at is in the future
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('trial_ends_at', 'is', null)
      .gt('trial_ends_at', now),

    // Paid active: active status AND (no trial_ends_at OR trial already expired)
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`trial_ends_at.is.null,trial_ends_at.lte.${now}`),

    // Canceled
    supabase
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'canceled'),
  ])

  const stats = [
    { label: 'Toplam İşletme', value: totalBusinesses  ?? 0 },
    { label: 'Trial',           value: trialCount       ?? 0 },
    { label: 'Aktif Ücretli',  value: paidActiveCount  ?? 0 },
    { label: 'İptal',           value: canceledCount    ?? 0 },
  ]

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Genel Bakış</h1>
          <p className={styles.pageDesc}>Platform özeti</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        {stats.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <p className={styles.statLabel}>{s.label}</p>
            <p className={styles.statValue}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.empty}>
          Detaylar için{' '}
          <a href="/admin/businesses" style={{ color: 'var(--color-accent)' }}>
            İşletmeler →
          </a>
        </div>
      </div>
    </div>
  )
}
