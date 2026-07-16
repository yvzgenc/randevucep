'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import type { Appointment } from '@/types/database'
import { AppointmentActions } from './AppointmentActions'
import { Icon } from '@/components/ui/Icon'
import styles from './calendar.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  appointments: Appointment[]
}

interface PopupState {
  appt: Appointment
  x:    number
  y:    number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8)  // 08:00 – 21:00
const TR_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const STAFF_COLORS = [
  styles.staff0, styles.staff1, styles.staff2,
  styles.staff3, styles.staff4, styles.staff5,
]
const LEGEND_COLORS = [
  '#6c5ce7', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()           // 0=Sun
  const diff = day === 0 ? -6 : 1 - day   // Monday as week start
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toISO(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function timeToHour(hhmm: string): number {
  const [h] = hhmm.split(':').map(Number)
  return h
}

function fmtDateRange(start: Date): string {
  const end = addDays(start, 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  const s = start.toLocaleDateString('tr-TR', opts)
  const e = end.toLocaleDateString('tr-TR', { ...opts, year: 'numeric' })
  return `${s} – ${e}`
}

function buildStaffColorMap(appointments: Appointment[]): Map<string, number> {
  const names = [...new Set(appointments.map((a) => a.staff_name).filter(Boolean))]
  const map = new Map<string, number>()
  names.forEach((name, i) => map.set(name, i % STAFF_COLORS.length))
  return map
}

function statusOverlay(status: string | null): string {
  if (status === 'İptal' || status === 'Gelmedi') return styles.statusCanceled
  if (status === 'Tamamlandı') return styles.statusDone
  return ''
}

// ─── Popup ────────────────────────────────────────────────────────────────────

function ApptPopup({
  appt,
  x,
  y,
  onClose,
}: {
  appt:    Appointment
  x:       number
  y:       number
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Keep popup inside viewport
  const safeX = Math.min(x, window.innerWidth  - 260)
  const safeY = Math.min(y, window.innerHeight - 280)

  const dateObj = new Date(appt.appointment_date + 'T00:00:00')
  const dateFmt = dateObj.toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return (
    <div
      ref={ref}
      className={styles.popup}
      style={{ left: safeX, top: safeY }}
    >
      <button className={styles.popupClose} onClick={onClose}><Icon icon={X} size="xs" /></button>
      <p className={styles.popupName}>{appt.customer_name}</p>
      <p className={styles.popupTime}>{dateFmt} · {appt.appointment_time} ({appt.duration_minutes} dk)</p>
      <div className={styles.popupRows}>
        <div className={styles.popupRow}>
          <span className={styles.popupKey}>Hizmet</span>
          <span className={styles.popupVal}>{appt.service_name}</span>
        </div>
        <div className={styles.popupRow}>
          <span className={styles.popupKey}>Personel</span>
          <span className={styles.popupVal}>{appt.staff_name}</span>
        </div>
        <div className={styles.popupRow}>
          <span className={styles.popupKey}>Telefon</span>
          <span className={styles.popupVal}>{appt.customer_phone}</span>
        </div>
        {appt.price != null && (
          <div className={styles.popupRow}>
            <span className={styles.popupKey}>Fiyat</span>
            <span className={styles.popupVal}>₺{Number(appt.price).toFixed(0)}</span>
          </div>
        )}
        <div className={styles.popupRow}>
          <span className={styles.popupKey}>Durum</span>
          <span className={styles.popupVal}>{appt.status ?? 'Bekliyor'}</span>
        </div>
      </div>
      {/* Status actions inline */}
      <div style={{ marginTop: 12, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
        <AppointmentActions
          appointmentId={appt.id}
          currentStatus={appt.status}
          savedEmail={appt.customer_email ?? null}
        />
      </div>
    </div>
  )
}

// ─── Calendar view ────────────────────────────────────────────────────────────

export function CalendarView({ appointments }: Props) {
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const [popup,     setPopup]     = useState<PopupState | null>(null)

  const staffColors = buildStaffColorMap(appointments)
  const today       = toISO(new Date())

  // 7 days of the current week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Index: date string → appointments for that date+hour
  const apptIndex = new Map<string, Appointment[]>()
  for (const appt of appointments) {
    const hour = timeToHour(appt.appointment_time)
    if (hour < 8 || hour > 21) continue
    const key = `${appt.appointment_date}__${hour}`
    const list = apptIndex.get(key) ?? []
    list.push(appt)
    apptIndex.set(key, list)
  }

  function goBack()    { setWeekStart((w) => addDays(w, -7)) }
  function goForward() { setWeekStart((w) => addDays(w,  7)) }
  function goToday()   { setWeekStart(getWeekStart(new Date())) }

  const handleChipClick = useCallback((e: React.MouseEvent, appt: Appointment) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopup({ appt, x: rect.left + window.scrollX + 4, y: rect.bottom + window.scrollY + 4 })
  }, [])

  // Count per day for header badge
  const dayCount = (day: Date) => {
    const iso = toISO(day)
    return appointments.filter((a) => a.appointment_date === iso).length
  }

  // Staff legend (only staff active in this week's appointments)
  const weekIsos = weekDays.map(toISO)
  const weekStaff = [...new Set(
    appointments
      .filter((a) => weekIsos.includes(a.appointment_date))
      .map((a) => a.staff_name)
  )]

  return (
    <div>
      {/* ── Navigation ── */}
      <div className={styles.calHeader}>
        <div className={styles.calNav}>
          <button className={styles.navBtn} onClick={goBack}  aria-label="Önceki hafta">‹</button>
          <span className={styles.weekLabel}>{fmtDateRange(weekStart)}</span>
          <button className={styles.navBtn} onClick={goForward} aria-label="Sonraki hafta">›</button>
        </div>
        <button className={styles.todayBtn} onClick={goToday}>Bu Hafta</button>
      </div>

      {/* ── Staff legend ── */}
      {weekStaff.length > 0 && (
        <div className={styles.staffLegend}>
          {weekStaff.map((name) => {
            const idx = staffColors.get(name) ?? 0
            return (
              <div key={name} className={styles.legendItem}>
                <span
                  className={styles.legendDot}
                  style={{ background: LEGEND_COLORS[idx] }}
                />
                {name}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Grid ── */}
      <div className={styles.calGrid}>
        {/* Header row */}
        <div className={styles.calGridHead}>
          <div className={styles.timeGutter} />
          {weekDays.map((day, i) => {
            const iso     = toISO(day)
            const isToday = iso === today
            const count   = dayCount(day)
            return (
              <div
                key={iso}
                className={`${styles.dayCol} ${i >= 3 ? styles.hideMobile : ''}`}
              >
                <div className={styles.dayName}>{TR_DAYS_SHORT[day.getDay()]}</div>
                {isToday ? (
                  <div className={styles.dayNumToday}>{day.getDate()}</div>
                ) : (
                  <div className={styles.dayNum}>{day.getDate()}</div>
                )}
                {count > 0 && (
                  <div className={styles.dayApptCount}>{count} randevu</div>
                )}
              </div>
            )
          })}
        </div>

        {/* Time rows */}
        <div className={styles.calBody}>
          {HOURS.map((hour) => (
            <div key={hour} className={styles.timeRow}>
              {/* Time gutter */}
              <div className={styles.timeCell}>
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* One cell per day */}
              {weekDays.map((day, i) => {
                const iso   = toISO(day)
                const key   = `${iso}__${hour}`
                const slots = apptIndex.get(key) ?? []

                return (
                  <div
                    key={iso}
                    className={`${styles.slotCell} ${i >= 3 ? styles.hideMobile : ''}`}
                  >
                    {slots.map((appt) => {
                      const colorIdx  = staffColors.get(appt.staff_name) ?? 0
                      const colorCls  = STAFF_COLORS[colorIdx]
                      const statusCls = statusOverlay(appt.status)
                      return (
                        <button
                          key={appt.id}
                          className={`${styles.apptChip} ${colorCls} ${statusCls}`}
                          onClick={(e) => handleChipClick(e, appt)}
                          title={`${appt.customer_name} — ${appt.service_name}`}
                        >
                          <span className={styles.apptChipName}>
                            {appt.appointment_time} {appt.customer_name}
                          </span>
                          <span className={styles.apptChipSvc}>{appt.service_name}</span>
                        </button>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Popup ── */}
      {popup && (
        <ApptPopup
          appt={popup.appt}
          x={popup.x}
          y={popup.y}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  )
}
