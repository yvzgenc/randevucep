import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { OnboardingFlow } from './OnboardingFlow'

export const metadata: Metadata = { title: 'İşletmenizi Kurun' }

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware already guards this, but double-check for safety
  if (!user) {
    redirect('/login')
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id)
    .maybeSingle()

  // Already completed onboarding → go to dashboard
  if (business?.onboarding_completed) {
    redirect('/dashboard')
  }

  // Pull full_name from auth metadata (set during signUp)
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ?? ''

  return (
    <OnboardingFlow
      userId={user.id}
      userEmail={user.email ?? ''}
      fullName={fullName}
      existingBusinessId={business?.id ?? null}
    />
  )
}
