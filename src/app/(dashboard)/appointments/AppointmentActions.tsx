'use client'
import React, { useState, useTransition } from 'react'
import { Check, X, Star, MoreHorizontal, Mail, type LucideIcon } from 'lucide-react'
import { updateAppointmentStatus, type AppointmentStatus } from './actions'
import { Icon } from '@/components/ui/Icon'
import styles from './appointments.module.css'

interface Props {
  appointmentId: number
  currentStatus: string | null
  /** Email already stored on the appointment from booking time */
  savedEmail:    string | null
}

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; icon: LucideIcon | null }[] = [
  { value: 'Onaylı',     label: 'Onayla',    icon: Check },
  { value: 'İptal',      label: 'İptal Et',  icon: X     },
  { value: 'Tamamlandı', label: 'Tamamlandı',icon: Star  },
  { value: 'Gelmedi',    label: 'Gelmedi',   icon: null  },
]

export function AppointmentActions({ appointmentId, currentStatus, savedEmail }: Props) {
  const [open,     setOpen]     = useState(false)
  const [email,    setEmail]    = useState('')
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const [pending,  startTransition] = useTransition()

  // If a saved email exists we don't need the manual input
  const hasEmail = Boolean(savedEmail)

  function handleSelect(status: AppointmentStatus) {
    startTransition(async () => {
      const result = await updateAppointmentStatus(
        appointmentId,
        status,
        hasEmail ? undefined : email.trim() || undefined,
      )
      if (result.error) {
        setFeedback({ ok: false, msg: result.error })
      } else {
        const emailNote = result.customerEmail ? ` · ${result.customerEmail}` : ''
        setFeedback({ ok: true, msg: `Güncellendi${emailNote}` })
        setOpen(false)
      }
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  return (
    <div className={styles.actionsWrap}>
      <button
        className={styles.actionTrigger}
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label="Durum güncelle"
      >
        {pending ? '…' : <Icon icon={MoreHorizontal} size="sm" />}
      </button>

      {open && (
        <div className={styles.actionDropdown}>
          {/* Show email input only when no email is stored */}
          {!hasEmail && (
            <div className={styles.actionEmailRow}>
              <input
                className={styles.actionEmailInput}
                type="email"
                placeholder="Müşteri e-postası (bildirim için)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
          {hasEmail && (
            <div className={styles.actionEmailSaved}>
              <Icon icon={Mail} size="xs" /> {savedEmail}
            </div>
          )}
          {STATUS_OPTIONS.filter((o) => o.value !== currentStatus).map((opt) => (
            <button
              key={opt.value}
              className={styles.actionItem}
              onClick={() => handleSelect(opt.value)}
              disabled={pending}
            >
              {opt.icon && <Icon icon={opt.icon} size="xs" />} {opt.label}
            </button>
          ))}
        </div>
      )}

      {feedback ? (
        <span className={feedback.ok ? styles.actionSuccess : styles.actionError}>
          {feedback.msg}
        </span>
      ) : null}
    </div>
  )
}
