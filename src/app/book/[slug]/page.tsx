import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BookingFlow } from './BookingFlow'
import { getPlanConfig } from '@/lib/plans'
import type { Appointment, BusinessSettings } from '@/types/database'
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

const DEFAULT_SETTINGS: Pick<BusinessSettings, 'opening_time' | 'closing_time' | 'slot_minutes'> = {
  opening_time: '09:00',
  closing_time: '18:00',
  slot_minutes: 30,
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

  // Check online booking enabled for this plan
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan_name')
    .eq('business_id', business.id)
    .maybeSingle()

  const planConfig = getPlanConfig(subscription?.plan_name)

  if (!planConfig.online_booking_enabled) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.bizName}>{business.name}</div>
        </header>
        <main className={styles.main}>
          <div className={styles.closedBox}>
            <p className={styles.closedTitle}>Online Rezervasyon Kapalı</p>
            <p className={styles.closedDesc}>
              Bu işletme şu an online rezervasyona kapalı.
              {business.phone ? ` Randevu için ${business.phone} numarasını arayabilirsiniz.` : ''}
            </p>
          </div>
        </main>
        <footer className={styles.footer}>
          <span>📅 RandevuCep ile çalışmaktadır</span>
        </footer>
      </div>
    )
  }

  const today  = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const [
    { data: services },
    { data: staffList },
    { data: busy },
    { data: settingsRow },
  ] = await Promise.all([
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
    supabase
      .from('appointments')
      .select('appointment_date, appointment_time, staff_id, duration_minutes')
      .eq('business_id', business.id)
      .in('status', ['Bekliyor', 'Onaylı', 'pending', 'confirmed'])
      .gte('appointment_date', today)
      .lte('appointment_date', future),
    supabase
      .from('business_settings')
      .select('opening_time, closing_time, slot_minutes')
      .eq('business_id', business.id)
      .maybeSingle(),
  ])

  const settings = settingsRow ?? DEFAULT_SETTINGS

  type BusySlot = Pick<
    Appointment,
    'appointment_date' | 'appointment_time' | 'staff_id' | 'duration_minutes'
  >
  const busySlots: BusySlot[] = busy ?? []

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
        <BookingFlow
          business={business}
          services={services ?? []}
          staff={staffList ?? []}
          busySlots={busySlots}
          openingTime={settings.opening_time}
          closingTime={settings.closing_time}
          slotMinutes={settings.slot_minutes}
        />
      </main>

      <footer className={styles.footer}>
        <span>📅 RandevuCep ile çalışmaktadır</span>
      </footer>
    </div>
  )
}
