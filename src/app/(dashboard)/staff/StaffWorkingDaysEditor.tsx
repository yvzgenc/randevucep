'use client'

import React, { useState, useTransition } from 'react'
import { Check, ChevronUp, ChevronDown } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import type { StaffWorkingDay } from '@/types/database'
import styles from './staff-availability.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  staffId:     number
  businessId:  number
  staffName:   string
  initialDays: StaffWorkingDay[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: 'Pzt' },
  { dow: 2, label: 'Sal' },
  { dow: 3, label: 'Çar' },
  { dow: 4, label: 'Per' },
  { dow: 5, label: 'Cum' },
  { dow: 6, label: 'Cmt' },
  { dow: 0, label: 'Paz' },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function StaffWorkingDaysEditor({ staffId, businessId, staffName, initialDays }: Props) {
  const [open,    setOpen]    = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [pending, start]      = useTransition()

  // Build local state: dow → is_working
  // If no row exists for a DOW, assume working (true)
  const [working, setWorking] = useState<Record<number, boolean>>(() => {
    const map: Record<number, boolean> = {}
    DAYS.forEach(({ dow }) => {
      const row = initialDays.find((r) => r.staff_id === staffId && r.dow === dow)
      map[dow] = row ? row.is_working : true
    })
    return map
  })

  function toggle(dow: number) {
    setWorking((prev) => ({ ...prev, [dow]: !prev[dow] }))
  }

  function handleSave() {
    setError(null); setSaved(false)
    start(async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()

      const rows = DAYS.map(({ dow }) => ({
        staff_id:    staffId,
        business_id: businessId,
        dow,
        is_working:  working[dow] ?? true,
      }))

      const { error: dbErr } = await supabase
        .from('staff_working_days')
        .upsert(rows, { onConflict: 'staff_id,dow' })

      if (dbErr) { setError(dbErr.message); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.triggerDays}>
          {DAYS.filter(({ dow }) => working[dow]).map(({ label }) => label).join(' · ')}
        </span>
        <span className={styles.triggerArrow}><Icon icon={open ? ChevronUp : ChevronDown} size="sm" /></span>
      </button>

      {open && (
        <div className={styles.panel}>
          <p className={styles.panelTitle}>{staffName} — Çalışma Günleri</p>
          <div className={styles.dayPills}>
            {DAYS.map(({ dow, label }) => (
              <button
                key={dow}
                type="button"
                className={`${styles.pill} ${working[dow] ? styles.pillOn : ''}`}
                onClick={() => toggle(dow)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className={styles.panelActions}>
            {error  && <span className={styles.errorMsg}>{error}</span>}
            {saved  && <span className={styles.successMsg}><Icon icon={Check} size="xs" /> Kaydedildi</span>}
            <button
              type="button"
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
