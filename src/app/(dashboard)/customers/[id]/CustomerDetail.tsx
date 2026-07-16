'use client'

import React, { useState, useTransition } from 'react'
import {
  Check, Phone, Mail, Calendar, ClipboardList, CheckCircle2,
  Wallet, XCircle, FileText, Star, CalendarDays,
} from 'lucide-react'
import type { Appointment, Customer }     from '@/types/database'
import { saveCustomerNote }               from './actions'
import { Icon }                           from '@/components/ui/Icon'
import styles from './customer-detail.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  customer:     Customer
  appointments: Appointment[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeCls(status: string | null): string {
  switch (status) {
    case 'Tamamlandı': return styles.badgeDone
    case 'Onaylı':     return styles.badgeConfirmed
    case 'İptal':
    case 'Gelmedi':    return styles.badgeCancelled
    default:           return styles.badgePending
  }
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function fmtDateShort(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'short',
  })
}

/** Count how many times each service appears */
function buildServiceFrequency(appointments: Appointment[]): { name: string; count: number }[] {
  const map = new Map<string, number>()
  for (const a of appointments) {
    if (a.status === 'İptal' || a.status === 'Gelmedi') continue
    map.set(a.service_name, (map.get(a.service_name) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }))
    .slice(0, 5)
}

/** Total revenue from completed appointments */
function totalRevenue(appointments: Appointment[]): number {
  return appointments
    .filter((a) => a.status === 'Tamamlandı')
    .reduce((sum, a) => sum + (a.price ?? 0), 0)
}

// ─── Notes panel (client interactive) ────────────────────────────────────────

function NotesPanel({
  customerId,
  businessId,
  initialNotes,
}: {
  customerId:    number
  businessId:    number
  initialNotes:  string | null
}) {
  const [notes,   setNotes]  = useState(initialNotes ?? '')
  const [saved,   setSaved]  = useState(false)
  const [error,   setError]  = useState<string | null>(null)
  const [pending, start]     = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    start(async () => {
      const res = await saveCustomerNote({ customerId, businessId, notes })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className={styles.notesBody}>
      <textarea
        className={styles.notesTextarea}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Bu müşteri hakkında özel notlar ekleyin. Tercihler, alerjiler, özel istekler, takip gerektiren konular…"
        rows={5}
      />
      <div className={styles.notesSaveRow}>
        <span>
          {saved  && <span className={styles.notesStatus}><Icon icon={Check} size="xs" /> Kaydedildi</span>}
          {error  && <span className={styles.notesError}>{error}</span>}
        </span>
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={pending}
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CustomerDetail({ customer, appointments }: Props) {
  const sortedAppts = [...appointments].sort(
    (a, b) =>
      b.appointment_date.localeCompare(a.appointment_date) ||
      b.appointment_time.localeCompare(a.appointment_time),
  )

  const completed    = appointments.filter((a) => a.status === 'Tamamlandı')
  const cancelled    = appointments.filter((a) => a.status === 'İptal' || a.status === 'Gelmedi')
  const revenue      = totalRevenue(appointments)
  const topServices  = buildServiceFrequency(appointments)
  const bizId        = customer.business_id ?? 0

  const initials = customer.full_name
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('')

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div className={styles.customerMeta}>
          <div className={styles.avatar}>{initials}</div>
          <div>
            <h1 className={styles.customerName}>{customer.full_name}</h1>
            <div className={styles.customerContacts}>
              <span className={styles.contactItem}><Icon icon={Phone} size="xs" /> {customer.phone}</span>
              {customer.email && (
                <span className={styles.contactItem}><Icon icon={Mail} size="xs" /> {customer.email}</span>
              )}
              {customer.created_at && (
                <span className={styles.contactItem}>
                  <Icon icon={Calendar} size="xs" /> {fmtDate(customer.created_at.split('T')[0])} tarihinden müşteri
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat chips ── */}
      <div className={styles.statsRow}>
        <div className={styles.statChip}>
          <span className={styles.statChipIcon}><Icon icon={ClipboardList} size="lg" /></span>
          <div>
            <p className={styles.statChipLabel}>Toplam Randevu</p>
            <p className={styles.statChipValue}>{appointments.length}</p>
          </div>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statChipIcon}><Icon icon={CheckCircle2} size="lg" /></span>
          <div>
            <p className={styles.statChipLabel}>Tamamlanan</p>
            <p className={styles.statChipValue}>{completed.length}</p>
          </div>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statChipIcon}><Icon icon={Wallet} size="lg" /></span>
          <div>
            <p className={styles.statChipLabel}>Toplam Ciro</p>
            <p className={styles.statChipValue}>₺{revenue.toFixed(0)}</p>
          </div>
        </div>
        <div className={styles.statChip}>
          <span className={styles.statChipIcon}><Icon icon={XCircle} size="lg" /></span>
          <div>
            <p className={styles.statChipLabel}>İptal / Gelmedi</p>
            <p className={styles.statChipValue}>{cancelled.length}</p>
          </div>
        </div>
      </div>

      {/* ── Two-column grid ── */}
      <div className={styles.grid}>

        {/* ── Notes ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}><Icon icon={FileText} size="xs" /> Notlar</span>
          </div>
          <NotesPanel
            customerId={customer.id}
            businessId={bizId}
            initialNotes={customer.notes}
          />
        </div>

        {/* ── Preferred services ── */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}><Icon icon={Star} size="xs" /> En Sık Hizmetler</span>
          </div>
          {topServices.length === 0 ? (
            <p className={styles.historyEmpty}>Henüz tamamlanan randevu yok.</p>
          ) : (
            <div className={styles.prefTags}>
              {topServices.map(({ name, count }) => (
                <span key={name} className={styles.prefTag}>
                  {name} ({count}×)
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Appointment history ── */}
        <div className={`${styles.card} ${styles.cardFull}`}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}><Icon icon={CalendarDays} size="xs" /> Randevu Geçmişi</span>
            <span className={styles.cardTitle}>{appointments.length} randevu</span>
          </div>

          {sortedAppts.length === 0 ? (
            <p className={styles.historyEmpty}>Henüz randevu yok.</p>
          ) : (
            <div className={styles.historyList}>
              {sortedAppts.map((appt) => (
                <div key={appt.id} className={styles.historyItem}>
                  {/* Date */}
                  <div className={styles.historyDate}>
                    <span className={styles.historyDateMain}>
                      {fmtDateShort(appt.appointment_date)}
                    </span>
                    <span className={styles.historyTime}>{appt.appointment_time}</span>
                  </div>

                  {/* Service + staff */}
                  <div>
                    <p className={styles.historyService}>{appt.service_name}</p>
                    <p className={styles.historyStaff}>{appt.staff_name} · {appt.duration_minutes} dk</p>
                    {appt.notes && (
                      <p className={styles.historyNotes}>"{appt.notes}"</p>
                    )}
                  </div>

                  {/* Price + status */}
                  <div className={styles.historyRight}>
                    {appt.price != null && (
                      <span className={styles.historyPrice}>
                        ₺{Number(appt.price).toFixed(0)}
                      </span>
                    )}
                    <span className={`${styles.badge} ${statusBadgeCls(appt.status)}`}>
                      {appt.status ?? 'Bekliyor'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
