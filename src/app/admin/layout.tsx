import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import styles from './admin.module.css'

export const metadata = { title: 'Admin Panel' }

const NAV = [
  { href: '/admin',             icon: '◧',  label: 'Genel Bakış' },
  { href: '/admin/businesses',  icon: '🏢',  label: 'İşletmeler'  },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!isAdminEmail(user.email)) redirect('/dashboard')

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <div className={styles.sidebarLogoMark}>⚙</div>
          <span className={styles.sidebarLogoText}>RandevuCep</span>
          <span className={styles.sidebarBadge}>Admin</span>
        </div>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className={styles.navItem}>
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
