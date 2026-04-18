'use client'

import React, { useState, useTransition } from 'react'
import { saveSmsSettings } from './sms-actions'
import styles from './settings.module.css'
import smsStyles from './sms.module.css'

const REMINDER_HOUR_OPTIONS = [
  { value: 2,  label: '2 saat önce'        },
  { value: 4,  label: '4 saat önce'        },
  { value: 12, label: '12 saat önce'       },
  { value: 24, label: '24 saat önce (1 gün)' },
  { value: 48, label: '48 saat önce (2 gün)' },
]

interface Props {
  businessId:           number
  smsEnabled:           boolean
  whatsappEnabled:      boolean
  smsReminderEnabled:   boolean
  reminderHoursBefore:  number
  twilioConfigured:     boolean
}

export function SmsSettings({
  businessId,
  smsEnabled,
  whatsappEnabled,
  smsReminderEnabled,
  reminderHoursBefore,
  twilioConfigured,
}: Props) {
  const [sms,          setSms]        = useState(smsEnabled)
  const [whatsapp,     setWhatsapp]   = useState(whatsappEnabled)
  const [reminder,     setReminder]   = useState(smsReminderEnabled)
  const [reminderHours, setReminderHours] = useState(reminderHoursBefore)
  const [saved,        setSaved]      = useState(false)
  const [error,        setError]      = useState<string | null>(null)
  const [pending,      startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveSmsSettings({
        businessId,
        smsEnabled:          sms,
        whatsappEnabled:     whatsapp,
        smsReminderEnabled:  reminder,
        reminderHoursBefore: reminderHours,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      }
    })
  }

  return (
    <div className={smsStyles.wrap}>
      {!twilioConfigured && (
        <div className={smsStyles.configWarning}>
          <span className={smsStyles.configWarningIcon}>⚠️</span>
          <div>
            <p className={smsStyles.configWarningTitle}>Twilio yapılandırılmamış</p>
            <p className={smsStyles.configWarningDesc}>
              SMS/WhatsApp göndermek için{' '}
              <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> ve{' '}
              <code>TWILIO_FROM_PHONE</code> ortam değişkenlerini ayarlayın.
            </p>
          </div>
        </div>
      )}

      <div className={smsStyles.toggleList}>
        {/* SMS */}
        <label className={smsStyles.toggleRow}>
          <div className={smsStyles.toggleInfo}>
            <p className={smsStyles.toggleTitle}>💬 SMS bildirimi</p>
            <p className={smsStyles.toggleDesc}>
              Müşteriye randevu onayı ve iptal bilgisi SMS ile gönderilir.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={sms}
            className={`${smsStyles.toggle} ${sms ? smsStyles.toggleOn : ''}`}
            onClick={() => setSms((v) => !v)}
            disabled={!twilioConfigured}
            type="button"
          >
            <span className={smsStyles.toggleThumb} />
          </button>
        </label>

        {/* WhatsApp */}
        <label className={smsStyles.toggleRow}>
          <div className={smsStyles.toggleInfo}>
            <p className={smsStyles.toggleTitle}>📱 WhatsApp bildirimi</p>
            <p className={smsStyles.toggleDesc}>
              SMS yerine WhatsApp mesajı gönderir. Twilio WhatsApp sandbox veya onaylı numarası gerekir.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={whatsapp}
            className={`${smsStyles.toggle} ${whatsapp ? smsStyles.toggleOn : ''}`}
            onClick={() => setWhatsapp((v) => !v)}
            disabled={!twilioConfigured}
            type="button"
          >
            <span className={smsStyles.toggleThumb} />
          </button>
        </label>

        {/* Reminder */}
        <label className={smsStyles.toggleRow}>
          <div className={smsStyles.toggleInfo}>
            <p className={smsStyles.toggleTitle}>⏰ SMS hatırlatma</p>
            <p className={smsStyles.toggleDesc}>
              Randevudan belirtilen süre önce müşterilere SMS/WhatsApp hatırlatması gönderilir.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={reminder}
            className={`${smsStyles.toggle} ${reminder ? smsStyles.toggleOn : ''}`}
            onClick={() => setReminder((v) => !v)}
            disabled={!twilioConfigured || (!sms && !whatsapp)}
            type="button"
          >
            <span className={smsStyles.toggleThumb} />
          </button>
        </label>

        {reminder && (
          <div className={smsStyles.reminderHoursRow}>
            <label className={smsStyles.reminderHoursLabel} htmlFor="reminder-hours">
              Hatırlatma zamanı
            </label>
            <select
              id="reminder-hours"
              className={smsStyles.reminderHoursSelect}
              value={reminderHours}
              onChange={(e) => setReminderHours(Number(e.target.value))}
              disabled={!twilioConfigured}
            >
              {REMINDER_HOUR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Save */}
      <div className={smsStyles.saveRow}>
        {error  && <p className={smsStyles.errorMsg}>{error}</p>}
        {saved  && <p className={smsStyles.successMsg}>✓ Kaydedildi</p>}
        <button
          className={styles.upgradeBtn}
          style={{ width: 'auto', padding: '9px 20px' }}
          onClick={handleSave}
          disabled={pending || !twilioConfigured}
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
