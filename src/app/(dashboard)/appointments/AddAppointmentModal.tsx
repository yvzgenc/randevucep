'use client'

import React, { useState, useTransition, useEffect } from 'react'
import type { Service, StaffMember } from '@/types/database'
import { addAppointmentAction } from './add-actions'
import styles from './add-modal.module.css'

interface Props {
  services: Service[]
  staff:    StaffMember[]
  onClose:  () => void
  onDone:   () => void
}

// ── Time slots ────────────────────────────────────────────────────────────────
function generateSlots(step = 30): string[] {
  const slots: string[] = []
  for (let m = 8 * 60; m < 21 * 60; m += step) {
    const h = Math.floor(m / 60).toString().padStart(2, '0')
    const min = (m % 60).toString().padStart(2, '0')
    slots.push(`${h}:${min}`)
  }
  return slots
}

const TIME_SLOTS = generateSlots(30)

// ── Component ─────────────────────────────────────────────────────────────────
export function AddAppointmentModal({ services, staff, onClose, onDone }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const [serviceId,   setServiceId]   = useState(services[0]?.id?.toString() ?? '')
  const [staffId,     setStaffId]     = useState(staff[0]?.id?.toString() ?? '')
  const [date,        setDate]        = useState(today)
  const [time,        setTime]        = useState('09:00')
  const [name,        setName]        = useState('')
  const [phone,       setPhone]       = useState('')
  const [email,       setEmail]       = useState('')
  const [notes,       setNotes]       = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [pending,     start]          = useTransition()

  const selectedService = services.find((s) => s.id.toString() === serviceId)
  const selectedStaff   = staff.find((s) => s.id.toString() === staffId)

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleSubmit() {
    setError(null)
    if (!name.trim())  { setError('Müşteri adı zorunludur.'); return }
    if (!phone.trim()) { setError('Telefon zorunludur.');     return }
    if (!selectedService) { setError('Hizmet seçiniz.'); return }
    if (!selectedStaff)   { setError('Personel seçiniz.'); return }

    start(async () => {
      const res = await addAppointmentAction({
        serviceId:       selectedService.id,
        serviceName:     selectedService.service_name,
        serviceDuration: selectedService.duration_minutes,
        staffId:         selectedStaff.id,
        staffName:       selectedStaff.full_name,
        date, time,
        customerName:  name,
        customerPhone: phone,
        customerEmail: email,
        notes,
        price: selectedService.price ?? 0,
      })
      if (res.error) { setError(res.error); return }
      onDone()
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>➕ Randevu Ekle</h2>
          <button className={styles.closeBtn} onClick={onClose} type="button" aria-label="Kapat">✕</button>
        </div>

        <div className={styles.body}>
          {/* Hizmet + Personel */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Hizmet *</label>
              <select className={styles.select} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.service_name} ({s.duration_minutes} dk)</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Personel *</label>
              <select className={styles.select} value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tarih + Saat */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Tarih *</label>
              <input
                type="date"
                className={styles.input}
                value={date}
                min={today}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Saat *</label>
              <select className={styles.select} value={time} onChange={(e) => setTime(e.target.value)}>
                {TIME_SLOTS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Müşteri */}
          <div className={styles.row2}>
            <div className={styles.field}>
              <label className={styles.label}>Müşteri Adı *</label>
              <input
                className={styles.input}
                placeholder="Ad Soyad"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Telefon *</label>
              <input
                className={styles.input}
                type="tel"
                placeholder="0532 000 00 00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* E-posta */}
          <div className={styles.field}>
            <label className={styles.label}>E-posta <span className={styles.optional}>(isteğe bağlı)</span></label>
            <input
              className={styles.input}
              type="email"
              placeholder="musteri@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Not */}
          <div className={styles.field}>
            <label className={styles.label}>Not <span className={styles.optional}>(isteğe bağlı)</span></label>
            <input
              className={styles.input}
              placeholder="Özel istek, not..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Özet */}
          {selectedService && selectedStaff && date && time && (
            <div className={styles.summary}>
              <span>📅 {new Date(date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <span>🕐 {time}</span>
              <span>✂ {selectedService.service_name}</span>
              <span>👤 {selectedStaff.full_name}</span>
              {selectedService.price > 0 && <span>₺{selectedService.price}</span>}
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} type="button" disabled={pending}>
            İptal
          </button>
          <button className={styles.submitBtn} onClick={handleSubmit} type="button" disabled={pending}>
            {pending ? 'Kaydediliyor…' : 'Randevu Oluştur'}
          </button>
        </div>
      </div>
    </>
  )
}
