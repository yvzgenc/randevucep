import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import styles from './status.module.css'

export const metadata: Metadata = { title: 'Sayfa Bulunamadı' }

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><Icon icon={Calendar} size="sm" /> RandevuCep</div>
        <p className={styles.code}>404</p>
        <h1 className={styles.heading}>Sayfa bulunamadı</h1>
        <p className={styles.sub}>
          Aradığınız sayfa taşınmış, kaldırılmış olabilir ya da hiç var olmamış
          olabilir.
        </p>
        <div className={styles.actions}>
          <a href="/" className={styles.homeLink}>Ana sayfaya dön</a>
        </div>
      </div>
    </div>
  )
}
