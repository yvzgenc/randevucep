import React from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireOwnerBusiness } from '@/lib/supabase/business'
import { Sidebar } from '@/components/dashboard/Sidebar'
import styles from './dashboard-layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const business = await requireOwnerBusiness(supabase, user.id, { requireOnboarded: true })

  return (
    <div className={styles.shell}>
      <Sidebar business={business} userEmail={user.email ?? ''} />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
