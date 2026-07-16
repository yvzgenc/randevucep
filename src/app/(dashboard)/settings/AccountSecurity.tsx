'use client'

import React, { useState, useTransition } from 'react'
import { Check, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'
import styles from './profile.module.css'

export function AccountSecurity() {
  const [password,        setPassword]        = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [pending, start]      = useTransition()

  function handleSave() {
    setError(null); setSaved(false)

    if (password.length < 8) {
      setError('Şifre en az 8 karakter olmalı.')
      return
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.')
      return
    }

    start(async () => {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.updateUser({ password })
      if (authError) {
        setError('Şifre güncellenemedi. Lütfen tekrar deneyin.')
        return
      }
      setPassword('')
      setConfirmPassword('')
      setSaved(true)
      setTimeout(() => setSaved(false), 4000)
    })
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardTitle}><Icon icon={Lock} size="xs" /> Şifre Değiştir</span>
      </div>

      <div className={styles.form}>
        <div className={styles.row2}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="new-password">Yeni Şifre</label>
            <input
              id="new-password"
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 8 karakter"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirm-password">Yeni Şifre (Tekrar)</label>
            <input
              id="confirm-password"
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              autoComplete="new-password"
              minLength={8}
            />
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        {saved  && <span className={styles.successMsg}><Icon icon={Check} size="xs" /> Şifre güncellendi</span>}
        {error  && <span className={styles.errorMsg}>{error}</span>}
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={pending || !password || !confirmPassword}
        >
          {pending ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
        </button>
      </div>
    </div>
  )
}
