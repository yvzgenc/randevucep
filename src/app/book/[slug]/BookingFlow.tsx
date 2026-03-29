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
  businessHours:    BusinessHour[]
  closedDates:      string[]
  staffWorkingDays: StaffWorkingDay[]
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

function generateSlots(opening: string, closing: string, slotStep: number, serviceDuration: number): string[] {
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

function overlaps(busySlots: BusySlot[], date: string, slotTime: string, staffId: number, serviceDuration: number): boolean {
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

function formatDateFull(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function getDow(isoDate: string): number {
  return new Date(isoDate + 'T00:00:00').getDay()
}

function getHoursForDate(date: string, hours: BusinessHour[], globalOpen: string, globalClose: string): { opening: string; closing: string } | null {
  const dow = getDow(date)
  const row = hours.find((h) => h.dow === dow)
  if (row) {
    if (!row.is_open) return null
    return { opening: row.opening_time ?? globalOpen, closing: row.closing_time ?? globalClose }
  }
  return { opening: globalOpen, closing: globalClose }
}

function staffWorksOnDate(staffId: number, date: string, staffWd: StaffWorkingDay[]): boolean {
  const dow  = getDow(date)
  const rows = staffWd.filter((r) => r.staff_id === staffId)
  if (rows.length === 0) return true
  const row = rows.find((r) => r.dow === dow)
  return row ? row.is_working : true
}

// ─── Step bar ─────────────────────────────────────────────────────────────────

const STEP_META: { key: Step; label: string; icon: string }[] = [
  { key: 'service',  label: 'Hizmet',   icon: '✂'  },
  { key: 'staff',    label: 'Uzman',    icon: '👤' },
  { key: 'datetime', label: 'Tarih',    icon: '📅' },
  { key: 'contact',  label: 'İletişim', icon: '✍'  },
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
          <div className={styles.stepDot}>
            {i < idx ? '✓' : <span className={styles.stepDotIcon}>{s.icon}</span>}
          </div>
          <span className={styles.stepLabel}>{s.label}</span>
        </div>
      ))}
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

  const dates = useMemo(() => {
    const all = upcomingDates(30)
    return all.filter((d) => {
      if (closedDates.includes(d)) return false
      const hrs = getHoursForDate(d, businessHours, openingTime, closingTime)
      if (!hrs) return false
      if (booking.staff && !staffWorksOnDate(booking.staff.id, d, staffWorkingDays)) return false
      return true
    })
  }, [closedDates, businessHours, openingTime, closingTime, booking.staff, staffWorkingDays])

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
        <div className={styles.doneConfetti}>🎉</div>
        <div className={styles.doneIconWrap}>
          <span className={styles.doneCheckmark}>✓</span>
        </div>
        <h2 className={styles.doneTitle}>Randevunuz Alındı!</h2>
        <p className={styles.doneSubtitle}>
          <strong>{business.name}</strong> en kısa sürede sizi onaylayacak.
        </p>

        <div className={styles.doneSummary}>
          <div className={styles.doneSummaryHeader}>Randevu Detayları</div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>✂ Hizmet</span>
            <span className={styles.doneSummaryVal}>{booking.service?.service_name}</span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>👤 Uzman</span>
            <span className={styles.doneSummaryVal}>{booking.staff?.full_name}</span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>📅 Tarih</span>
            <span className={styles.doneSummaryVal}>
              {booking.date ? formatDateFull(booking.date) : ''}
            </span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>🕐 Saat</span>
            <span className={styles.doneSummaryVal}>{booking.time}</span>
          </div>
          <div className={styles.doneSummaryRow}>
            <span className={styles.doneSummaryKey}>💰 Fiyat</span>
            <span className={styles.doneSummaryVal}>₺{Number(booking.service?.price ?? 0).toFixed(0)}</span>
          </div>
        </div>

        {business.phone && (
          <p className={styles.doneContact}>
            Soru veya iptal için{' '}
            <a href={`tel:${business.phone}`} className={styles.doneLink}>{business.phone}</a>
            {' '}arayabilirsiniz.
          </p>
        )}

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

      <div className={styles.cancelRow}>
        {step !== 'service' && (
          <button className={styles.cancelBtn} onClick={handleCancel} type="button">
            ✕ Sıfırla
          </button>
        )}
      </div>

      {/* ── Hizmet seç ── */}
      {step === 'service' && (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Hangi hizmeti istiyorsunuz?</h2>
            <p className={styles.stepSubtitle}>Size en uygun hizmeti seçin</p>
          </div>
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
                  <div className={styles.optionDetails}>
                    <span className={styles.optionDuration}>⏱ {svc.duration_minutes} dk</span>
                    <span className={styles.optionPrice}>₺{Number(svc.price).toFixed(0)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Personel seç ── */}
      {step === 'staff' && (
        <div className={styles.stepContent}>
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Uzman seçin</h2>
            <p className={styles.stepSubtitle}>
              {booking.service?.service_name} için hizmet verecek uzmanı seçin
            </p>
          </div>
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
                  {s.title && <span className={styles.optionMeta}>{s.title}</span>}
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
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Ne zaman geleceksiniz?</h2>
            <p className={styles.stepSubtitle}>Uygun bir tarih ve saat seçin</p>
          </div>

          {dates.length === 0 ? (
            <p className={styles.empty}>Uygun randevu günü bulunamadı.</p>
          ) : (
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
          )}

          {booking.date && (
            <>
              <p className={styles.slotLabel}>
                {formatDateFull(booking.date)} — Uygun Saatler
              </p>
              {slotsForDate.length === 0 ? (
                <p className={styles.empty}>Bu tarihte uygun saat kalmadı. Başka bir gün seçin.</p>
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
          <div className={styles.stepHeader}>
            <h2 className={styles.stepTitle}>Neredeyse tamam!</h2>
            <p className={styles.stepSubtitle}>Bilgilerinizi girerek randevunuzu onaylayın</p>
          </div>

          {/* Seçim özeti */}
          <div className={styles.summaryBox}>
            <div className={styles.summaryHeader}>
              <span className={styles.summaryHeaderIcon}>📋</span>
              Randevu Özeti
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Hizmet</span>
              <span className={styles.summaryVal}>
                {booking.service?.service_name}
                <span className={styles.summaryMeta}> · {booking.service?.duration_minutes} dk</span>
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Uzman</span>
              <span className={styles.summaryVal}>{booking.staff?.full_name}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Tarih</span>
              <span className={styles.summaryVal}>{booking.date ? formatDateFull(booking.date) : ''}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryKey}>Saat</span>
              <span className={styles.summaryVal}>{booking.time}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.summaryRowPrice}`}>
              <span className={styles.summaryKey}>Toplam</span>
              <span className={styles.summaryPrice}>₺{Number(booking.service?.price ?? 0).toFixed(0)}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className={styles.contactForm}>
            <Input label="Ad Soyad *" id="name" value={booking.name}
              onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))}
              placeholder="Ayşe Yılmaz" required />
            <Input label="Telefon *" id="phone" type="tel" value={booking.phone}
              onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
              placeholder="0532 000 00 00" required />
            <Input label="E-posta (isteğe bağlı)" id="email" type="email" value={booking.email}
              onChange={(e) => setBooking((b) => ({ ...b, email: e.target.value }))}
              placeholder="ornek@mail.com" />
            <Input label="Notunuz (isteğe bağlı)" id="note" value={booking.note}
              onChange={(e) => setBooking((b) => ({ ...b, note: e.target.value }))}
              placeholder="Varsa özel isteğiniz..." />
            {submitError && <p className={styles.errorMsg}>⚠ {submitError}</p>}
            <div className={styles.stepActions}>
              <button type="button" className={styles.backLink} onClick={() => setStep('datetime')}>← Geri</button>
              <Button type="submit" loading={submitting}>🎯 Randevuyu Onayla</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
