'use client'

import React, { useState, useMemo, useTransition } from 'react'
import { cancelAppointment, rescheduleAppointment } from './actions'
import styles from './manage.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BusySlot {
  appointment_date: string
  appointment_time: string
  staff_id:         number | null
  duration_minutes: number
}

interface ApptData {
  id:               number
  customer_name:    string
  customer_email:   string | null
  customer_phone:   string
  service_name:     string
  service_id:       number | null
  staff_id:         number | null
  staff_name:       string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  price:            number | null
  status:           string | null
  cancel_token:     string
}

interface Props {
  token:       string
  appt:        ApptData
  bizName:     string
  bizPhone:    string | null
  bizSlug:     string
  openingTime: string
  closingTime: string
  slotMinutes: number
  busySlots:   BusySlot[]
}

type View = 'detail' | 'reschedule' | 'done'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function generateSlots(opening: string, closing: string, step: number, duration: number): string[] {
  const start = timeToMin(opening)
  const end   = timeToMin(closing)
  const slots: string[] = []
  for (let t = start; t + duration <= end; t += step) {
    const h = Math.floor(t / 60).toString().padStart(2, '0')
    const m = (t % 60).toString().padStart(2, '0')
    slots.push(`${h}:${m}`)
  }
  return slots
}

function isBusy(
  busySlots: BusySlot[], date: string, time: string,
  staffId: number | null, duration: number,
): boolean {
  const newStart = timeToMin(time)
  const newEnd   = newStart + duration
  return busySlots.some((b) => {
    if (b.appointment_date !== date) return false
    if (staffId != null && b.staff_id !== staffId) return false
    const bStart = timeToMin(b.appointment_time)
    const bEnd   = bStart + (b.duration_minutes ?? 30)
    return newStart < bEnd && newEnd > bStart
  })
}

function upcomingDates(count: number): string[] {
  const today = new Date()
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i + 1)
    return d.toISOString().split('T')[0]
  })
}

const TR_DAY  = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
const TR_DAYS_FULL = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar']

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function chipParts(iso: string) {
  const d   = new Date(iso + 'T00:00:00')
  const dow = d.getDay()  // 0=Sun
  const idx = dow === 0 ? 6 : dow - 1
  return { day: TR_DAY[idx], num: d.getDate(), month: d.toLocaleDateString('tr-TR', { month: 'short' }) }
}

// ─── Status guard ─────────────────────────────────────────────────────────────

function isTerminal(status: string | null): boolean {
  return ['İptal', 'Tamamlandı', 'Gelmedi'].includes(status ?? '')
}

