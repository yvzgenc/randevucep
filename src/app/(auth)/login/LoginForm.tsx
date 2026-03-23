'use client'
import React from 'react'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from '../auth.module.css'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      // Distinguish between wrong credentials and unconfirmed email
      if (authError.message.toLowerCase().includes('email not confirmed')) {
        setError('E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzu kontrol edin.')
      } else {
        setError('E-posta veya şifre hatalı.')
      }
      setLoading(false)
      return
    }

    // After successful login, check if there's a redirectTo param
    const redirectTo = searchParams.get('redirectTo')
    if (redirectTo && redirectTo.startsWith('/')) {
      router.push(redirectTo)
    } else {
      // Let the root page handle business/onboarding check
      router.push('/')
    }
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
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
        placeholder="••••••••"
        required
        autoComplete="current-password"
      />
      {error ? <p className={styles.errorMsg}>{error}</p> : null}
      <Button type="submit" fullWidth loading={loading}>
        Giriş Yap
      </Button>
    </form>
  )
}
