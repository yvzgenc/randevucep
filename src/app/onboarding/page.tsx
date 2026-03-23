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

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ''

  return (
    <OnboardingFlow
      userId={user.id}
      userEmail={user.email ?? ''}
      fullName={fullName}
      existingBusinessId={business?.id            ?? null}
      existingType={      business?.business_type ?? null}
      existingName={      business?.name          ?? null}
      existingSlug={      business?.slug          ?? null}
      existingPhone={     business?.phone         ?? null}
      existingCity={      business?.city          ?? null}
    />
  )
}
