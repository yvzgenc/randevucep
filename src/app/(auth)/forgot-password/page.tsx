import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { Icon } from '@/components/ui/Icon'
import styles from '../auth.module.css'

export const metadata: Metadata = { title: 'Şifremi Unuttum' }

export default function ForgotPasswordPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><Icon icon={Calendar} size="sm" /> RandevuCep</div>
        <h1 className={styles.heading}>Şifrenizi mi unuttunuz?</h1>
        <p className={styles.sub}>
          E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.
        </p>
        <ForgotPasswordForm />
        <p className={styles.footer}>
          Şifrenizi hatırladınız mı?{' '}
          <a href="/login">Giriş yapın →</a>
        </p>
      </div>
    </div>
  )
}
