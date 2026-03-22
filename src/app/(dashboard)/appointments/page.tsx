import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../placeholder.module.css'

export const metadata: Metadata = { title: 'Randevular' }

export default async function AppointmentsPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <h1 className={styles.title}>Randevular</h1>
      <p className={styles.desc}>Randevu yönetimi FAZ 2&apos;de gelecek.</p>
    </div>
  )
}
