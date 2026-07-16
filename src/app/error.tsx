'use client'

import { useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import styles from './status.module.css'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><Icon icon={Calendar} size="sm" /> RandevuCep</div>
        <p className={styles.code}>Bir şeyler ters gitti</p>
        <h1 className={styles.heading}>Beklenmeyen bir hata oluştu</h1>
        <p className={styles.sub}>
          Sayfayı yeniden yüklemeyi deneyebilirsiniz. Sorun devam ederse lütfen
          bizimle iletişime geçin.
        </p>
        <div className={styles.actions}>
          <Button onClick={reset}>Tekrar dene</Button>
          <a href="/" className={styles.homeLink}>Ana sayfaya dön</a>
        </div>
      </div>
    </div>
  )
}
