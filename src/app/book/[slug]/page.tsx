import type { Metadata }         from 'next'
import { notFound }              from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BookingFlow }           from './BookingFlow'
import { getPlanConfig }         from '@/lib/plans'
import type { Appointment, BusinessSettings, BusinessHour, BusinessClosure, StaffWorkingDay } from '@/types/database'
import styles from './booking.module.css'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const bizQ = await supabase
    .from('businesses')
    .select('name')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()
  return { title: bizQ.data ? `${bizQ.data.name} — Randevu Al` : 'Randevu Al' }
}

const DEFAULT_SETTINGS: Pick<BusinessSettings, 'opening_time' | 'closing_time' | 'slot_minutes'> = {
  opening_time: '09:00',
  closing_time: '18:00',
  slot_minutes: 30,
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const bizQ = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!bizQ.data) notFound()
  const business = bizQ.data

  const subQ = await supabase
    .from('subscriptions')
    .select('plan_name')
    .eq('business_id', business.id)
    .maybeSingle()

  const planConfig = getPlanConfig(subQ.data?.plan_name)

  if (!planConfig.online_booking_enabled) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.bizBrand}>
            <div className={styles.bizLogoMark}>📅</div>
            <span className={styles.bizName}>{business.name}</span>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.closedBox}>
            <div className={styles.closedIcon}>🔒</div>
            <p className={styles.closedTitle}>Online Rezervasyon Kapalı</p>
            <p className={styles.closedDesc}>
              Bu işletme şu an online rezervasyona kapalıdır.
              {business.phone ? ` Randevu için ${business.phone} numarasını arayabilirsiniz.` : ''}
            </p>
          </div>
        </main>
        <footer className={styles.footer}><span>📅 RandevuCep ile çalışmaktadır</span></footer>
      </div>
    )
  }

  const today  = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [servicesQ, staffQ, busyQ, settingsQ, hoursQ, closuresQ, staffWdQ] = await Promise.all([
    supabase
      .from('services').select('*')
      .eq('business_id', business.id).eq('status', 'Aktif').order('service_name'),
    supabase
      .from('staff').select('*')
      .eq('business_id', business.id).eq('status', 'Aktif').order('full_name'),
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
      .eq('business_id', business.id).maybeSingle(),
    supabase
      .from('business_hours')
      .select('*')
      .eq('business_id', business.id),
    supabase
      .from('business_closures')
      .select('*')
      .eq('business_id', business.id)
      .gte('closed_date', today)
      .lte('closed_date', future),
    supabase
      .from('staff_working_days')
      .select('*')
      .eq('business_id', business.id),
  ])

  const settings:      typeof DEFAULT_SETTINGS   = settingsQ.data ?? DEFAULT_SETTINGS
  const businessHours: BusinessHour[]            = hoursQ.data ?? []
  const closures:      BusinessClosure[]         = closuresQ.data ?? []
  const staffWd:       StaffWorkingDay[]         = staffWdQ.data ?? []

  type BusySlot = Pick<Appointment, 'appointment_date' | 'appointment_time' | 'staff_id' | 'duration_minutes'>
  const busySlots: BusySlot[] = busyQ.data ?? []

  const metaParts: string[] = []
  if (business.city)  metaParts.push(`📍 ${business.city}`)
  if (business.phone) metaParts.push(`📞 ${business.phone}`)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.bizBrand}>
          <div className={styles.bizLogoMark}>📅</div>
          <div>
            <div className={styles.bizName}>{business.name}</div>
            {metaParts.length > 0 && (
              <div className={styles.bizMeta}>
                {metaParts.map((p, i) => (
                  <span key={p}>
                    {i > 0 && <span className={styles.bizMetaDot} />}
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <BookingFlow
          business={business}
          services={servicesQ.data ?? []}
          staff={staffQ.data ?? []}
          busySlots={busySlots}
          businessHours={businessHours}
          closedDates={closures.map((c) => c.closed_date)}
          staffWorkingDays={staffWd}
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
