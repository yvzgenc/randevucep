'use client'
import React from 'react'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from '../auth.module.css'

export function RegisterForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/onboarding')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Ad Soyad"
        type="text"
        id="fullName"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder="Ayşe Yılmaz"
        required
        autoComplete="name"
      />
      <Input
        label="E-posta"
        type="email"
        id="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="ornek@salon.com"
        required
        autoComplete="email"
      />
      <Input
        label="Şifre"
        type="password"
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="En az 8 karakter"
        required
        autoComplete="new-password"
        minLength={8}
      />
      {error ? <p className={styles.errorMsg}>{error}</p> : null}
      <Button type="submit" fullWidth loading={loading}>
        Hesap Oluştur
      </Button>
    </form>
  )
}
