import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Customer } from '@/types/database'
import styles from './customers.module.css'

export const metadata: Metadata = { title: 'Müşteriler' }

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) redirect('/onboarding')

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business.id)
    .order('full_name')

  const list: Customer[] = customers ?? []

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Müşteriler</h1>
        <span className={styles.count}>{list.length} müşteri</span>
      </div>

      {list.length === 0 ? (
        <div className={styles.empty}>
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
            <div key={c.id} className={styles.tableRow}>
              <span className={styles.primary}>{c.full_name}</span>
              <span className={styles.muted}>{c.phone}</span>
              <span className={styles.muted}>{c.email ?? '—'}</span>
              <span className={styles.muted}>{c.visit_count ?? 0}</span>
              <span className={styles.muted}>
                {c.last_visit_at
                  ? new Date(c.last_visit_at).toLocaleDateString('tr-TR')
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
