'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import {
  LayoutDashboard, Calendar, Scissors, User, Users, Settings,
  Link2, X, Menu,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'
import type { Business } from '@/types/database'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { href: '/dashboard',    label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/appointments', label: 'Randevular',   icon: Calendar        },
  { href: '/services',     label: 'Hizmetler',    icon: Scissors        },
  { href: '/staff',        label: 'Personel',     icon: User            },
  { href: '/customers',    label: 'Müşteriler',   icon: Users           },
  { href: '/settings',     label: 'Ayarlar',      icon: Settings        },
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
          <Icon icon={Calendar} size="sm" /> RandevuCep
        </span>
        <button
          className={styles.menuBtn}
          onClick={() => setOpen((v: boolean) => !v)}
          aria-label="Menü"
        >
          <Icon icon={open ? X : Menu} size="sm" />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>
        {/* Brand */}
        <div className={styles.top}>
          <div className={styles.logo}>
            <div className={styles.logoMark}><Icon icon={Calendar} size="lg" /></div>
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
                <span className={styles.icon}><Icon icon={item.icon} size="sm" /></span>
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
            <Icon icon={Link2} size="xs" /> Rezervasyon Sayfam
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
