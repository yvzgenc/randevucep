import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  PLANS,
  PLAN_NAMES,
  getPlanConfig,
  toPlanName,
  trialDaysRemaining,
  isInTrial,
} from '@/lib/plans'
import styles from './settings.module.css'

export const metadata: Metadata = { title: 'Ayarlar' }

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', business.id)
    .maybeSingle()

  const currentPlan  = toPlanName(subscription?.plan_name)
  const planConfig   = getPlanConfig(currentPlan)
  const trialDays    = trialDaysRemaining(subscription?.trial_ends_at ?? null)
  const inTrial      = isInTrial(subscription?.trial_ends_at ?? null)

  return (
    <div>
      <h1 className={styles.title}>Ayarlar &amp; Plan</h1>

      {/* Current plan card */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Mevcut Plan</h2>
        <div className={styles.currentPlanCard}>
          <div className={styles.planMeta}>
            <span className={styles.planBadge}>{planConfig.label}</span>
            {inTrial && trialDays !== null && (
              <span className={styles.trialBadge}>
                Deneme — {trialDays} gün kaldı
              </span>
            )}
            {!inTrial && trialDays === 0 && (
              <span className={styles.expiredBadge}>Deneme süresi doldu</span>
            )}
          </div>
          <p className={styles.planDesc}>{planConfig.description}</p>
          <div className={styles.limitGrid}>
            <div className={styles.limitItem}>
              <span className={styles.limitLabel}>Personel</span>
              <span className={styles.limitValue}>
                {planConfig.max_staff === -1 ? 'Sınırsız' : planConfig.max_staff}
              </span>
            </div>
            <div className={styles.limitItem}>
              <span className={styles.limitLabel}>Hizmet</span>
              <span className={styles.limitValue}>
                {planConfig.max_services === -1 ? 'Sınırsız' : planConfig.max_services}
              </span>
            </div>
            <div className={styles.limitItem}>
              <span className={styles.limitLabel}>Aylık Randevu</span>
              <span className={styles.limitValue}>
                {planConfig.monthly_appointments === -1 ? 'Sınırsız' : planConfig.monthly_appointments}
              </span>
            </div>
            <div className={styles.limitItem}>
              <span className={styles.limitLabel}>Online Rezervasyon</span>
              <span className={styles.limitValue}>
                {planConfig.online_booking_enabled ? '✓ Açık' : '✗ Kapalı'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Plan comparison / upgrade */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Planlar</h2>
        <div className={styles.planGrid}>
          {PLAN_NAMES.map((planKey) => {
            const cfg       = PLANS[planKey]
            const isCurrent = planKey === currentPlan
            return (
              <div
                key={planKey}
                className={[
                  styles.planCard,
                  isCurrent      ? styles.planCardCurrent     : '',
                  cfg.highlighted ? styles.planCardHighlighted : '',
                ].filter(Boolean).join(' ')}
              >
                {cfg.highlighted && (
                  <div className={styles.popularBadge}>Popüler</div>
                )}
                <div className={styles.planCardHeader}>
                  <span className={styles.planCardLabel}>{cfg.label}</span>
                  <span className={styles.planCardPrice}>
                    {cfg.price_try === 0 ? 'Ücretsiz' : `₺${cfg.price_try}/ay`}
                  </span>
                </div>
                <p className={styles.planCardDesc}>{cfg.description}</p>
                <ul className={styles.planFeatures}>
                  <li>
                    {cfg.max_staff === -1 ? 'Sınırsız' : cfg.max_staff} personel
                  </li>
                  <li>
                    {cfg.max_services === -1 ? 'Sınırsız' : cfg.max_services} hizmet
                  </li>
                  <li>
                    {cfg.monthly_appointments === -1
                      ? 'Sınırsız randevu'
                      : `Aylık ${cfg.monthly_appointments} randevu`}
                  </li>
                  <li>
                    {cfg.online_booking_enabled
                      ? '✓ Online rezervasyon'
                      : '✗ Online rezervasyon yok'}
                  </li>
                </ul>
                {isCurrent ? (
                  <div className={styles.currentLabel}>Mevcut planınız</div>
                ) : (
                  <div className={styles.upgradeNote}>
                    Yakında — iletişim için{' '}
                    <a
                      href="mailto:destek@randevucep.com"
                      className={styles.contactLink}
                    >
                      bize yazın
                    </a>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
