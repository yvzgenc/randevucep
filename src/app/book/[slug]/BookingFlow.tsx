'use client'
import React, { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Service, StaffMember, Business, Appointment } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from './booking.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type BusySlot = Pick<
  Appointment,
  'appointment_date' | 'appointment_time' | 'staff_id' | 'duration_minutes'
>

interface Props {
  business:    Business
  services:    Service[]
  staff:       StaffMember[]
  busySlots:   BusySlot[]
  openingTime: string   // HH:MM
  closingTime: string   // HH:MM
  slotMinutes: number   // grid step in minutes
}

type Step = 'service' | 'staff' | 'datetime' | 'contact' | 'done'

interface BookingState {
  service: Service | null
  staff:   StaffMember | null
  date:    string
  time:    string
  name:    string
  phone:   string
  note:    string
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

/**
 * Generate slots from openingTime to closingTime.
 * Slots are spaced by slotMinutes but a slot is only shown when the
 * full service duration fits before closingTime.
 */
function generateSlots(
  opening: string,
  closing: string,
  slotStep: number,
  serviceDuration: number,
): string[] {
  const start = timeToMin(opening)
  const end   = timeToMin(closing)
  const slots: string[] = []
  for (let t = start; t + serviceDuration <= end; t += slotStep) {
    const h = Math.floor(t / 60).toString().padStart(2, '0')
    const m = (t % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

/**
 * True if the candidate slot overlaps any existing appointment for this staff.
 * Uses the real duration_minutes from each existing appointment.
 */
function overlaps(
  busySlots: BusySlot[],
  date:      string,
  slotTime:  string,
  staffId:   number,
  serviceDuration: number,
): boolean {
  const newStart = timeToMin(slotTime)
  const newEnd   = newStart + serviceDuration

  return busySlots.some((b) => {
    if (b.appointment_date !== date) return false
    if (b.staff_id !== staffId)      return false

    const bStart = timeToMin(b.appointment_time)
    const bEnd   = bStart + (b.duration_minutes ?? 30)  // fallback only for legacy rows

    // Overlap: intervals [newStart,newEnd) and [bStart,bEnd) intersect
    return newStart < bEnd && newEnd > bStart
  })
}

/** Returns next `count` calendar days starting from tomorrow as YYYY-MM-DD. */
function upcomingDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'short',
    day:     'numeric',
    month:   'short',
  })
}

// ─── Step indicator ───────────────────────────────────────────────────────────

const STEP_META: { key: Step; label: string }[] = [
  { key: 'service',  label: 'Hizmet'   },
  { key: 'staff',    label: 'Personel' },
  { key: 'datetime', label: 'Tarih'    },
  { key: 'contact',  label: 'İletişim' },
]

function StepBar({ current }: { current: Step }) {
  const idx = STEP_META.findIndex((s) => s.key === current)
  return (
    <div className={styles.stepBar}>
      {STEP_META.map((s, i) => (
        <div
          key={s.key}
          className={[
            styles.stepItem,
            i <  idx ? styles.stepDone   : '',
            i === idx ? styles.stepActive : '',
          ].filter(Boolean).join(' ')}
        >
          <div className={styles.stepDot}>{i < idx ? '✓' : i + 1}</div>
          <span className={styles.stepLabel}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BookingFlow({
  business,
  services,
  staff,
  busySlots,
  openingTime,
  closingTime,
  slotMinutes,
}: Props) {
  const [step, setStep] = useState<Step>('service')
  const [booking, setBooking] = useState<BookingState>({
    service: null, staff: null,
    date: '', time: '',
    name: '', phone: '', note: '',
  })
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Pre-compute all slots for selected service (changes only when service changes)
  const allSlots = useMemo(
    () =>
      booking.service
        ? generateSlots(openingTime, closingTime, slotMinutes, booking.service.duration_minutes)
        : [],
    [booking.service, openingTime, closingTime, slotMinutes],
  )

  // Available slots for selected date (filters out overlaps)
  const slotsForDate = useMemo(() => {
    if (!booking.date || !booking.staff || !booking.service) return []
    return allSlots.filter(
      (t) => !overlaps(busySlots, booking.date, t, booking.staff!.id, booking.service!.duration_minutes),
    )
  }, [allSlots, booking.date, booking.staff, booking.service, busySlots])

  const dates = useMemo(() => upcomingDates(30), [])

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const { service, staff: selectedStaff, date, time, name, phone, note } = booking
    if (!service || !selectedStaff || !date || !time) return

    const trimName  = name.trim()
    const trimPhone = phone.trim()
    if (!trimName || !trimPhone) return

    setSubmitting(true)
    setSubmitError(null)

    const supabase = createClient()

    // Call DB-level booking function (handles overlap check + insert atomically)
    const { data, error } = await supabase.rpc('book_appointment', {
      p_business_id:      business.id,
      p_service_id:       service.id,
      p_service_name:     service.service_name,
      p_service_duration: service.duration_minutes,
      p_staff_id:         selectedStaff.id,
      p_staff_name:       selectedStaff.full_name,
      p_customer_name:    trimName,
      p_customer_phone:   trimPhone,
      p_date:             date,
      p_time:             time,
      p_price:            service.price,
      p_notes:            note.trim() || null,
    })

    if (error) {
      setSubmitError('Randevu oluşturulamadı: ' + error.message)
      setSubmitting(false)
      return
    }

    // The RPC returns { error: string } on conflict, or { appointment_id: number } on success
    const result = data as { error?: string; appointment_id?: number }
    if (result?.error) {
      setSubmitError(result.error)
      setSubmitting(false)
      return
    }

    setStep('done')
    setSubmitting(false)
  }

  // ── Done screen ───────────────────────────────────────────────────────────

  if (step === 'done') {
    return (
      <div className={styles.done}>
        <div className={styles.doneIcon}>✓</div>
        <h2 className={styles.doneTitle}>Randevunuz Alındı!</h2>
        <div className={styles.doneSummary}>
          <p><strong>{booking.service?.service_name}</strong></p>
          <p>{booking.staff?.full_name}</p>
          <p>{booking.date ? formatDate(booking.date) : ''} — {booking.time}</p>
          <p>{booking.name} · {booking.phone}</p>
        </div>
        <p className={styles.doneNote}>
          İşletme sizi onaylayacak.{' '}
          {business.phone ? (
            <>
              Değişiklik için{' '}
              <a href={`tel:${business.phone}`} className={styles.doneLink}>
                {business.phone}
              </a>
              {' '}numarasını arayabilirsiniz.
            </>
          ) : null}
        </p>
        <Button
          variant="secondary"
          onClick={() => {
            setStep('service')
            setBooking({ service: null, staff: null, date: '', time: '', name: '', phone: '', note: '' })
          }}
        >
          Yeni Randevu Al
        </Button>
      </div>
    )
  }

  // ── Wizard steps ──────────────────────────────────────────────────────────

  return (
    <div>
      <StepBar current={step} />

      {/* ── Step 1: Service ── */}
      {step === 'service' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Hizmet Seçin</h2>
          {services.length === 0 ? (
            <p className={styles.empty}>Bu işletmede henüz aktif hizmet bulunmuyor.</p>
          ) : (
            <div className={styles.cardGrid}>
              {services.map((svc) => (
                <button
                  key={svc.id}
                  className={[
                    styles.optionCard,
                    booking.service?.id === svc.id ? styles.selected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    setBooking((b) => ({ ...b, service: svc, staff: null, date: '', time: '' }))
                    setStep('staff')
                  }}
                >
                  <span className={styles.optionName}>{svc.service_name}</span>
                  <span className={styles.optionMeta}>
                    {svc.duration_minutes} dk · ₺{Number(svc.price).toFixed(0)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Staff ── */}
      {step === 'staff' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Personel Seçin</h2>
          {staff.length === 0 ? (
            <p className={styles.empty}>Bu işletmede henüz aktif personel bulunmuyor.</p>
          ) : (
            <div className={styles.cardGrid}>
              {staff.map((s) => (
                <button
                  key={s.id}
                  className={[
                    styles.optionCard,
                    booking.staff?.id === s.id ? styles.selected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    setBooking((b) => ({ ...b, staff: s, date: '', time: '' }))
                    setStep('datetime')
                  }}
                >
                  <span className={styles.staffAvatar}>
                    {s.full_name.charAt(0).toUpperCase()}
                  </span>
                  <span className={styles.optionName}>{s.full_name}</span>
                  {s.title ? (
                    <span className={styles.optionMeta}>{s.title}</span>
                  ) : null}
                </button>
              ))}
            </div>
          )}
          <button className={styles.backLink} onClick={() => setStep('service')}>
            ← Geri
          </button>
        </div>
      )}

      {/* ── Step 3: Date / Time ── */}
      {step === 'datetime' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Tarih ve Saat Seçin</h2>

          <div className={styles.dateScroll}>
            {dates.map((d) => (
              <button
                key={d}
                className={[
                  styles.dateChip,
                  booking.date === d ? styles.dateSelected : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setBooking((b) => ({ ...b, date: d, time: '' }))}
              >
                {formatDate(d)}
              </button>
            ))}
          </div>

          {booking.date && (
            <>
              <p className={styles.slotLabel}>Uygun Saatler</p>
              {slotsForDate.length === 0 ? (
                <p className={styles.empty}>Bu tarihte uygun saat kalmadı.</p>
              ) : (
                <div className={styles.slotGrid}>
                  {slotsForDate.map((t) => (
                    <button
                      key={t}
                      className={[
                        styles.slotChip,
                        booking.time === t ? styles.slotSelected : '',
                      ].filter(Boolean).join(' ')}
                      onClick={() => setBooking((b) => ({ ...b, time: t }))}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <div className={styles.stepActions}>
            <button className={styles.backLink} onClick={() => setStep('staff')}>
              ← Geri
            </button>
            <Button
              disabled={!booking.date || !booking.time}
              onClick={() => setStep('contact')}
            >
              Devam Et →
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Contact ── */}
      {step === 'contact' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>İletişim Bilgileri</h2>

          <div className={styles.summaryBox}>
            <p className={styles.summaryRow}>
              <span className={styles.summaryKey}>Hizmet</span>
              <span>{booking.service?.service_name} ({booking.service?.duration_minutes} dk)</span>
            </p>
            <p className={styles.summaryRow}>
              <span className={styles.summaryKey}>Personel</span>
              <span>{booking.staff?.full_name}</span>
            </p>
            <p className={styles.summaryRow}>
              <span className={styles.summaryKey}>Tarih</span>
              <span>{booking.date ? formatDate(booking.date) : ''}</span>
            </p>
            <p className={styles.summaryRow}>
              <span className={styles.summaryKey}>Saat</span>
              <span>{booking.time}</span>
            </p>
            <p className={styles.summaryRow}>
              <span className={styles.summaryKey}>Fiyat</span>
              <span>₺{Number(booking.service?.price ?? 0).toFixed(0)}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.contactForm}>
            <Input
              label="Ad Soyad *"
              id="name"
              value={booking.name}
              onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))}
              placeholder="Ayşe Yılmaz"
              required
            />
            <Input
              label="Telefon *"
              id="phone"
              type="tel"
              value={booking.phone}
              onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
              placeholder="0532 000 00 00"
              required
            />
            <Input
              label="Not (isteğe bağlı)"
              id="note"
              value={booking.note}
              onChange={(e) => setBooking((b) => ({ ...b, note: e.target.value }))}
              placeholder="Varsa özel isteğiniz..."
            />

            {submitError ? (
              <p className={styles.errorMsg}>{submitError}</p>
            ) : null}

            <div className={styles.stepActions}>
              <button
                type="button"
                className={styles.backLink}
                onClick={() => setStep('datetime')}
              >
                ← Geri
              </button>
              <Button type="submit" loading={submitting}>
                Randevu Al
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
