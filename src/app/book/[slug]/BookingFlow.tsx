'use client'
import React, { useState, useMemo } from 'react'
import type { Service, StaffMember, Business, Appointment, BusinessHour, StaffWorkingDay } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Input }  from '@/components/ui/Input'
import { bookAppointment } from './actions'
import styles from './booking.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type BusySlot = Pick<
  Appointment,
  'appointment_date' | 'appointment_time' | 'staff_id' | 'duration_minutes'
>

interface Props {
  business:         Business
  services:         Service[]
  staff:            StaffMember[]
  busySlots:        BusySlot[]
  openingTime:      string
  closingTime:      string
  slotMinutes:      number
  // New: working hours & availability
  businessHours:    BusinessHour[]      // per-DOW overrides; empty = use openingTime/closingTime
  closedDates:      string[]            // ISO dates that are fully closed
  staffWorkingDays: StaffWorkingDay[]   // per-staff DOW overrides
}

type Step = 'service' | 'staff' | 'datetime' | 'contact' | 'done'

interface BookingState {
  service: Service | null
  staff:   StaffMember | null
  date:    string
  time:    string
  name:    string
  phone:   string
  email:   string
  note:    string
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

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
    const bEnd   = bStart + (b.duration_minutes ?? 30)
    return newStart < bEnd && newEnd > bStart
  })
}

function upcomingDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

/** JS getDay() returns 0=Sun…6=Sat — matches our DB dow convention */
function getDow(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00').getDay()
}

/**
 * Get effective opening/closing time for a given date.
 * business_hours rows override the global settings.opening_time/closing_time.
 * Returns null if business is closed that day.
 */
function getHoursForDate(
  date:         string,
  hours:        BusinessHour[],
  globalOpen:   string,
  globalClose:  string,
): { opening: string; closing: string } | null {
  const dow = getDow(date)
  const row = hours.find((h) => h.dow === dow)
  if (row) {
    if (!row.is_open) return null
    return {
      opening: row.opening_time ?? globalOpen,
      closing: row.closing_time ?? globalClose,
    }
  }
  // No row = use global (assumed open)
  return { opening: globalOpen, closing: globalClose }
}

/**
 * Returns true if staff works on the given date's day-of-week.
 * If no staff_working_days rows exist for this staff, assume they work every day.
 */
function staffWorksOnDate(
  staffId:  number,
  date:     string,
  staffWd:  StaffWorkingDay[],
): boolean {
  const dow  = getDow(date)
  const rows = staffWd.filter((r) => r.staff_id === staffId)
  if (rows.length === 0) return true  // no override = always works
  const row = rows.find((r) => r.dow === dow)
  return row ? row.is_working : true
}

// ─── Step bar ─────────────────────────────────────────────────────────────────

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

// ─── Cancel bar ──────────────────────────────────────────────────────────────
// Shown at top of every wizard step so user can bail out anytime

