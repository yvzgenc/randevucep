'use client'
import React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BUSINESS_TYPES, getBusinessTypeConfig, toBusinessType, type BusinessType } from '@/lib/businessTypes'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from './onboarding.module.css'

interface Props {
  userId:             string
  userEmail:          string
  fullName:           string
  existingBusinessId: number | null
  existingType:       string | null
  // Prefill values for edit/pending state
  existingName:       string | null
  existingSlug:       string | null
  existingPhone:      string | null
  existingCity:       string | null
}

type Step = 'type' | 'info'

export function OnboardingFlow({
  userId,
  userEmail,
  fullName,
  existingBusinessId,
  existingType,
  existingName,
  existingSlug,
  existingPhone,
  existingCity,
}: Props) {
  const router = useRouter()

  const [step, setStep]               = useState<Step>(existingType ? 'info' : 'type')
  const [businessType, setBusinessType] = useState<BusinessType>(
    toBusinessType(existingType)
  )

  // Prefill form with existing values when editing a pending business
  const [name, setName]   = useState(existingName  ?? '')
  const [slug, setSlug]   = useState(existingSlug  ?? '')
  const [phone, setPhone] = useState(existingPhone ?? '')
  const [city, setCity]   = useState(existingCity  ?? '')

  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const config = getBusinessTypeConfig(businessType)

  function deriveSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
      .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNameChange(value: string) {
    setName(value)
    // Only auto-derive slug when slug is still empty or was auto-derived
    if (!existingSlug) {
      setSlug(deriveSlug(value))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()

    if (!trimmedName || !trimmedSlug) {
      setError("İşletme adı ve rezervasyon URL'si zorunludur.")
      return
    }
    if (trimmedSlug.length < 3) {
      setError("Rezervasyon URL'si en az 3 karakter olmalıdır.")
      return
    }

    setError(null)
    setLoading(true)

    const supabase = createClient()

    const businessPayload = {
      owner_id:             userId,
      name:                 trimmedName,
      slug:                 trimmedSlug,
      phone:                phone.trim() || null,
      city:                 city.trim() || null,
      business_type:        businessType,
      onboarding_completed: true,
      is_active:            true,
      plan:                 'starter',
    }

    let businessId: number | null = existingBusinessId

    if (existingBusinessId) {
      const { error: updateError } = await supabase
        .from('businesses')
        .update(businessPayload)
        .eq('id', existingBusinessId)

      if (updateError) {
        setError(
          updateError.message.includes('unique')
            ? "Bu rezervasyon URL'si kullanılıyor. Başka bir tane deneyin."
            : updateError.message
        )
        setLoading(false)
        return
      }
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('businesses')
        .insert(businessPayload)
        .select('id')
        .single()

      if (insertError) {
        setError(
          insertError.message.includes('unique')
            ? "Bu rezervasyon URL'si kullanılıyor. Başka bir tane deneyin."
            : insertError.message
        )
        setLoading(false)
        return
      }

      businessId = inserted.id
    }

    const { error: userError } = await supabase
      .from('users')
      .upsert(
        {
          id:          userId,
          email:       userEmail,
          full_name:   fullName || null,
          business_id: businessId,
          role:        'owner',
          is_active:   true,
        },
        { onConflict: 'id' }
      )

    if (userError) {
      console.error('User profile upsert failed:', userError.message)
    }

    router.push('/dashboard')
    router.refresh()
  }

  // ── Step 1: Business type selection ──────────────────────────────────────

  if (step === 'type') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}>📅 RandevuCep</div>
          <h1 className={styles.heading}>İşletme Türünü Seçin</h1>
          <p className={styles.sub}>Arayüzü işletmenize özelleştireceğiz.</p>

          <div className={styles.typeGrid}>
            {BUSINESS_TYPES.map((type) => {
              const cfg = getBusinessTypeConfig(type)
              return (
                <button
                  key={type}
                  className={[
                    styles.typeCard,
                    businessType === type ? styles.typeCardSelected : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setBusinessType(type)}
                >
                  <span className={styles.typeIcon}>{cfg.icon}</span>
                  <span className={styles.typeLabel}>{cfg.label}</span>
                </button>
              )
            })}
          </div>

          <Button fullWidth onClick={() => setStep('info')}>
            Devam Et →
          </Button>
        </div>
      </div>
    )
  }

  // ── Step 2: Business info ─────────────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>{config.icon} RandevuCep</div>
        <h1 className={styles.heading}>İşletmenizi Kurun</h1>
        <p className={styles.sub}>
          <button className={styles.changeType} onClick={() => setStep('type')}>
            {config.label}
          </button>{' '}
          için birkaç bilgi girin.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="İşletme Adı *"
            type="text"
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder={`${config.label} Ayşe`}
            required
          />
          <Input
            label="Rezervasyon URL'si *"
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(deriveSlug(e.target.value))}
            placeholder="ayse-berber"
            hint={`Rezervasyon sayfanız: /book/${slug || 'isletme-adi'}`}
            required
          />
          <Input
            label="Telefon"
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0532 000 00 00"
          />
          <Input
            label="Şehir"
            type="text"
            id="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="İstanbul"
          />

          {error ? <p className={styles.errorMsg}>{error}</p> : null}

          <Button type="submit" fullWidth loading={loading}>
            İşletmemi Kur ve Devam Et →
          </Button>
        </form>
      </div>
    </div>
  )
}
