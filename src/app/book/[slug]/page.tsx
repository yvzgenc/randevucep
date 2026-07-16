import type { Metadata }         from 'next'
import { notFound }              from 'next/navigation'
import { MapPin, Lock, Phone, Scissors, User, MessageCircle } from 'lucide-react'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { BookingFlow }           from './BookingFlow'
import { Icon }                  from '@/components/ui/Icon'
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
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroBrand}>
              <div className={styles.heroLogoMark}>
                {business.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className={styles.heroName}>{business.name}</h1>
                {business.city && (
                  <p className={styles.heroCity}><Icon icon={MapPin} size="xs" /> {business.city}</p>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className={styles.main}>
          <div className={styles.closedBox}>
            <div className={styles.closedIcon}><Icon icon={Lock} size={36} /></div>
            <p className={styles.closedTitle}>Online Rezervasyon Kapalı</p>
            <p className={styles.closedDesc}>
              Bu işletme şu an online rezervasyona kapalıdır.
              {business.phone
                ? ` Randevu almak için ${business.phone} numarasını arayabilirsiniz.`
                : ''}
            </p>
            {business.phone && (
              <a href={`tel:${business.phone}`} className={styles.callBtn}>
                <Icon icon={Phone} size="sm" /> Hemen Ara
              </a>
            )}
          </div>
        </main>
        <footer className={styles.footer}>
          <span>Powered by <strong>RandevuCep</strong></span>
        </footer>
      </div>
    )
  }

  const today  = new Date().toISOString().split('T')[0]
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [servicesQ, staffQ, busyQ, settingsQ, hoursQ, closuresQ, staffWdQ] = await Promise.all([
    supabase.from('services').select('*')
      .eq('business_id', business.id).eq('status', 'Aktif').order('service_name'),
    supabase.from('staff').select('*')
      .eq('business_id', business.id).eq('status', 'Aktif').order('full_name'),
    supabase.from('appointments')
      .select('appointment_date, appointment_time, staff_id, duration_minutes')
      .eq('business_id', business.id)
      .in('status', ['Bekliyor', 'Onaylı', 'pending', 'confirmed'])
      .gte('appointment_date', today)
      .lte('appointment_date', future),
    supabase.from('business_settings')
      .select('opening_time, closing_time, slot_minutes')
      .eq('business_id', business.id).maybeSingle(),
    supabase.from('business_hours').select('*').eq('business_id', business.id),
    supabase.from('business_closures').select('*')
      .eq('business_id', business.id)
      .gte('closed_date', today).lte('closed_date', future),
    supabase.from('staff_working_days').select('*').eq('business_id', business.id),
  ])

  const settings:      typeof DEFAULT_SETTINGS = settingsQ.data ?? DEFAULT_SETTINGS
  const businessHours: BusinessHour[]          = hoursQ.data ?? []
  const closures:      BusinessClosure[]       = closuresQ.data ?? []
  const staffWd:       StaffWorkingDay[]       = staffWdQ.data ?? []

  type BusySlot = Pick<Appointment, 'appointment_date' | 'appointment_time' | 'staff_id' | 'duration_minutes'>
  const busySlots: BusySlot[] = busyQ.data ?? []

  const serviceCount = servicesQ.data?.length ?? 0
  const staffCount   = staffQ.data?.length ?? 0

  return (
    <div className={styles.page}>
      {/* ── Hero header ── */}
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroBrand}>
            <div className={styles.heroLogoMark}>
              {business.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className={styles.heroName}>{business.name}</h1>
              {business.city && (
                <p className={styles.heroCity}><Icon icon={MapPin} size="xs" /> {business.city}</p>
              )}
            </div>
          </div>

          <p className={styles.heroWelcome}>
            Hoş geldiniz! Online randevu sistemiyle kolayca randevu alabilirsiniz.
          </p>

          <div className={styles.heroMeta}>
            {serviceCount > 0 && (
              <span className={styles.heroMetaChip}><Icon icon={Scissors} size="xs" /> {serviceCount} hizmet</span>
            )}
            {staffCount > 0 && (
              <span className={styles.heroMetaChip}><Icon icon={User} size="xs" /> {staffCount} uzman</span>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className={styles.heroMetaChip}>
                <Icon icon={Phone} size="xs" /> {business.phone}
              </a>
            )}
            {business.whatsapp_number && (
              <a
                href={`https://wa.me/${business.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className={`${styles.heroMetaChip} ${styles.heroWhatsapp}`}
              >
                <Icon icon={MessageCircle} size="xs" /> WhatsApp
              </a>
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
        <span>Powered by <strong>RandevuCep</strong></span>
      </footer>
    </div>
  )
}
