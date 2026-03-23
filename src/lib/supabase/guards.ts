// ─── Supabase query result guards ─────────────────────────────────────────────
// Project-wide helpers for consistent error + nullability handling.
//
// Standard rules enforced here:
//   1. Destructure { data, error } from every query; check error first.
//   2. Never pass nullable schema fields (business_id, customer_email, etc.)
//      to .eq() or business logic without an explicit null guard.
//   3. For update()-affected-row counts: chain .select('id') on the update
//      builder and check data.length.  Do NOT use { count: 'exact', head: true }
//      on update() — the Supabase JS v2 update builder does not support it.

import type {
  PostgrestSingleResponse,
  PostgrestMaybeSingleResponse,
  PostgrestResponse,
} from '@supabase/supabase-js'

// ─── unwrapSingle ─────────────────────────────────────────────────────────────

/**
 * Unwraps a `.single()` result.
 * Returns data (never undefined) or null on error; logs the error.
 */
export function unwrapSingle<T>(
  result: PostgrestSingleResponse<T>,
  label?: string,
): T | null {
  if (result.error) {
    console.error(`[db${label ? `/${label}` : ''}]`, result.error.message)
    return null
  }
  return result.data
}

// ─── unwrapMaybe ──────────────────────────────────────────────────────────────

/**
 * Unwraps a `.maybeSingle()` result.
 * Returns data or null; logs DB errors (not the "zero rows" case).
 */
export function unwrapMaybe<T>(
  result: PostgrestMaybeSingleResponse<T>,
  label?: string,
): T | null {
  if (result.error) {
    console.error(`[db${label ? `/${label}` : ''}]`, result.error.message)
    return null
  }
  return result.data ?? null
}

// ─── unwrapMany ───────────────────────────────────────────────────────────────

/**
 * Unwraps a `.select()` array result.
 * Returns the array (never null/undefined); logs errors.
 */
export function unwrapMany<T>(
  result: PostgrestResponse<T>,
  label?: string,
): T[] {
  if (result.error) {
    console.error(`[db${label ? `/${label}` : ''}]`, result.error.message)
    return []
  }
  return result.data ?? []
}

// ─── requireNonNull ───────────────────────────────────────────────────────────

/**
 * Narrows a nullable value to non-null/undefined, throwing a descriptive
 * Error when the value is absent. Use in server code where a DB column is
 * declared nullable but the business logic requires a concrete value.
 *
 * @example
 *   const bizId = requireNonNull(appt.business_id, 'appointment.business_id')
 *   // bizId: number  (not number | null)
 */
export function requireNonNull<T>(value: T | null | undefined, field: string): T {
  if (value == null) {
    throw new Error(`Required field "${field}" is null or undefined.`)
  }
  return value
}
