import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/types/database'
import type { PlanName }       from '@/lib/plans'
import { getPlanConfig, isInTrial, trialDaysRemaining } from '@/lib/plans'
import {
  fmtDate,
  fmtDatetime,
  fmtAmount,
  fmtBillingPeriod,
  fmtProvider,
  subscriptionStatusDisplay,
  paymentStatusDisplay,
} from '@/lib/formatters'
import styles from './billing.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type Supabase = SupabaseClient<Database>

type SubRow = Database['public']['Tables']['subscriptions']['Row']
type PayRow = Database['public']['Tables']['payments']['Row']

// ─── Badge helper ─────────────────────────────────────────────────────────────

type BadgeVariant = 'active' | 'trial' | 'warning' | 'error' | 'neutral'

function variantClass(v: BadgeVariant): string {
  const map: Record<BadgeVariant, string> = {
    active:  styles.badgeActive,
    trial:   styles.badgeTrial,
    warning: styles.badgeWarning,
    error:   styles.badgeError,
    neutral: styles.badgeNeutral,
  }
  return map[v]
}

// ─── Subscription summary card ────────────────────────────────────────────────

interface SubCardProps {
  sub:      SubRow | null
  planName: PlanName
}

function SubscriptionCard({ sub, planName }: SubCardProps) {
  const cfg     = getPlanConfig(planName)
  const inTrial = isInTrial(sub?.trial_ends_at ?? null)
  const trialDays = trialDaysRemaining(sub?.trial_ends_at ?? null)

  if (!sub) {
    return (
      <div className={styles.emptyState}>
        <p>Abonelik bilgisi bulunamadı.</p>
        <p style={{ marginTop: 8, fontSize: 12 }}>
          Yeni kayıt olduktan sonra aboneliğiniz otomatik oluşturulur.
        </p>
      </div>
    )
  }

  const statusDisp = subscriptionStatusDisplay(sub.status, inTrial)

  // Derive display values — explicit null guards before every field
  const billingPeriod = fmtBillingPeriod(sub.billing_period)

  const trialEndsLabel  = inTrial && sub.trial_ends_at != null
    ? `${fmtDate(sub.trial_ends_at)} (${trialDays ?? 0} gün kaldı)`
    : sub.trial_ends_at != null
      ? `${fmtDate(sub.trial_ends_at)} (Süresi doldu)`
      : '—'

  const renewalLabel = sub.ends_at != null ? fmtDate(sub.ends_at) : '—'
  const startedLabel = sub.started_at != null ? fmtDate(sub.started_at) : '—'

  const limitChips: { label: string; value: string }[] = [
    {
      label: 'Personel',
      value: cfg.max_staff === -1 ? 'Sınırsız' : String(cfg.max_staff),
    },
    {
      label: 'Hizmet',
      value: cfg.max_services === -1 ? 'Sınırsız' : String(cfg.max_services),
    },
    {
      label: 'Aylık Randevu',
      value: cfg.monthly_appointments === -1 ? 'Sınırsız' : String(cfg.monthly_appointments),
    },
    {
      label: 'Online Rezervasyon',
      value: cfg.online_booking_enabled ? 'Açık' : 'Kapalı',
    },
  ]

  return (
    <div className={styles.subCard}>
      <div className={styles.subHeader}>
        <span className={styles.subPlanName}>{cfg.label}</span>
        <span className={`${styles.badge} ${variantClass(statusDisp.variant)}`}>
          {statusDisp.label}
        </span>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>Faturalama</span>
          <span className={styles.detailValue}>{billingPeriod}</span>
        </div>

        {sub.trial_ends_at != null && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Deneme Bitiş</span>
            <span className={inTrial ? styles.detailValue : styles.detailValueMuted}>
              {trialEndsLabel}
            </span>
          </div>
        )}

        {sub.ends_at != null && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Yenileme Tarihi</span>
            <span className={styles.detailValue}>{renewalLabel}</span>
          </div>
        )}

        {sub.started_at != null && (
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Başlangıç</span>
            <span className={styles.detailValueMuted}>{startedLabel}</span>
          </div>
        )}
      </div>

      <div className={styles.limitRow}>
        {limitChips.map((chip) => (
          <div key={chip.label} className={styles.limitChip}>
            <span className={styles.limitChipLabel}>{chip.label}:</span>
            <span className={styles.limitChipValue}>{chip.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Payment history table ────────────────────────────────────────────────────

// Column template CSS var value
const PAY_COLS = '120px 80px 90px 90px 80px 100px'

interface PaymentTableProps {
  payments: PayRow[]
}

function PaymentTable({ payments }: PaymentTableProps) {
  if (payments.length === 0) {
    return (
      <div className={styles.tableWrap}>
        <div className={styles.emptyPayments}>
          Henüz ödeme geçmişi bulunmuyor.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <div
        className={styles.tableHeader}
        style={{ ['--pay-cols' as string]: PAY_COLS }}
      >
        <span>Tarih</span>
        <span>Sağlayıcı</span>
        <span>Plan</span>
        <span>Tutar</span>
        <span>Durum</span>
        <span>Ödeme Tarihi</span>
      </div>

      {payments.map((p) => {
        const statusDisp = paymentStatusDisplay(p.status)

        // Explicit null guards for nullable fields
        const providerRef = p.provider_payment_id ?? p.provider_conversation_id ?? null
        const paidAtLabel  = p.paid_at != null ? fmtDatetime(p.paid_at) : '—'
        const createdLabel = fmtDatetime(p.created_at)
        const amountLabel  = fmtAmount(p.amount, p.currency)
        const planLabel    = getPlanConfig(p.plan_name).label

        // Show failure reason from payload if available
        let failureReason: string | null = null
        if (p.status === 'failed' && p.payload_json != null) {
          const raw = p.payload_json
          const detail = typeof raw === 'object' && raw !== null && 'detail' in raw
            ? (raw as Record<string, unknown>).detail
            : null
          const detailObj = typeof detail === 'object' && detail !== null ? detail as Record<string, unknown> : null
          const msg = detailObj?.['errorMessage']
                   ?? (raw as Record<string, unknown>)['errorMessage']
                   ?? null
          if (typeof msg === 'string' && msg) {
            failureReason = msg
          }
        }

        return (
          <div
            key={p.id}
            className={styles.tableRow}
            style={{ ['--pay-cols' as string]: PAY_COLS }}
          >
            <div>
              <div className={styles.cellPrimary}>{createdLabel}</div>
              {providerRef != null && (
                <div className={styles.refCode}>{providerRef.slice(0, 20)}&hellip;</div>
              )}
            </div>
            <div className={styles.cellMuted}>{fmtProvider(p.provider)}</div>
            <div className={styles.cellPrimary}>{planLabel}</div>
            <div className={styles.cellPrimary}>{amountLabel}</div>
            <div>
              <span className={`${styles.badge} ${variantClass(statusDisp.variant)}`}>
                {statusDisp.label}
              </span>
              {failureReason != null && (
                <div className={styles.failureNote}>{failureReason}</div>
              )}
            </div>
            <div className={styles.cellMuted}>{paidAtLabel}</div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  supabase:   Supabase
  businessId: number
  planName:   PlanName
}

export async function BillingSection({ supabase, businessId, planName }: Props) {
  // Fetch subscription
  const { data: subData, error: subErr } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId)
    .maybeSingle()

  if (subErr) {
    console.error('[BillingSection] subscription fetch error:', subErr.message)
  }
  const sub: SubRow | null = subData ?? null

  // Fetch payment history — newest first, max 20 rows
  const { data: payData, error: payErr } = await supabase
    .from('payments')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (payErr) {
    console.error('[BillingSection] payments fetch error:', payErr.message)
  }
  const payments: PayRow[] = payData ?? []

  return (
    <>
      <SubscriptionCard sub={sub} planName={planName} />

      <div style={{ marginTop: 28 }}>
        <PaymentTable payments={payments} />
      </div>
    </>
  )
}
