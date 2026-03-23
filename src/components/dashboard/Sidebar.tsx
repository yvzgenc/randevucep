'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Business } from '@/types/database'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Genel Bakış', icon: '◧'  },
  { href: '/appointments', label: 'Randevular',   icon: '📅' },
  { href: '/services',     label: 'Hizmetler',    icon: '✂'  },
  { href: '/staff',        label: 'Personel',     icon: '👤' },
  { href: '/customers',    label: 'Müşteriler',   icon: '👥' },
  { href: '/settings',     label: 'Ayarlar',      icon: '⚙'  },
]

interface Props {
  business:  Business
  userEmail: string
}

export function Sidebar({ business, userEmail }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className={styles.mobileBar}>
        <span className={styles.mobileLogo}>
          <span>📅</span> RandevuCep
        </span>
        <button
          className={styles.menuBtn}
          onClick={() => setOpen((v: boolean) => !v)}
          aria-label="Menü"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        {/* Brand */}
        <div className={styles.top}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>📅</div>
            <span className={styles.logoText}>RandevuCep</span>
          </div>
          <div className={styles.bizCard}>
            <div className={styles.bizName}>{business.name}</div>
            <div className={styles.plan}>{(business.plan ?? 'starter').toUpperCase()}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.active : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className={styles.icon}>{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className={styles.bottom}>
          <a
            href={`/book/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className={styles.bookingLink}
          >
            🔗 Rezervasyon Sayfam
          </a>
          <div className={styles.userRow}>
            <span className={styles.userEmail}>{userEmail}</span>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              Çıkış
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className={styles.overlay}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
    </>
  )
}
