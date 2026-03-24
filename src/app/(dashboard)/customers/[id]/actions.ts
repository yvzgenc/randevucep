'use server'

import { revalidatePath }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function saveCustomerNote(opts: {
  customerId:  number
  businessId:  number
  notes:       string
}): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  // Verify ownership — customer must belong to this business
  const bizQuery = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', user.id)
    .eq('id', opts.businessId)
    .maybeSingle()

  if (!bizQuery.data) return { error: 'Yetki hatası.' }

  const { error } = await supabase
    .from('customers')
    .update({ notes: opts.notes.trim() || null })
    .eq('id', opts.customerId)
    .eq('business_id', opts.businessId)

  if (error) return { error: error.message }

  revalidatePath(`/customers/${opts.customerId}`)
  return { error: null }
}
