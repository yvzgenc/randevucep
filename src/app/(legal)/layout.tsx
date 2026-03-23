import React from 'react'
import Link  from 'next/link'
import styles from './legal.module.css'

const FOOTER_LINKS = [
  { href: '/privacy', label: 'Gizlilik Politikası' },
  { href: '/terms',   label: 'Kullanım Koşulları'  },
  { href: '/kvkk',    label: 'KVKK'                },
  { href: '/contact', label: 'İletişim'             },
]

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      {/* Top navigation */}
      <nav className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoMark}>📅</div>
          <span className={styles.logoText}>RandevuCep</span>
        </Link>
        <div className={styles.navLinks}>
          <Link href="/login"    className={styles.navLink}>Giriş Yap</Link>
          <Link href="/register" className={styles.navCta}>Ücretsiz Başla</Link>
        </div>
      </nav>

      {children}

      {/* Footer */}
      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} RandevuCep. Tüm hakları saklıdır.</span>
        <div className={styles.footerLinks}>
          {FOOTER_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={styles.footerLink}>
              {l.label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
