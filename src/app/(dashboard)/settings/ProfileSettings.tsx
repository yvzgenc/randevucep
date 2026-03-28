'use client'

import React, { useState, useTransition } from 'react'
import type { Business } from '@/types/database'
import { saveBusinessProfile } from './profile-actions'
import { getBusinessTypeConfig } from '@/lib/businessTypes'
import styles from './profile.module.css'

interface Props {
  business: Business
  appUrl:   string   // NEXT_PUBLIC_APP_URL
}

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export function ProfileSettings({ business, appUrl }: Props) {
  const [name,      setName]      = useState(business.name)
  const [slug,      setSlug]      = useState(business.slug)
  const [phone,     setPhone]     = useState(business.phone     ?? '')
  const [city,      setCity]      = useState(business.city      ?? '')
  const [address,   setAddress]   = useState(business.address   ?? '')
  const [whatsapp,  setWhatsapp]  = useState(business.whatsapp_number ?? '')

  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [pending, start]      = useTransition()

  const typeCfg = getBusinessTypeConfig(business.business_type)

  // Auto-derive slug when name changes — only if slug hasn't been manually edited
  const [slugEdited, setSlugEdited] = useState(false)

  function handleNameChange(val: string) {
    setName(val)
    if (!slugEdited) setSlug(slugify(val))
  }

  function handleSlugChange(val: string) {
    setSlug(slugify(val) || val.toLowerCase())
    setSlugEdited(true)
  }

  function handleSave() {
    setError(null); setSaved(false)
    start(async () => {
      const res = await saveBusinessProfile({
        businessId: business.id,
        name, slug, phone, city, address, whatsapp,
      })
      if (res.error) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    })
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}>İşletme Bilgileri</span>
      </div>

      <div className={styles.form}>

        {/* İşletme adı */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="biz-name">İşletme Adı *</label>
          <input
            id="biz-name"
            className={styles.input}
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Örn: Güzellik Salonu Ayşe"
            maxLength={80}
          />
        </div>

        {/* Rezervasyon URL */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="biz-slug">Rezervasyon URL *</label>
          <div className={styles.slugWrap}>
            <span className={styles.slugPrefix}>{appUrl || 'site.com'}/book/</span>
            <input
              id="biz-slug"
              className={styles.slugInput}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="isletme-adi"
              maxLength={60}
              spellCheck={false}
            />
          </div>
          {slug && (
            <p className={styles.hint}>
              Rezervasyon sayfanız:{' '}
              <span className={styles.hintAccent}>{appUrl}/book/{slug}</span>
            </p>
          )}
        </div>

        {/* Telefon + Şehir */}
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="biz-phone">Telefon</label>
            <input
              id="biz-phone"
              className={styles.input}
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0532 000 00 00"
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="biz-city">Şehir</label>
            <input
              id="biz-city"
              className={styles.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="İstanbul"
            />
          </div>
        </div>

        {/* Adres */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="biz-address">Adres</label>
          <input
            id="biz-address"
            className={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Mahalle, sokak, bina no..."
          />
        </div>

        {/* WhatsApp */}
        <div className={styles.field}>
          <label className={styles.label} htmlFor="biz-wa">WhatsApp Numarası</label>
          <input
            id="biz-wa"
            className={styles.input}
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+90532 000 00 00"
          />
          <p className={styles.hint}>Rezervasyon sayfasında "WhatsApp ile iletişim" butonu gösterir.</p>
        </div>

        {/* İşletme türü (read-only) */}
        <div className={styles.field}>
          <label className={styles.label}>İşletme Türü</label>
          <div className={styles.typeBadge}>
            {typeCfg.icon} {typeCfg.label}
          </div>
          <p className={styles.typeNote}>İşletme türü değiştirilemez. Değişiklik için destek ile iletişime geçin.</p>
        </div>

      </div>

      <div className={styles.footer}>
        {saved  && <span className={styles.successMsg}>✓ Bilgiler kaydedildi</span>}
        {error  && <span className={styles.errorMsg}>{error}</span>}
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={pending || !name.trim() || !slug.trim()}
        >
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </div>
  )
}
