import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import styles from '../placeholder.module.css'

export const metadata: Metadata = { title: 'Personel' }

export default async function StaffPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div>
      <h1 className={styles.title}>Personel</h1>
      <p className={styles.desc}>Personel yönetimi bir sonraki fazda eklenecek.</p>
    </div>
  )
}
