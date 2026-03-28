'use server'

import { revalidatePath }             from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// ── Slug yardımcısı ───────────────────────────────────────────────────────────

function sanitizeSlug(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

export interface ProfileInput {
  businessId:     number
  name:           string
  slug:           string
  phone:          string
  city:           string
  address:        string
  whatsapp:       string
}

export async function saveBusinessProfile(
  input: ProfileInput,
): Promise<{ error: string | null }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum açmanız gerekiyor.' }

  const name    = input.name.trim()
  const slug    = sanitizeSlug(input.slug)
  const phone   = input.phone.trim()   || null
  const city    = input.city.trim()    || null
  const address = input.address.trim() || null
  const wa      = input.whatsapp.trim() || null

  if (!name)  return { error: 'İşletme adı zorunludur.'     }
  if (!slug)  return { error: "Rezervasyon URL'si zorunludur." }
  if (slug.length < 3) return { error: "Rezervasyon URL'si en az 3 karakter olmalıdır." }

  // Ownership check
  const bizQ = await supabase
    .from('businesses')
    .select('id, slug')
    .eq('id', input.businessId)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (!bizQ.data) return { error: 'İşletme bulunamadı.' }

  // Slug uniqueness — only check if slug changed
  if (bizQ.data.slug !== slug) {
    const slugQ = await supabase
      .from('businesses')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (slugQ.data) {
      return { error: "Bu rezervasyon URL'si başka bir işletme tarafından kullanılıyor. Lütfen farklı bir tane seçin." }
    }
  }

  const { error } = await supabase
    .from('businesses')
    .update({ name, slug, phone, city, address, whatsapp_number: wa })
    .eq('id', input.businessId)

  if (error) return { error: error.message }

  revalidatePath('/settings')
  revalidatePath('/dashboard')
  return { error: null }
}