function CancelBar({ onCancel }: { onCancel: () => void }) {
  return (
    <div className={styles.cancelBar}>
      <button className={styles.cancelBtn} onClick={onCancel} type="button">
        ✕ Rezervasyonu İptal Et
      </button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const EMPTY_BOOKING: BookingState = {
  service: null, staff: null,
  date: '', time: '', name: '', phone: '', email: '', note: '',
}

export function BookingFlow({
  business, services, staff, busySlots,
  openingTime, closingTime, slotMinutes,
  businessHours, closedDates, staffWorkingDays,
}: Props) {
  const [step,        setStep]        = useState<Step>('service')
  const [booking,     setBooking]     = useState<BookingState>(EMPTY_BOOKING)
  const [submitting,  setSubmitting]  = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Dates that are open for the selected staff
  const dates = useMemo(() => {
    const all = upcomingDates(30)
    return all.filter((d) => {
      // 1. Fully closed by special closure
      if (closedDates.includes(d)) return false
      // 2. Check business_hours for this DOW
      const hrs = getHoursForDate(d, businessHours, openingTime, closingTime)
      if (!hrs) return false
      // 3. If staff selected, check staff working days
      if (booking.staff && !staffWorksOnDate(booking.staff.id, d, staffWorkingDays)) return false
      return true
    })
  }, [closedDates, businessHours, openingTime, closingTime, booking.staff, staffWorkingDays])

  // Slots for selected date — use per-day hours if available
  const allSlots = useMemo(() => {
    if (!booking.service || !booking.date) return []
    const hrs = getHoursForDate(booking.date, businessHours, openingTime, closingTime)
    if (!hrs) return []
    return generateSlots(hrs.opening, hrs.closing, slotMinutes, booking.service.duration_minutes)
  }, [booking.service, booking.date, businessHours, openingTime, closingTime, slotMinutes])

  const slotsForDate = useMemo(() => {
    if (!booking.date || !booking.staff || !booking.service) return []
    return allSlots.filter(
      (t) => !overlaps(busySlots, booking.date, t, booking.staff!.id, booking.service!.duration_minutes),
    )
  }, [allSlots, booking.date, booking.staff, booking.service, busySlots])

  function handleCancel() {
    setStep('service')
    setBooking(EMPTY_BOOKING)
    setSubmitError(null)
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { service, staff: selectedStaff, date, time, name, phone, email, note } = booking
    if (!service || !selectedStaff || !date || !time) return
    const trimName  = name.trim()
    const trimPhone = phone.trim()
    if (!trimName || !trimPhone) return

    setSubmitting(true)
    setSubmitError(null)

    const result = await bookAppointment({
      businessId:      business.id,
      serviceId:       service.id,
      serviceName:     service.service_name,
      serviceDuration: service.duration_minutes,
      staffId:         selectedStaff.id,
      staffName:       selectedStaff.full_name,
      customerName:    trimName,
      customerPhone:   trimPhone,
      date,
      time,
      price:           service.price,
      notes:           note.trim() || null,
      customerEmail:   email.trim() || null,
    })

    if (result.error) {
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
        <p className={styles.doneSubtitle}>
          İşletme en kısa sürede onaylayacak.
          {business.phone ? (
            <> Sorularınız için <a href={`tel:${business.phone}`} className={styles.doneLink}>{business.phone}</a> numarasını arayabilirsiniz.</>
          ) : null}
        </p>

        {/* Booking summary */}
        <div className={styles.doneSummary}>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>Hizmet</span>
            <span className={styles.doneSummaryVal}>{booking.service?.service_name}</span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>Personel</span>
            <span className={styles.doneSummaryVal}>{booking.staff?.full_name}</span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>Tarih &amp; Saat</span>
            <span className={styles.doneSummaryVal}>
              {booking.date ? formatDate(booking.date) : ''} — {booking.time}
            </span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>Müşteri</span>
            <span className={styles.doneSummaryVal}>{booking.name} · {booking.phone}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.doneActions}>
          <a href="/appointments" className={styles.doneActionBtn}>
            📅 Randevularıma Git
          </a>
          <a href="/dashboard" className={styles.doneActionBtnSecondary}>
            ◧ Dashboard&apos;a Git
          </a>
        </div>

        <button
          className={styles.doneNewBooking}
          onClick={() => { setStep('service'); setBooking(EMPTY_BOOKING) }}
        >
          + Yeni Randevu Al
        </button>
      </div>
    )
  }

  // ── Wizard steps ──────────────────────────────────────────────────────────

  return (
    <div>
      <StepBar current={step} />
      <CancelBar onCancel={handleCancel} />

      {/* ── Hizmet ── */}
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
                  className={[styles.optionCard, booking.service?.id === svc.id ? styles.selected : ''].filter(Boolean).join(' ')}
                  onClick={() => {
                    setBooking((b) => ({ ...b, service: svc, staff: null, date: '', time: '' }))
                    setStep('staff')
                  }}
                >
                  <span className={styles.optionName}>{svc.service_name}</span>
                  <span className={styles.optionMeta}>{svc.duration_minutes} dk</span>
                  <span className={styles.optionPrice}>₺{Number(svc.price).toFixed(0)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Personel ── */}
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
                  className={[styles.optionCard, booking.staff?.id === s.id ? styles.selected : ''].filter(Boolean).join(' ')}
                  onClick={() => {
                    setBooking((b) => ({ ...b, staff: s, date: '', time: '' }))
                    setStep('datetime')
                  }}
                >
                  <span className={styles.staffAvatar}>{s.full_name.charAt(0).toUpperCase()}</span>
                  <span className={styles.optionName}>{s.full_name}</span>
                  {s.title ? <span className={styles.optionMeta}>{s.title}</span> : null}
                </button>
              ))}
            </div>
          )}
          <div className={styles.stepActions}>
            <button className={styles.backLink} onClick={() => setStep('service')}>← Geri</button>
          </div>
        </div>
      )}

      {/* ── Tarih & Saat ── */}
      {step === 'datetime' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>Tarih ve Saat Seçin</h2>
          <div className={styles.dateScroll}>
            {dates.map((d) => {
              const dateObj = new Date(d + 'T00:00:00')
              const dayName = dateObj.toLocaleDateString('tr-TR', { weekday: 'short' })
              const dayNum  = dateObj.getDate()
              const month   = dateObj.toLocaleDateString('tr-TR', { month: 'short' })
              return (
                <button
                  key={d}
                  className={[styles.dateChip, booking.date === d ? styles.dateSelected : ''].filter(Boolean).join(' ')}
                  onClick={() => setBooking((b) => ({ ...b, date: d, time: '' }))}
                >
                  <span className={styles.dateChipDay}>{dayName}</span>
                  <span className={styles.dateChipNum}>{dayNum}</span>
                  <span className={styles.dateChipMonth}>{month}</span>
                </button>
              )
            })}
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
                      className={[styles.slotChip, booking.time === t ? styles.slotSelected : ''].filter(Boolean).join(' ')}
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
            <button className={styles.backLink} onClick={() => setStep('staff')}>← Geri</button>
            <Button disabled={!booking.date || !booking.time} onClick={() => setStep('contact')}>
              Devam Et →
            </Button>
          </div>
        </div>
      )}

      {/* ── İletişim & Onay ── */}
      {step === 'contact' && (
        <div className={styles.stepContent}>
          <h2 className={styles.stepTitle}>İletişim Bilgileri</h2>

          {/* Seçim özeti */}
          <div className={styles.summaryBox}>
            <p className={styles.summaryTitle}>Randevu Özeti</p>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Hizmet</span>
              <span className={styles.summaryVal}>{booking.service?.service_name} ({booking.service?.duration_minutes} dk)</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Personel</span>
              <span className={styles.summaryVal}>{booking.staff?.full_name}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Tarih</span>
              <span className={styles.summaryVal}>{booking.date ? formatDate(booking.date) : ''}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Saat</span>
              <span className={styles.summaryVal}>{booking.time}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Fiyat</span>
              <span className={styles.summaryVal}>₺{Number(booking.service?.price ?? 0).toFixed(0)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.contactForm}>
            <Input label="Ad Soyad *" id="name" value={booking.name}
              onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))}
              placeholder="Ayşe Yılmaz" required />
            <Input label="Telefon *" id="phone" type="tel" value={booking.phone}
              onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
              placeholder="0532 000 00 00" required />
            <Input label="E-posta (bildirim için)" id="email" type="email" value={booking.email}
              onChange={(e) => setBooking((b) => ({ ...b, email: e.target.value }))}
              placeholder="ornek@mail.com" />
            <Input label="Not (isteğe bağlı)" id="note" value={booking.note}
              onChange={(e) => setBooking((b) => ({ ...b, note: e.target.value }))}
              placeholder="Varsa özel isteğiniz..." />
            {submitError ? <p className={styles.errorMsg}>{submitError}</p> : null}
            <div className={styles.stepActions}>
              <button type="button" className={styles.backLink} onClick={() => setStep('datetime')}>← Geri</button>
              <Button type="submit" loading={submitting}>Randevu Al</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
