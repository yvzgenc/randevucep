import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()

  const authQuery = await supabase.auth.getUser()
  const user = authQuery.data.user

  if (!user) {
    redirect('/login')
  }

  // Admin users go directly to /admin panel
  if (isAdminEmail(user.email)) {
    redirect('/admin')
  }

  // Normal business users: check onboarding state
  const bizQuery = await supabase
    .from('businesses')
    .select('id, onboarding_completed')
    .eq('owner_id', user.id)
    .maybeSingle()

  const business = bizQuery.data

  if (!business || !business.onboarding_completed) {
    redirect('/onboarding')
  }

  redirect('/dashboard')
}
