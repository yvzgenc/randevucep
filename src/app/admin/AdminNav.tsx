'use client'

import Link             from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Building2, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'
import styles from './admin.module.css'

const NAV = [
  { href: '/admin',            icon: LayoutDashboard, label: 'Genel Bakış' },
  { href: '/admin/businesses', icon: Building2,       label: 'İşletmeler'  },
]

export function AdminNav() {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className={styles.sidebarInner}>
      <nav className={styles.sidebarNav}>
        {NAV.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}><Icon icon={item.icon} size="sm" /></span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className={styles.sidebarBottom}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <Icon icon={LogOut} size="sm" />
          Çıkış Yap
        </button>
      </div>
    </div>
  )
}
