import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import styles from './admin.module.css'

export const metadata: Metadata = { title: 'Admin — Genel Bakış' }

const STAT_ICONS = ['🏢', '🔬', '💳', '✕']

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const now = new Date().toISOString()

  const [totalQ, trialQ, paidQ, canceledQ] = await Promise.all([
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('onboarding_completed', true),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('trial_ends_at', 'is', null)
      .gt('trial_ends_at', now),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .or(`trial_ends_at.is.null,trial_ends_at.lte.${now}`),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled'),
  ])

  const stats = [
    { label: 'Toplam İşletme', value: totalQ.count    ?? 0 },
    { label: 'Trial',          value: trialQ.count     ?? 0 },
    { label: 'Aktif Ücretli', value: paidQ.count      ?? 0 },
    { label: 'İptal',          value: canceledQ.count  ?? 0 },
  ]

  return (
    <div>
      {/* Welcome banner */}
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeBannerIcon}>👋</div>
        <div>
          <p className={styles.welcomeBannerTitle}>Admin Paneli</p>
          <p className={styles.welcomeBannerDesc}>Platform genelindeki işletmeleri ve abonelikleri yönetin.</p>
        </div>
      </div>

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Genel Bakış</h1>
          <p className={styles.pageDesc}>Platform özeti</p>
        </div>
      </div>

      <div className={styles.statsRow}>
        {stats.map((s, i) => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statIcon}>{STAT_ICONS[i]}</div>
            <p className={styles.statLabel}>{s.label}</p>
            <p className={styles.statValue}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.empty}>
          Detaylı işletme listesi için{' '}
          <a href="/admin/businesses" style={{ color: 'var(--color-accent-2)', fontWeight: 600 }}>
            İşletmeler →
          </a>
        </div>
      </div>
    </div>
  )
}