function isPast(date: string, time: string): boolean {
  const apptMs = new Date(`${date}T${time}:00`).getTime()
  return apptMs < Date.now()
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ appt, bizName }: { appt: ApptData; bizName: string }) {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryCardTitle}>Randevu Detayları</div>
      {([
        ['İşletme',  bizName],
        ['Hizmet',   appt.service_name],
        ['Personel', appt.staff_name],
        ['Tarih',    fmtDate(appt.appointment_date)],
        ['Saat',     appt.appointment_time],
        ['Süre',     `${appt.duration_minutes} dakika`],
        ...(appt.price != null ? [['Fiyat', `₺${Number(appt.price).toFixed(0)}`] as [string, string]] : []),
      ] as [string, string][]).map(([k, v]) => (
        <div key={k} className={styles.summaryRow}>
          <span className={styles.summaryKey}>{k}</span>
          <span className={styles.summaryVal}>{v}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ManageFlow({
  token, appt, bizName, bizPhone, bizSlug,
  openingTime, closingTime, slotMinutes, busySlots,
}: Props) {
  const [view,       setView]       = useState<View>('detail')
  const [doneMsg,    setDoneMsg]    = useState('')
  const [doneAction, setDoneAction] = useState<'canceled' | 'rescheduled'>('canceled')
  const [error,      setError]      = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [pending,    startTransition] = useTransition()

  // Reschedule state
  const [selDate, setSelDate] = useState('')
  const [selTime, setSelTime] = useState('')

  const dates = useMemo(() => upcomingDates(30), [])

  const allSlots = useMemo(
    () => generateSlots(openingTime, closingTime, slotMinutes, appt.duration_minutes),
    [openingTime, closingTime, slotMinutes, appt.duration_minutes],
  )

  const freeSlots = useMemo(() => {
    if (!selDate) return []
    return allSlots.filter(
      (t) => !isBusy(busySlots, selDate, t, appt.staff_id, appt.duration_minutes)
    )
  }, [allSlots, selDate, busySlots, appt.staff_id, appt.duration_minutes])

  const terminal = isTerminal(appt.status)
  const past     = isPast(appt.appointment_date, appt.appointment_time)
  const canAct   = !terminal && !past

  // ── Cancel ────────────────────────────────────────────────────────────────
  function handleCancel() {
    setError(null)
    startTransition(async () => {
      const res = await cancelAppointment({
        token,
        customerName:  appt.customer_name,
        customerEmail: appt.customer_email,
        bizName,
        bizPhone,
        serviceName:   appt.service_name,
        apptDate:      fmtDate(appt.appointment_date),
        apptTime:      appt.appointment_time,
      })
      if (!res.ok) { setError(res.error ?? 'İptal sırasında hata oluştu.'); return }
      setDoneAction('canceled')
      setDoneMsg('Randevunuz iptal edildi.')
      setView('done')
    })
  }

  // ── Reschedule ────────────────────────────────────────────────────────────
  function handleReschedule() {
    if (!selDate || !selTime) return
    setError(null)
    startTransition(async () => {
      const res = await rescheduleAppointment({
        token,
        newDate:       selDate,
        newTime:       selTime,
        customerName:  appt.customer_name,
        customerEmail: appt.customer_email,
        bizName,
        bizPhone,
        serviceName:   appt.service_name,
      })
      if (!res.ok) { setError(res.error ?? 'Değişiklik başarısız.'); return }
      setDoneAction('rescheduled')
      setDoneMsg(`Randevunuz ${fmtDate(selDate)} – ${selTime} olarak değiştirildi.`)
      setView('done')
    })
  }

  // ── Done screen ───────────────────────────────────────────────────────────
  if (view === 'done') {
    const icon = doneAction === 'canceled' ? '✕' : '✓'
    const iconCls = doneAction === 'canceled' ? styles.doneIconCancel : styles.doneIconOk
    return (
      <div className={styles.doneWrap}>
        <div className={`${styles.doneIcon} ${iconCls}`}>{icon}</div>
        <h2 className={styles.doneTitle}>
          {doneAction === 'canceled' ? 'Randevu İptal Edildi' : 'Randevu Değiştirildi'}
        </h2>
        <p className={styles.doneMsg}>{doneMsg}</p>
        {appt.customer_email && (
          <p className={styles.doneNote}>
            Onay e-postası <strong>{appt.customer_email}</strong> adresine gönderildi.
          </p>
        )}
        {bizSlug && (
          <a href={`/book/${bizSlug}`} className={styles.newBookingBtn}>
            + Yeni Randevu Al
          </a>
        )}
      </div>
    )
  }

  // ── Reschedule view ───────────────────────────────────────────────────────
  if (view === 'reschedule') {
    return (
      <div>
        <button className={styles.backBtn} onClick={() => { setView('detail'); setError(null) }}>
          ← Geri
        </button>
        <h2 className={styles.sectionTitle}>Yeni Tarih &amp; Saat Seçin</h2>
        <p className={styles.sectionDesc}>Mevcut randevunuz: {fmtDate(appt.appointment_date)} – {appt.appointment_time}</p>

        {/* Date chips */}
        <div className={styles.dateScroll}>
          {dates.map((d) => {
            const { day, num, month } = chipParts(d)
            return (
              <button
                key={d}
                className={`${styles.dateChip} ${selDate === d ? styles.dateChipSel : ''}`}
                onClick={() => { setSelDate(d); setSelTime('') }}
              >
                <span className={styles.chipDay}>{day}</span>
                <span className={styles.chipNum}>{num}</span>
                <span className={styles.chipMonth}>{month}</span>
              </button>
            )
          })}
        </div>

        {/* Time slots */}
        {selDate && (
          <>
            <p className={styles.slotLabel}>
              {fmtDate(selDate)} — Uygun Saatler
            </p>
            {freeSlots.length === 0 ? (
              <p className={styles.slotEmpty}>Bu tarihte uygun saat kalmadı. Başka bir gün seçin.</p>
            ) : (
              <div className={styles.slotGrid}>
                {freeSlots.map((t) => (
                  <button
                    key={t}
                    className={`${styles.slotChip} ${selTime === t ? styles.slotChipSel : ''}`}
                    onClick={() => setSelTime(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {error && <p className={styles.errorMsg}>{error}</p>}

        <div className={styles.actionRow}>
          <button
            className={styles.primaryBtn}
            disabled={!selDate || !selTime || pending}
            onClick={handleReschedule}
          >
            {pending ? 'Kaydediliyor…' : 'Randevuyu Değiştir'}
          </button>
        </div>
      </div>
    )
  }

  // ── Detail view (default) ─────────────────────────────────────────────────
  return (
    <div>
      <h2 className={styles.sectionTitle}>Merhaba, {appt.customer_name}</h2>
      <p className={styles.sectionDesc}>Aşağıdaki randevunuzu yönetebilirsiniz.</p>

      <SummaryCard appt={appt} bizName={bizName} />

      {/* Status badge if terminal/past */}
      {terminal && (
        <div className={styles.statusBanner}>
          <span className={styles.statusBannerIcon}>ℹ</span>
          Bu randevu <strong>{appt.status}</strong> durumunda — değişiklik yapılamaz.
        </div>
      )}
      {!terminal && past && (
        <div className={styles.statusBanner}>
          <span className={styles.statusBannerIcon}>ℹ</span>
          Bu randevu geçmişte kaldı — değişiklik yapılamaz.
        </div>
      )}

      {error && <p className={styles.errorMsg}>{error}</p>}

      {/* Action buttons */}
      {canAct && (
        <div className={styles.actions}>
          <button
            className={styles.rescheduleBtn}
            onClick={() => { setView('reschedule'); setError(null) }}
            disabled={pending}
          >
            📅 Tarih / Saat Değiştir
          </button>

          {!showCancel ? (
            <button
              className={styles.cancelTriggerBtn}
              onClick={() => setShowCancel(true)}
              disabled={pending}
            >
              ✕ Randevuyu İptal Et
            </button>
          ) : (
            <div className={styles.cancelConfirm}>
              <p className={styles.cancelConfirmText}>
                Bu randevuyu iptal etmek istediğinizden emin misiniz?
              </p>
              <div className={styles.cancelConfirmRow}>
                <button
                  className={styles.cancelConfirmYes}
                  onClick={handleCancel}
                  disabled={pending}
                >
                  {pending ? 'İptal ediliyor…' : 'Evet, İptal Et'}
                </button>
                <button
                  className={styles.cancelConfirmNo}
                  onClick={() => setShowCancel(false)}
                  disabled={pending}
                >
                  Vazgeç
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {bizPhone && (
        <p className={styles.helpText}>
          Yardım için <a href={`tel:${bizPhone}`} className={styles.helpLink}>{bizPhone}</a> numarasını arayabilirsiniz.
        </p>
      )}
    </div>
  )
}
