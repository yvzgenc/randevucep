'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from '../auth.module.css'

export function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (authError) {
      setError(
        authError.message.toLowerCase().includes('session')
          ? 'Bağlantının süresi dolmuş olabilir. Lütfen yeni bir sıfırlama bağlantısı isteyin.'
          : 'Şifre güncellenemedi. Lütfen tekrar deneyin.'
      )
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <Input
        label="Yeni Şifre"
        type="password"
        id="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="En az 8 karakter"
        required
        autoComplete="new-password"
        minLength={8}
      />
      <Input
        label="Yeni Şifre (Tekrar)"
        type="password"
        id="confirmPassword"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Şifrenizi tekrar girin"
        required
        autoComplete="new-password"
        minLength={8}
      />
      {error ? (
        <p className={styles.errorMsg}>
          {error}{' '}
          {error.includes('yeni bir sıfırlama') && <a href="/forgot-password">Buradan isteyin →</a>}
        </p>
      ) : null}
      <Button type="submit" fullWidth loading={loading}>
        Şifreyi Güncelle
      </Button>
    </form>
  )
}
