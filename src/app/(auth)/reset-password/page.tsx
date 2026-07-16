import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'
import { ResetPasswordForm } from './ResetPasswordForm'
import { Icon } from '@/components/ui/Icon'
import styles from '../auth.module.css'

export const metadata: Metadata = { title: 'Şifre Belirle' }

export default function ResetPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><Icon icon={Calendar} size="sm" /> RandevuCep</div>
        <h1 className={styles.heading}>Yeni şifre belirleyin</h1>
        <p className={styles.sub}>Hesabınız için yeni bir şifre girin.</p>
        <ResetPasswordForm />
      </div>
    </div>
  )
}
