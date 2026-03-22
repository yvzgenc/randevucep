import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../placeholder.module.css'

export const metadata: Metadata = { title: 'Müşteriler' }

export default async function CustomersPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <h1 className={styles.title}>Müşteriler</h1>
      <p className={styles.desc}>Müşteri listesi bir sonraki fazda eklenecek.</p>
    </div>
  )
}
