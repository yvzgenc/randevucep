'use client'
import React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from './onboarding.module.css'

interface Props {
  userId: string
  userEmail: string
  fullName: string
  existingBusinessId: number | null
}

export function OnboardingFlow({
  userId,
  userEmail,
  fullName,
  existingBusinessId,
}: Props) {
  const router = useRouter()

  const [name, setName]   = useState('')
  const [slug, setSlug]   = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity]   = useState('')

  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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
    setSlug(deriveSlug(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const trimmedName = name.trim()
    const trimmedSlug = slug.trim()

    if (!trimmedName || !trimmedSlug) {
      setError('İşletme adı ve rezervasyon URL\'si zorunludur.')
      return
    }

    if (trimmedSlug.length < 3) {
      setError('Rezervasyon URL\'si en az 3 karakter olmalıdır.')
      return
    }

    setError(null)
    setLoading(true)

    const supabase = createClient()

    // 1. Upsert the business record
    const businessPayload = {
      owner_id: userId,
      name: trimmedName,
      slug: trimmedSlug,
      phone: phone.trim() || null,
      city: city.trim() || null,
      onboarding_completed: true,
      is_active: true,
      plan: 'starter',
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
            ? 'Bu rezervasyon URL\'si kullanılıyor. Başka bir tane deneyin.'
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
            ? 'Bu rezervasyon URL\'si kullanılıyor. Başka bir tane deneyin.'
            : insertError.message
        )
        setLoading(false)
        return
      }

      businessId = inserted.id
    }

    // 2. Upsert the user profile in public.users
    const { error: userError } = await supabase
      .from('users')
      .upsert(
        {
          id: userId,
          email: userEmail,
          full_name: fullName || null,
          business_id: businessId,
          role: 'owner',
          is_active: true,
        },
        { onConflict: 'id' }
      )

    if (userError) {
      // Non-fatal: profile upsert failed, still proceed to dashboard
      console.error('User profile upsert failed:', userError.message)
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>✂ SalonCep</div>
        <h1 className={styles.heading}>İşletmenizi Kurun</h1>
        <p className={styles.sub}>
          Birkaç bilgi ile başlayalım. Her şeyi sonradan değiştirebilirsiniz.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="İşletme Adı *"
            type="text"
            id="name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Güzellik Salonu Ayşe"
            required
          />
          <Input
            label="Rezervasyon URL'si *"
            type="text"
            id="slug"
            value={slug}
            onChange={(e) => setSlug(deriveSlug(e.target.value))}
            placeholder="ayse-guzellik"
            hint={`Rezervasyon sayfanız: /book/${slug || 'salon-adi'}`}
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
