'use client'

import React, { useState, useTransition } from 'react'
import { saveSmsSettings } from './sms-actions'
import styles from './settings.module.css'
import smsStyles from './sms.module.css'

interface Props {
  businessId:      number
  smsEnabled:      boolean
  whatsappEnabled: boolean
  smsReminderEnabled: boolean
  twilioConfigured: boolean   // true if env vars are set (server checks)
}

export function SmsSettings({
  businessId,
  smsEnabled,
  whatsappEnabled,
  smsReminderEnabled,
  twilioConfigured,
}: Props) {
  const [sms,        setSms]      = useState(smsEnabled)
  const [whatsapp,   setWhatsapp] = useState(whatsappEnabled)
  const [reminder,   setReminder] = useState(smsReminderEnabled)
  const [saved,      setSaved]    = useState(false)
  const [error,      setError]    = useState<string | null>(null)
  const [pending,    startTransition] = useTransition()

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveSmsSettings({
        businessId,
        smsEnabled:      sms,
        whatsappEnabled: whatsapp,
        smsReminderEnabled: reminder,
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
              Günlük cron işi çalıştığında müşterilere e-posta yanı sıra SMS/WhatsApp hatırlatması da gider.
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
