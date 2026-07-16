// ─── Service-role Supabase client ────────────────────────────────────────────
// Bypasses RLS — only for trusted server-side contexts (webhooks, cron jobs,
// internal notification triggers) that have no user session to authenticate
// with. Never expose this client or its result to the browser.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Supabase service client not configured — NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.')
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } })
}
