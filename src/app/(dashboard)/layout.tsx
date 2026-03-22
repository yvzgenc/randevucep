import React from 'react'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/Sidebar'
import styles from './dashboard-layout.module.css'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!business) {
    redirect('/onboarding')
  }

  if (!business.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className={styles.shell}>
      <Sidebar
        business={business}
        userEmail={user.email ?? ''}
      />
      <main className={styles.main}>{children}</main>
    </div>
  )
}
