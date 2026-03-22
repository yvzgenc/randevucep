import type { Metadata } from 'next'
import { RegisterForm } from './RegisterForm'
import styles from '../auth.module.css'

export const metadata: Metadata = { title: 'Kayıt Ol' }

export default function RegisterPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>✂ SalonCep</div>
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
