import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'
import { RegisterForm } from './RegisterForm'
import { Icon } from '@/components/ui/Icon'
import styles from '../auth.module.css'

export const metadata: Metadata = { title: 'Kayıt Ol' }

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><Icon icon={Calendar} size="sm" /> RandevuCep</div>
        <h1 className={styles.heading}>Hesap Oluştur</h1>
        <p className={styles.sub}>14 gün ücretsiz deneyin, kredi kartı gerekmez.</p>
        <RegisterForm />
        <p className={styles.footer}>
          Zaten hesabınız var mı?{' '}
          <a href="/login">Giriş yapın →</a>
        </p>
      </div>
    </div>
  )
}
