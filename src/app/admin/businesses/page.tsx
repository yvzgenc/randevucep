import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getBusinessTypeConfig } from '@/lib/businessTypes'
import { getPlanConfig, isInTrial, trialDaysRemaining } from '@/lib/plans'
import { Icon } from '@/components/ui/Icon'
import styles from '../admin.module.css'

export const metadata: Metadata = { title: 'Admin — İşletmeler' }

// CSS column template — shared between header and rows via CSS var injected inline
const COLS = '2fr 1.2fr 1.8fr 90px 110px 120px 80px'

function SubBadge({
  status,
  trialEndsAt,
}: {
  status:       string | null
  trialEndsAt:  string | null
}) {
  if (!status) {
    return <span className={`${styles.badge} ${styles.badgeNone}`}>—</span>
  }
  if (status === 'canceled') {
    return <span className={`${styles.badge} ${styles.badgeCanceled}`}>İptal</span>
  }
  if (status === 'past_due') {
    return <span className={`${styles.badge} ${styles.badgePastDue}`}>Gecikmiş</span>
  }
  if (status === 'active' && isInTrial(trialEndsAt)) {
    const days = trialDaysRemaining(trialEndsAt)
    return (
      <span className={`${styles.badge} ${styles.badgeTrial}`}>
        Trial {days}g
      </span>
    )
  }
  return <span className={`${styles.badge} ${styles.badgeActive}`}>Aktif</span>
}

function PlanLabel({ plan }: { plan: string | null }) {
  const cfg = getPlanConfig(plan)
  const cls =
    plan === 'pro'      ? styles.planPro :
    plan === 'business' ? styles.planBusiness :
    styles.planStarter
  return <span className={cls}>{cfg.label}</span>
}

export default async function AdminBusinessesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: rows, error } = await supabase.rpc('admin_list_businesses')

  if (error) {
    return (
      <div>
        <h1 className={styles.pageTitle}>İşletmeler</h1>
        <p className={styles.errorMsg}>Veri yüklenemedi: {error.message}</p>
      </div>
    )
  }

  const businesses = rows ?? []

  return (
    <div>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>İşletmeler</h1>
          <p className={styles.pageDesc}>{businesses.length} kayıtlı işletme</p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        {businesses.length === 0 ? (
          <div className={styles.empty}>Henüz hiç işletme yok.</div>
        ) : (
          <>
            <div
              className={styles.tableHeader}
              style={{ ['--admin-cols' as string]: COLS }}
            >
              <span>İşletme</span>
              <span>Tür</span>
              <span>Sahibi</span>
              <span>Plan</span>
              <span>Durum</span>
              <span>Trial Bitiş</span>
              <span>Kayıt</span>
            </div>
            {businesses.map((b) => {
              const typeCfg = getBusinessTypeConfig(b.business_type)
              return (
                <Link
                  key={b.id}
                  href={`/admin/businesses/${b.id}`}
                  className={styles.tableRow}
                  style={{ ['--admin-cols' as string]: COLS }}
                >
                  <span>
                    <div className={styles.cellPrimary}>{b.name}</div>
                    <div className={styles.cellMuted}>{b.slug}</div>
                  </span>
                  <span className={styles.cellMuted}>
                    <Icon icon={typeCfg.icon} size="sm" /> {typeCfg.label}
                  </span>
                  <span className={styles.cellMuted}>
                    {b.owner_email ?? '—'}
                  </span>
                  <span>
                    <PlanLabel plan={b.plan_name} />
                  </span>
                  <span>
                    <SubBadge
                      status={b.sub_status}
                      trialEndsAt={b.trial_ends_at}
                    />
                  </span>
                  <span className={styles.cellMuted}>
                    {b.trial_ends_at
                      ? new Date(b.trial_ends_at).toLocaleDateString('tr-TR')
                      : '—'}
                  </span>
                  <span className={styles.cellMuted}>
                    {b.created_at
                      ? new Date(b.created_at).toLocaleDateString('tr-TR')
                      : '—'}
                  </span>
                </Link>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
