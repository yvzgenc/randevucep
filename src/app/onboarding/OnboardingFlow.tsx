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
  existingBusinessId: number | null
}

export function OnboardingFlow({ userId, existingBusinessId }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function deriveSlug(value: string) {
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
    if (!name.trim() || !slug.trim()) {
      setError('İşletme adı ve URL zorunludur.')
      return
    }
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const payload = {
      owner_id: userId,
      name: name.trim(),
      slug: slug.trim(),
      phone: phone.trim() || null,
      city: city.trim() || null,
      onboarding_completed: true,
      is_active: true,
      plan: 'starter',
    }

    let dbError: { message: string } | null = null

    if (existingBusinessId) {
      const { error } = await supabase
        .from('businesses')
        .update({ ...payload })
        .eq('id', existingBusinessId)
      dbError = error
    } else {
      const { error } = await supabase
        .from('businesses')
        .insert(payload)
      dbError = error
    }

    if (dbError) {
      setError(
        dbError.message.includes('unique')
          ? 'Bu URL zaten kullanılıyor. Başka bir tane deneyin.'
          : dbError.message
      )
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>✂ SalonCep</div>
        <h1 className={styles.heading}>İşletmenizi Kurun</h1>
        <p className={styles.sub}>Birkaç bilgi ile başlayalım. Her şeyi sonradan değiştirebilirsiniz.</p>

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
            Devam Et →
          </Button>
        </form>
      </div>
    </div>
  )
}
