import React from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'
import { AdminNav }    from './AdminNav'
import styles from './admin.module.css'

export const metadata = { title: 'Admin Panel' }

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
        {/* AdminNav is client component — handles active state via usePathname */}
        <AdminNav />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  )
}
