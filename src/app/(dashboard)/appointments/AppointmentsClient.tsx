'use client'

import React, { useState } from 'react'
import type { Appointment } from '@/types/database'
import { CalendarView }     from './CalendarView'
import { AppointmentActions } from './AppointmentActions'
import calStyles from './calendar.module.css'
import styles    from './appointments.module.css'

interface Props {
  appointments: Appointment[]
}

function statusBadgeClass(status: string | null, s: typeof styles): string {
  switch (status) {
    case 'Tamamlandı': return s.badgeDone
    case 'Onaylı':     return s.badgeConfirmed
    case 'İptal':
    case 'Gelmedi':    return s.badgeCancelled
    default:           return s.badgePending
  }
}

export function AppointmentsClient({ appointments }: Props) {
  const [view, setView] = useState<'list' | 'week'>('list')

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 className={styles.title}>Randevular</h1>
          {appointments.length > 0 && (
            <span className={styles.count}>{appointments.length} randevu</span>
          )}
        </div>

        {/* View toggle */}
        {appointments.length > 0 && (
          <div className={calStyles.viewToggle}>
            <button
              className={`${calStyles.viewBtn} ${view === 'list' ? calStyles.viewBtnActive : ''}`}
              onClick={() => setView('list')}
            >
              ☰ Liste
            </button>
            <button
              className={`${calStyles.viewBtn} ${view === 'week' ? calStyles.viewBtnActive : ''}`}
              onClick={() => setView('week')}
            >
              ▦ Hafta
            </button>
          </div>
        )}
      </div>

      {/* ── Empty state ── */}
      {appointments.length === 0 && (
        <div className={styles.empty}>
          <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.4 }}>📅</div>
          <p className={styles.emptyTitle}>Henüz randevu yok</p>
          <p className={styles.emptyDesc}>
            Müşteriler rezervasyon sayfanızdan randevu aldığında burada görünecek.
            <br />
            Rezervasyon sayfanızı paylaşarak başlayın.
          </p>
        </div>
      )}

      {/* ── Calendar view ── */}
      {appointments.length > 0 && view === 'week' && (
        <CalendarView appointments={appointments} />
      )}

      {/* ── List view ── */}
      {appointments.length > 0 && view === 'list' && (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Tarih / Saat</span>
            <span>Müşteri</span>
            <span>Hizmet</span>
            <span>Personel</span>
            <span>Durum</span>
            <span></span>
          </div>
          {appointments.map((appt) => (
            <div key={appt.id} className={styles.tableRow}>
              <span>
                <span className={styles.date}>
                  {new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
                    day: 'numeric', month: 'short',
                  })}
                </span>
                <span className={styles.time}>{appt.appointment_time}</span>
              </span>
              <span>
                <span className={styles.primary}>{appt.customer_name}</span>
                <span className={styles.phone}>{appt.customer_phone}</span>
              </span>
              <span className={styles.muted}>{appt.service_name}</span>
              <span className={styles.muted}>{appt.staff_name}</span>
              <span>
                <span className={statusBadgeClass(appt.status, styles)}>
                  {appt.status ?? 'Bekliyor'}
                </span>
              </span>
              <span>
                <AppointmentActions
                  appointmentId={appt.id}
                  currentStatus={appt.status}
                  savedEmail={appt.customer_email ?? null}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
