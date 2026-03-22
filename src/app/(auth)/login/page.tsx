import type { Metadata } from 'next'
import { LoginForm } from './LoginForm'
import styles from '../auth.module.css'

export const metadata: Metadata = { title: 'Giriş Yap' }

export default function LoginPage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>✂ SalonCep</div>
        <h1 className={styles.heading}>Giriş Yap</h1>
        <p className={styles.sub}>Hesabınıza erişmek için giriş yapın.</p>
        <LoginForm />
        <p className={styles.footer}>
          Hesabınız yok mu?{' '}
          <a href="/register">Ücretsiz kaydolun →</a>
        </p>
      </div>
    </div>
  )
}
