import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getBusinessTypeConfig } from '@/lib/businessTypes'
import { getPlanConfig, isInTrial, trialDaysRemaining } from '@/lib/plans'
import { Icon } from '@/components/ui/Icon'
import { EditForm } from './EditForm'
import styles from '../../admin.module.css'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return { title: `Admin — İşletme #${id}` }
}

function fmt(val: string | null | undefined): string {
  return val ?? '—'
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return '—'
  return new Date(val).toLocaleDateString('tr-TR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

function fmtDateTime(val: string | null | undefined): string {
  if (!val) return '—'
  return new Date(val).toLocaleString('tr-TR', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AdminBusinessDetailPage({ params }: Props) {
  const { id } = await params
  const numId = Number(id)

  if (!Number.isInteger(numId) || numId <= 0) notFound()

  const supabase = await createServerSupabaseClient()
  const { data: rows, error } = await supabase.rpc('admin_get_business', { p_id: numId })

  if (error || !rows || rows.length === 0) notFound()

  const b = rows[0]
  const typeCfg = getBusinessTypeConfig(b.business_type)
  const planCfg = getPlanConfig(b.plan_name)
  const inTrial  = isInTrial(b.trial_ends_at)
  const trialDays = trialDaysRemaining(b.trial_ends_at)

  // Derive subscription badge label
  let subLabel = '—'
  if (b.sub_status === 'canceled')  subLabel = 'İptal'
  else if (b.sub_status === 'past_due') subLabel = 'Gecikmiş'
  else if (b.sub_status === 'active' && inTrial)
    subLabel = `Trial (${trialDays} gün kaldı)`
  else if (b.sub_status === 'active') subLabel = 'Aktif'

  return (
    <div>
      {/* Back */}
      <Link href="/admin/businesses" className={styles.backLink}>
        ← İşletmeler
      </Link>

      {/* Page header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>
            <Icon icon={typeCfg.icon} size="lg" /> {b.name}
          </h1>
          <p className={styles.pageDesc}>
            {typeCfg.label} · #{b.id}
          </p>
        </div>
      </div>

      {/* Detail cards */}
      <div className={styles.detailGrid}>
        {/* Business info */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailCardTitle}>İşletme Bilgileri</h2>
          {([
            ['İsim',          b.name],
            ['Slug',          b.slug],
            ['Tür',           typeCfg.label],
            ['Şehir',         fmt(b.city)],
            ['Telefon',       fmt(b.phone)],
            ['Aktif',         b.is_active ? 'Evet' : 'Hayır'],
            ['Kayıt Tarihi',  fmtDateTime(b.created_at)],
          ] as [string, string][]).map(([key, val]) => (
            <div key={key} className={styles.detailRow}>
              <span className={styles.detailKey}>{key}</span>
              <span className={styles.detailVal}>{val}</span>
            </div>
          ))}
        </div>

        {/* Owner + subscription info */}
        <div className={styles.detailCard}>
          <h2 className={styles.detailCardTitle}>Sahibi &amp; Abonelik</h2>
          {([
            ['Sahibi E-posta', fmt(b.owner_email)],
            ['Owner ID',       b.owner_id ? b.owner_id.slice(0, 16) + '…' : '—'],
            ['Plan',           planCfg.label],
            ['Abonelik ID',    b.sub_id ? String(b.sub_id) : '—'],
            ['Durum',          subLabel],
            ['Trial Bitiş',    fmtDate(b.trial_ends_at)],
            ['Dönem Bitiş',    fmtDate(b.ends_at)],
            ['Faturalama',     fmt(b.billing_period)],
          ] as [string, string][]).map(([key, val]) => (
            <div key={key} className={styles.detailRow}>
              <span className={styles.detailKey}>{key}</span>
              <span className={styles.detailVal}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan limits */}
      <div className={styles.detailCard} style={{ marginBottom: 16 }}>
        <h2 className={styles.detailCardTitle}>Mevcut Plan Limitleri</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {([
            ['Personel',         planCfg.max_staff === -1          ? 'Sınırsız' : String(planCfg.max_staff)],
            ['Hizmet',           planCfg.max_services === -1       ? 'Sınırsız' : String(planCfg.max_services)],
            ['Aylık Randevu',    planCfg.monthly_appointments === -1 ? 'Sınırsız' : String(planCfg.monthly_appointments)],
            ['Online Rezervasyon', planCfg.online_booking_enabled  ? 'Açık'   : 'Kapalı'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className={styles.statCard}>
              <p className={styles.statLabel}>{label}</p>
              <p style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable controls */}
      <EditForm
        businessId={b.id}
        currentPlan={b.plan_name}
        currentStatus={b.sub_status}
        hasSubscription={b.sub_id !== null}
      />
    </div>
  )
}
