'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from '../auth.module.css'

export function ForgotPasswordForm() {
  const [email, setEmail]     = useState('')
  const [error, setError]     = useState<string | null>(null)
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })

    setLoading(false)

    // Always show the same success state, whether or not the email exists —
    // avoids leaking which addresses have an account.
    if (authError) {
      setError('Bir şeyler ters gitti. Lütfen tekrar deneyin.')
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className={styles.infoBox}>
        <p>
          <strong>{email}</strong> adresine bir sıfırlama bağlantısı gönderdik.
          Gelen kutunuzu (ve spam klasörünü) kontrol edin.
        </p>
        <a href="/login" className={styles.infoLink}>Giriş sayfasına dön →</a>
      </div>
    )
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
      {error ? <p className={styles.errorMsg}>{error}</p> : null}
      <Button type="submit" fullWidth loading={loading}>
        Sıfırlama Bağlantısı Gönder
      </Button>
    </form>
  )
}
