import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Local type for the setAll cookie parameter.
// Mirrors @supabase/ssr's internal shape without importing it directly,
// avoiding CookieOptions/ResponseCookie version drift across @supabase/ssr releases.
type CookieItem = {
  name: string
  value: string
  options?: Record<string, unknown>
}

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieItem[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — cookie writes not available, safe to ignore
          }
        },
      },
    }
  ) as SupabaseClient<Database>
}
