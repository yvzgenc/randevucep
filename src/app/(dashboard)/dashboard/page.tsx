import type { Metadata }         from 'next'
import { redirect }              from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { trialDaysRemaining, getPlanConfig } from '@/lib/plans'
import { AnalyticsSection }      from './AnalyticsSection'
import { TodayList }             from './TodayList'
import styles from './dashboard.module.css'

export const metadata: Metadata = { title: 'Genel Bakış' }

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const authQuery = await supabase.auth.getUser()
  const user = authQuery.data.user
  if (!user) redirect('/login')

  // Fetch business — query-object pattern
  const bizQuery = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (bizQuery.error || !bizQuery.data) redirect('/onboarding')
  const business = bizQuery.data

  const today = new Date().toISOString().split('T')[0]

  const [todayQ, subQ, pendingQ, todayListQ] = await Promise.all([
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('appointment_date', today),
    supabase
      .from('subscriptions')
      .select('*')
      .eq('business_id', business.id)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', business.id)
      .eq('status', 'Bekliyor')
      .gte('appointment_date', today),
    supabase
      .from('appointments')
      .select('*')
      .eq('business_id', business.id)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true }),
  ])

  const todayCount   = todayQ.count ?? 0
  const pendingCount = pendingQ.count ?? 0
  const todayList    = todayListQ.data ?? []
  const subscription = subQ.data ?? null

  const planConfig  = getPlanConfig(subscription?.plan_name)
  const trialDays   = trialDaysRemaining(subscription?.trial_ends_at ?? null)
  const trialActive = trialDays !== null && trialDays > 0

  return (
    <div>
      {/* ── Page header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Genel Bakış</h1>
          <p className={styles.subtitle}>
            Hoş geldiniz, <strong>{business.name}</strong>
          </p>
        </div>
        <a
          href={`/book/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className={styles.bookingBadge}
        >
          🔗 Rezervasyon Sayfam
        </a>
      </div>

      {/* ── Trial banner ── */}
      {trialActive && (
        <div className={styles.trialBanner}>
          <span className={styles.trialText}>
            🎉 Deneme sürümünüz — <strong>{trialDays} gün</strong> kaldı
          </span>
          <a href="/settings" className={styles.upgradeLink}>
            Planı Yükselt →
          </a>
        </div>
      )}

      {/* ── Expired trial ── */}
      {!trialActive && trialDays === 0 && (
        <div className={styles.trialExpired}>
          <span>⚠️ Deneme süreniz doldu. Hizmetlerinizi korumak için bir plan seçin.</span>
          <a href="/settings" className={styles.upgradeLink}>Planı Seç →</a>
        </div>
      )}

      {/* ── Bekleyen onay uyarısı ── */}
      {pendingCount > 0 && (
        <a href="/appointments" className={styles.pendingBanner}>
          <span className={styles.pendingBannerDot} />
          <span>
            <strong>{pendingCount} randevu</strong> onayınızı bekliyor
          </span>
          <span className={styles.pendingBannerArrow}>Onaylara git →</span>
        </a>
      )}

      {/* ── Quick stat row ── */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Bugünkü Randevular</p>
          <p className={styles.statValue}>{todayCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Onay Bekleyen</p>
          <p className={pendingCount > 0 ? styles.statValueWarning : styles.statValue}>{pendingCount}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.statLabel}>Aktif Plan</p>
          <p className={styles.statPlan}>{planConfig.label}</p>
        </div>
      </div>

      {/* ── Bugün listesi ── */}
      <TodayList appointments={todayList} />

      {/* ── Analytics section ── */}
      <AnalyticsSection supabase={supabase} businessId={business.id} />
    </div>
  )
}
