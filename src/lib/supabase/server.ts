import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Explicit return type forces TypeScript to use SupabaseClient<Database>
// from @supabase/supabase-js instead of inferring from @supabase/ssr's
// complex conditional generic — which can resolve to never when cookie
// option types don't exactly match the installed Next.js version.
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
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component context — cookie writes are not available, safe to ignore
          }
        },
      },
    }
  ) as SupabaseClient<Database>
}
