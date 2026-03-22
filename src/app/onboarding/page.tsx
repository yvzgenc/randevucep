import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { OnboardingFlow } from './OnboardingFlow'

export const metadata: Metadata = { title: 'İşletmenizi Kurun' }

export default async function OnboardingPage() {
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

  if (business?.onboarding_completed) {
    redirect('/dashboard')
  }

  return (
    <OnboardingFlow
      userId={user.id}
      existingBusinessId={business?.id ?? null}
    />
  )
}
