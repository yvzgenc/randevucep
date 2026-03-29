import type { Metadata }         from 'next'
import { redirect }              from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { trialDaysRemaining, getPlanConfig } from '@/lib/plans'
import { AnalyticsSection }      from './AnalyticsSection'
import styles from './dashboard.module.css'

export const metadata: Metadata = { title: 'Genel Bakış' }

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Günaydın'
  if (h < 18) return 'İyi günler'
  return 'İyi akşamlar'
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()

  const authQuery = await supabase.auth.getUser()
  const user = authQuery.data.user
  if (!user) redirect('/login')

  const bizQuery = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (bizQuery.error || !bizQuery.data) redirect('/onboarding')
  const business = bizQuery.data

  const today = new Date().toISOString().split('T')[0]

  const [todayQ, subQ, pendingQ] = await Promise.all([
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
  ])

  const todayCount   = todayQ.count ?? 0
  const pendingCount = pendingQ.count ?? 0
  const subscription = subQ.data ?? null

  const planConfig  = getPlanConfig(subscription?.plan_name)
  const trialDays   = trialDaysRemaining(subscription?.trial_ends_at ?? null)
  const trialActive = trialDays !== null && trialDays > 0

  return (
    <div>
      {/* ── Page header ── */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {getGreeting()}, <span className={styles.titleAccent}>{business.name}</span>
          </h1>
          <p className={styles.subtitle}>{getTodayLabel()}</p>
        </div>
        <a
          href={`/book/${business.slug}`}
          target="_blank"
          rel="noreferrer"
          className={styles.bookingBadge}
        >
          <span>🔗</span> Rezervasyon Sayfam
        </a>
      </div>

      {/* ── Trial banner ── */}
      {trialActive && (
        <div className={styles.trialBanner}>
          <div className={styles.trialBannerLeft}>
            <span className={styles.trialIcon}>🎉</span>
            <span className={styles.trialText}>
              Deneme sürümünüz — <strong>{trialDays} gün</strong> kaldı
            </span>
          </div>
          <a href="/settings#plan" className={styles.upgradeLink}>
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

      {/* ── Pending banner ── */}
      {pendingCount > 0 && (
        <a href="/appointments" className={styles.pendingBanner}>
          <span className={styles.pendingBannerDot} />
          <span>
            <strong>{pendingCount} randevu</strong> onayınızı bekliyor
          </span>
          <span className={styles.pendingBannerArrow}>Onaylara git →</span>
        </a>
      )}

      {/* ── Quick stat cards ── */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCardToday}`}>
          <div className={styles.statCardTop}>
            <span className={styles.statIcon}>📅</span>
            <p className={styles.statLabel}>Bugünkü Randevular</p>
          </div>
          <p className={styles.statValue}>{todayCount}</p>
          <p className={styles.statHint}>bugün</p>
        </div>

        <div className={`${styles.statCard} ${pendingCount > 0 ? styles.statCardWarn : ''}`}>
          <div className={styles.statCardTop}>
            <span className={styles.statIcon}>⏳</span>
            <p className={styles.statLabel}>Onay Bekleyen</p>
          </div>
          <p className={pendingCount > 0 ? styles.statValueWarning : styles.statValue}>
            {pendingCount}
          </p>
          <p className={styles.statHint}>{pendingCount > 0 ? 'onay gerekiyor' : 'bekleyen yok'}</p>
        </div>

        <div className={`${styles.statCard} ${styles.statCardPlan}`}>
          <div className={styles.statCardTop}>
            <span className={styles.statIcon}>✨</span>
            <p className={styles.statLabel}>Aktif Plan</p>
          </div>
          <p className={styles.statPlan}>{planConfig.label}</p>
          <p className={styles.statHint}>
            <a href="/settings" className={styles.statHintLink}>planı gör →</a>
          </p>
        </div>
      </div>

      {/* ── Analytics section ── */}
      <AnalyticsSection supabase={supabase} businessId={business.id} />
    </div>
  )
}
