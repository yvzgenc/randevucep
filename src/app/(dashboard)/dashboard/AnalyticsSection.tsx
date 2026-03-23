import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database }       from '@/types/database'
import {
  countByStatus,
  topServices,
  topStaff,
  trendLast7Days,
  lastNDates,
  todayISO,
  weekStartISO,
  monthStartISO,
  type AppointmentRow,
} from '@/lib/analytics'
import styles from './analytics.module.css'

type Supabase = SupabaseClient<Database>

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  variant = 'default',
}: {
  label:   string
  value:   number
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  const valClass = {
    default: styles.statValue,
    accent:  `${styles.statValue} ${styles.statValueAccent}`,
    success: `${styles.statValue} ${styles.statValueSuccess}`,
    warning: `${styles.statValue} ${styles.statValueWarning}`,
    danger:  `${styles.statValue} ${styles.statValueDanger}`,
  }[variant]

  return (
    <div className={styles.statCard}>
      <p className={styles.statLabel}>{label}</p>
      <p className={valClass}>{value}</p>
    </div>
  )
}

interface CountByKey { key: string; count: number }

function RankList({ items, emptyText }: { items: CountByKey[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className={styles.trendEmpty}>{emptyText}</p>
  }
  const max = items[0]?.count ?? 1
  return (
    <div className={styles.rankList}>
      {items.map((item, i) => (
        <div key={item.key} className={styles.rankItem}>
          <span className={styles.rankPos}>{i + 1}</span>
          <div className={styles.rankBarWrap}>
            <div className={styles.rankLabel}>{item.key}</div>
            <div className={styles.rankBar}>
              <div
                className={styles.rankBarFill}
                style={{ width: `${Math.round((item.count / max) * 100)}%` }}
              />
            </div>
          </div>
          <span className={styles.rankCount}>{item.count}</span>
        </div>
      ))}
    </div>
  )
}

type DotVariant = 'pending' | 'confirmed' | 'done' | 'canceled' | 'noShow'

const STATUS_ROWS: {
  label:   string
  dot:     DotVariant
  barColor: string
  key:     'bekliyor' | 'onaylı' | 'tamamlandı' | 'iptal' | 'gelmedi'
}[] = [
  { label: 'Bekliyor',    dot: 'pending',   barColor: 'var(--color-muted)',   key: 'bekliyor'   },
  { label: 'Onaylı',      dot: 'confirmed', barColor: 'var(--color-accent)',  key: 'onaylı'     },
  { label: 'Tamamlandı',  dot: 'done',      barColor: 'var(--color-success)', key: 'tamamlandı' },
  { label: 'İptal',       dot: 'canceled',  barColor: 'var(--color-danger)',  key: 'iptal'      },
  { label: 'Gelmedi',     dot: 'noShow',    barColor: 'var(--color-warning)', key: 'gelmedi'    },
]

const DOT_CLASS: Record<DotVariant, string> = {
  pending:   styles.dotPending,
  confirmed: styles.dotConfirmed,
  done:      styles.dotDone,
  canceled:  styles.dotCanceled,
  noShow:    styles.dotNoShow,
}

interface TrendDay { date: string; label: string; count: number }

function TrendChart({ days }: { days: TrendDay[] }) {
  const maxCount = Math.max(...days.map((d) => d.count), 1)
  const allZero  = days.every((d) => d.count === 0)

  if (allZero) {
    return <p className={styles.trendEmpty}>Son 7 günde randevu yok.</p>
  }

  return (
    <div className={styles.trendRow}>
      {days.map((d) => {
        const heightPct = Math.round((d.count / maxCount) * 100)
        return (
          <div key={d.date} className={styles.trendBar}>
            <div
              className={styles.trendBarFill}
              style={{ height: `${Math.max(heightPct, 4)}%` }}
            />
            <span className={styles.trendBarLabel}>{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  supabase:   Supabase
  businessId: number
}

export async function AnalyticsSection({ supabase, businessId }: Props) {
  const today      = todayISO()
  const weekStart  = weekStartISO()
  const monthStart = monthStartISO()
  const sevenDaysAgo = lastNDates(7)[0]   // oldest of the 7 days

  // ── Fetch all data in parallel (new query-object pattern) ─────────────────

  const [
    apptAllQ,
    apptWeekQ,
    apptMonthQ,
    apptTrendQ,
    customerQ,
    repeatQ,
  ] = await Promise.all([
    // All appointments for this business (used for status + service + staff analytics)
    supabase
      .from('appointments')
      .select('status, service_name, staff_name, appointment_date')
      .eq('business_id', businessId),

    // This week
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('appointment_date', weekStart)
      .lte('appointment_date', today),

    // This month
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gte('appointment_date', monthStart)
      .lte('appointment_date', today),

    // Last 7 days (for trend chart)
    supabase
      .from('appointments')
      .select('appointment_date')
      .eq('business_id', businessId)
      .gte('appointment_date', sevenDaysAgo)
      .lte('appointment_date', today),

    // Total customers
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId),

    // Repeat customers (visit_count > 1)
    supabase
      .from('customers')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId)
      .gt('visit_count', 1),
  ])

  // ── Process results with error guards ─────────────────────────────────────

  if (apptAllQ.error) {
    console.error('[AnalyticsSection] appointments fetch error:', apptAllQ.error.message)
  }

  // All appointments rows — typed via AppointmentRow
  const allRows: AppointmentRow[] = (apptAllQ.data ?? []).map((r) => ({
    status:           r.status,
    service_name:     r.service_name,
    staff_name:       r.staff_name,
    appointment_date: r.appointment_date,
  }))

  // Today count: filter from all rows (we already have them)
  const todayCount   = allRows.filter((r) => r.appointment_date === today).length
  const weekCount    = apptWeekQ.count    ?? 0
  const monthCount   = apptMonthQ.count   ?? 0
  const totalCust    = customerQ.count    ?? 0
  const repeatCust   = repeatQ.count      ?? 0

  // Aggregations
  const statusCounts = countByStatus(allRows)
  const services     = topServices(allRows)
  const staff        = topStaff(allRows)

  // Trend — use the trend-specific rows (last 7 days only)
  const trendRows: AppointmentRow[] = (apptTrendQ.data ?? []).map((r) => ({
    status:           null,
    service_name:     '',
    staff_name:       '',
    appointment_date: r.appointment_date,
  }))
  const trendDays = trendLast7Days(trendRows)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={styles.analyticsSection}>

      {/* ── Time-range stats ── */}
      <p className={styles.sectionTitle}>Randevu Özeti</p>
      <div className={styles.statGrid}>
        <StatCard label="Bugün"      value={todayCount}  variant="accent"  />
        <StatCard label="Bu Hafta"   value={weekCount}                      />
        <StatCard label="Bu Ay"      value={monthCount}                     />
        <StatCard label="Toplam"     value={allRows.length}                 />
      </div>

      {/* ── Status distribution ── */}
      <p className={styles.sectionTitle}>Durum Dağılımı</p>
      <div className={styles.statGrid}>
        <StatCard label="Bekliyor"   value={statusCounts.bekliyor}   variant="default" />
        <StatCard label="Onaylı"     value={statusCounts.onaylı}     variant="accent"  />
        <StatCard label="Tamamlandı" value={statusCounts.tamamlandı} variant="success" />
        <StatCard label="İptal"      value={statusCounts.iptal}      variant="danger"  />
        <StatCard label="Gelmedi"    value={statusCounts.gelmedi}    variant="warning" />
      </div>

      {/* ── Customer stats ── */}
      <p className={styles.sectionTitle}>Müşteri Metrikleri</p>
      <div className={styles.statGrid}>
        <StatCard label="Toplam Müşteri"   value={totalCust}  />
        <StatCard label="Tekrar Gelenler"  value={repeatCust} variant="success" />
      </div>

      {/* ── Two-column analytics row ── */}
      <p className={styles.sectionTitle}>Detay Analiz</p>
      <div className={styles.analyticsRow}>

        {/* Top services */}
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsCardTitle}>En Çok Alınan Hizmetler</p>
          <RankList items={services} emptyText="Henüz randevu verisi yok." />
        </div>

        {/* Top staff */}
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsCardTitle}>En Yoğun Personeller</p>
          <RankList items={staff} emptyText="Henüz randevu verisi yok." />
        </div>

      </div>

      {/* ── Trend + status side-by-side ── */}
      <div className={styles.analyticsRow} style={{ marginTop: 16 }}>

        {/* 7-day trend */}
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsCardTitle}>Son 7 Gün Trendi</p>
          <TrendChart days={trendDays} />
        </div>

        {/* Status distribution visual */}
        <div className={styles.analyticsCard}>
          <p className={styles.analyticsCardTitle}>Durum Dağılımı</p>
          {allRows.length === 0 ? (
            <p className={styles.trendEmpty}>Henüz randevu yok.</p>
          ) : (
            <div className={styles.statusGrid}>
              {STATUS_ROWS.map(({ label, dot, barColor, key }) => {
                const count = statusCounts[key]
                const pct   = allRows.length > 0
                  ? Math.round((count / allRows.length) * 100)
                  : 0
                return (
                  <div key={key} className={styles.statusRow}>
                    <span className={`${styles.statusDot} ${DOT_CLASS[dot]}`} />
                    <span className={styles.statusLabel}>{label}</span>
                    <div className={styles.statusBarWrap}>
                      <div
                        className={styles.statusBarFill}
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                    <span className={styles.statusCount}>{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
