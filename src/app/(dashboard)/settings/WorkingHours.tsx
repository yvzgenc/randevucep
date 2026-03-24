'use client'

import React, { useState, useTransition } from 'react'
import type { BusinessHour, BusinessClosure } from '@/types/database'
import { saveBusinessHours, addClosure, deleteClosure } from './hours-actions'
import styles from './hours.module.css'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: { dow: number; label: string; short: string }[] = [
  { dow: 1, label: 'Pazartesi', short: 'Pzt' },
  { dow: 2, label: 'Salı',      short: 'Sal' },
  { dow: 3, label: 'Çarşamba',  short: 'Çar' },
  { dow: 4, label: 'Perşembe',  short: 'Per' },
  { dow: 5, label: 'Cuma',      short: 'Cum' },
  { dow: 6, label: 'Cumartesi', short: 'Cmt' },
  { dow: 0, label: 'Pazar',     short: 'Paz' },
]

const DEFAULT_OPEN  = '09:00'
const DEFAULT_CLOSE = '18:00'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayState {
  dow:          number
  is_open:      boolean
  opening_time: string
  closing_time: string
}

interface Props {
  businessId:    number
  initialHours:  BusinessHour[]
  initialClosures: BusinessClosure[]
  defaultOpen:   string   // from business_settings
  defaultClose:  string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildInitialDays(hours: BusinessHour[], defaultOpen: string, defaultClose: string): DayState[] {
  const map = new Map(hours.map((h) => [h.dow, h]))
  return DAYS.map(({ dow }) => {
    const row = map.get(dow)
    // If no row exists yet, default Mon–Fri open, Sat–Sun closed
    if (!row) {
      const isWeekend = dow === 0 || dow === 6
      return { dow, is_open: !isWeekend, opening_time: defaultOpen, closing_time: defaultClose }
    }
    return {
      dow,
      is_open:      row.is_open,
      opening_time: row.opening_time ?? defaultOpen,
      closing_time: row.closing_time ?? defaultClose,
    }
  })
}

function fmtClosureDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkingHours({ businessId, initialHours, initialClosures, defaultOpen, defaultClose }: Props) {
  const [days,     setDays]     = useState<DayState[]>(() => buildInitialDays(initialHours, defaultOpen, defaultClose))
  const [closures, setClosures] = useState<BusinessClosure[]>(initialClosures)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Closure add form
  const [newDate,   setNewDate]   = useState('')
  const [newReason, setNewReason] = useState('')
  const [addError,  setAddError]  = useState<string | null>(null)

  const [pending,    startSave]   = useTransition()
  const [addPending, startAdd]    = useTransition()
  const [delPending, startDel]    = useTransition()

  // ── Update a single day field ───────────────────────────────────────────────
  function updateDay(dow: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d) => d.dow === dow ? { ...d, ...patch } : d))
  }

  // ── Apply same hours to all open days ──────────────────────────────────────
  function applyToAll(opening: string, closing: string) {
    setDays((prev) => prev.map((d) => d.is_open ? { ...d, opening_time: opening, closing_time: closing } : d))
  }

  // ── Save hours ─────────────────────────────────────────────────────────────
  function handleSave() {
    setError(null); setSaved(false)
    startSave(async () => {
      const res = await saveBusinessHours(businessId, days)
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  // ── Add closure ────────────────────────────────────────────────────────────
  function handleAddClosure() {
    if (!newDate) { setAddError('Tarih seçin.'); return }
    setAddError(null)
    startAdd(async () => {
      const res = await addClosure(businessId, newDate, newReason)
      if (res.error) { setAddError(res.error); return }
      // Optimistic UI update
      setClosures((prev) => [
        ...prev,
        { id: Date.now(), business_id: businessId, closed_date: newDate, reason: newReason.trim() || null },
      ].sort((a, b) => a.closed_date.localeCompare(b.closed_date)))
      setNewDate(''); setNewReason('')
    })
  }

  // ── Delete closure ─────────────────────────────────────────────────────────
  function handleDeleteClosure(id: number) {
    startDel(async () => {
      const res = await deleteClosure(businessId, id)
      if (!res.error) setClosures((prev) => prev.filter((c) => c.id !== id))
    })
  }

  // First open day's hours for "apply to all" shortcut
  const firstOpen = days.find((d) => d.is_open)

  return (
    <div className={styles.wrap}>
      {/* ── Days grid ── */}
      <div className={styles.daysGrid}>
        {days.map((day) => {
          const info = DAYS.find((d) => d.dow === day.dow)!
          return (
            <div key={day.dow} className={`${styles.dayRow} ${!day.is_open ? styles.dayRowClosed : ''}`}>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={day.is_open}
                className={`${styles.toggle} ${day.is_open ? styles.toggleOn : ''}`}
                onClick={() => updateDay(day.dow, { is_open: !day.is_open })}
              >
                <span className={styles.toggleThumb} />
              </button>

              {/* Day name */}
              <span className={styles.dayName}>{info.label}</span>

              {/* Hours or closed label */}
              {day.is_open ? (
                <div className={styles.timeInputs}>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={day.opening_time}
                    onChange={(e) => updateDay(day.dow, { opening_time: e.target.value })}
                  />
                  <span className={styles.timeSep}>–</span>
                  <input
                    type="time"
                    className={styles.timeInput}
                    value={day.closing_time}
                    onChange={(e) => updateDay(day.dow, { closing_time: e.target.value })}
                  />
                </div>
              ) : (
                <span className={styles.closedLabel}>Kapalı</span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Apply to all shortcut ── */}
      {firstOpen && (
        <button
          type="button"
          className={styles.applyAllBtn}
          onClick={() => applyToAll(firstOpen.opening_time, firstOpen.closing_time)}
        >
          Tüm açık günlere {firstOpen.opening_time}–{firstOpen.closing_time} uygula
        </button>
      )}

      {/* ── Save row ── */}
      <div className={styles.saveRow}>
        {error  && <span className={styles.errorMsg}>{error}</span>}
        {saved  && <span className={styles.successMsg}>✓ Kaydedildi</span>}
        <button className={styles.saveBtn} onClick={handleSave} disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Çalışma Saatlerini Kaydet'}
        </button>
      </div>

      {/* ── Special closures ── */}
      <div className={styles.closuresSection}>
        <p className={styles.closuresTitle}>Özel Kapalı Günler &amp; Tatiller</p>
        <p className={styles.closuresDesc}>
          Resmi tatiller veya özel kapalı günleri buraya ekleyin — bu günlerde online rezervasyon alınmaz.
        </p>

        {/* Existing closures */}
        {closures.length > 0 && (
          <div className={styles.closuresList}>
            {closures.map((c) => (
              <div key={c.id} className={styles.closureItem}>
                <div className={styles.closureInfo}>
                  <span className={styles.closureDate}>{fmtClosureDate(c.closed_date)}</span>
                  {c.reason && <span className={styles.closureReason}>{c.reason}</span>}
                </div>
                <button
                  className={styles.closureDeleteBtn}
                  onClick={() => handleDeleteClosure(c.id)}
                  disabled={delPending}
                  aria-label="Sil"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add form */}
        <div className={styles.closureAddRow}>
          <input
            type="date"
            className={styles.closureDateInput}
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          <input
            type="text"
            className={styles.closureReasonInput}
            placeholder="Neden? (isteğe bağlı)"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            maxLength={60}
          />
          <button
            className={styles.closureAddBtn}
            onClick={handleAddClosure}
            disabled={addPending || !newDate}
          >
            + Ekle
          </button>
        </div>
        {addError && <p className={styles.errorMsg}>{addError}</p>}
      </div>
    </div>
  )
}
