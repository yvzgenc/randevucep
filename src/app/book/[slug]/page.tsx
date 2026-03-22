import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import styles from './booking.module.css'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  return {
    title: business ? `${business.name} — Randevu Al` : 'Randevu Al',
  }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!business) notFound()

  const [{ data: services }, { data: staffList }] = await Promise.all([
    supabase
      .from('services')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'Aktif')
      .order('service_name'),
    supabase
      .from('staff')
      .select('*')
      .eq('business_id', business.id)
      .eq('status', 'Aktif')
      .order('full_name'),
  ])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.bizName}>{business.name}</div>
        {business.city ? (
          <div className={styles.bizMeta}>📍 {business.city}</div>
        ) : null}
        {business.phone ? (
          <div className={styles.bizMeta}>📞 {business.phone}</div>
        ) : null}
      </header>

      <main className={styles.main}>
        <div className={styles.placeholder}>
          <p className={styles.placeholderTitle}>Çevrimiçi Rezervasyon</p>
          <p className={styles.placeholderDesc}>
            Rezervasyon akışı FAZ 2&apos;de eklenecek.
            <br />
            {services?.length ?? 0} hizmet · {staffList?.length ?? 0} personel mevcut.
          </p>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>✂ SalonCep ile çalışmaktadır</span>
      </footer>
    </div>
  )
}
