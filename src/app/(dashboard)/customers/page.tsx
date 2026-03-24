import type { Metadata }              from 'next'
import Link                           from 'next/link'
import { redirect }                   from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Customer }              from '@/types/database'
import styles from './customers.module.css'

export const metadata: Metadata = { title: 'Müşteriler' }

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const bizQuery = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!bizQuery.data) redirect('/onboarding')
  const business = bizQuery.data

  const custQuery = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business.id)
    .order('last_visit_at', { ascending: false, nullsFirst: false })

  const list: Customer[] = custQuery.data ?? []

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Müşteriler</h1>
        {list.length > 0 && (
          <span className={styles.count}>{list.length} müşteri</span>
        )}
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.4 }}>👥</div>
          <p className={styles.emptyTitle}>Henüz müşteri yok</p>
          <p className={styles.emptyDesc}>
            Müşteriler, rezervasyon sayfanızdan randevu alındığında otomatik oluşturulur.
          </p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Ad Soyad</span>
            <span>Telefon</span>
            <span>E-posta</span>
            <span>Ziyaret</span>
            <span>Son Ziyaret</span>
          </div>
          {list.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className={styles.tableRowLink}
            >
              <span className={styles.primaryWithNote}>
                <span className={styles.primary}>{c.full_name}</span>
                {c.notes && (
                  <span className={styles.noteIndicator} title={c.notes}>📝</span>
                )}
              </span>
              <span className={styles.muted}>{c.phone}</span>
              <span className={styles.muted}>{c.email ?? '—'}</span>
              <span>
                <span className={
                  (c.visit_count ?? 0) > 1 ? styles.visitBadgeRepeat : styles.muted
                }>
                  {c.visit_count ?? 0}
                </span>
              </span>
              <span className={styles.muted}>
                {c.last_visit_at
                  ? new Date(c.last_visit_at).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
