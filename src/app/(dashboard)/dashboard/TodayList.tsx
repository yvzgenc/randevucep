'use client'

import React, { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import type { Appointment } from '@/types/database'
import { AppointmentActions } from '../appointments/AppointmentActions'
import { Icon } from '@/components/ui/Icon'
import styles from './today.module.css'

interface Props {
  appointments: Appointment[]
}

function statusDot(status: string | null): string {
  switch (status) {
    case 'Onaylı':     return styles.dotConfirmed
    case 'Tamamlandı': return styles.dotDone
    case 'İptal':
    case 'Gelmedi':    return styles.dotCancelled
    default:           return styles.dotPending
  }
}

export function TodayList({ appointments }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  if (appointments.length === 0) return null

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerTitle}>Bugün</span>
          <span className={styles.headerCount}>{appointments.length} randevu</span>
        </div>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((v) => !v)}
          type="button"
        >
          <Icon icon={collapsed ? ChevronDown : ChevronUp} size="xs" /> {collapsed ? 'Göster' : 'Gizle'}
        </button>
      </div>

      {/* List */}
      {!collapsed && (
        <div className={styles.list}>
          {appointments.map((a, i) => (
            <div
              key={a.id}
              className={`${styles.row} ${i === appointments.length - 1 ? styles.rowLast : ''}`}
            >
              {/* Time */}
              <div className={styles.timeCol}>
                <span className={styles.time}>{a.appointment_time}</span>
                <span className={`${styles.dot} ${statusDot(a.status)}`} />
              </div>

              {/* Info */}
              <div className={styles.infoCol}>
                <span className={styles.name}>{a.customer_name}</span>
                <span className={styles.meta}>
                  {a.service_name}
                  {a.staff_name ? ` · ${a.staff_name}` : ''}
                </span>
              </div>

              {/* Phone */}
              <a
                href={`tel:${a.customer_phone}`}
                className={styles.phone}
                title="Ara"
              >
                {a.customer_phone}
              </a>

              {/* Actions */}
              <AppointmentActions
                appointmentId={a.id}
                currentStatus={a.status}
                savedEmail={a.customer_email ?? null}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
