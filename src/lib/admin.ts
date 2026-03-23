// ─── Admin access control ─────────────────────────────────────────────────────
// Simple email-allowlist approach.
//
// Production: set ADMIN_EMAILS env var as a comma-separated list.
//   ADMIN_EMAILS=you@example.com,partner@example.com
//
// The check is server-only (never runs in the browser).

/** Return the set of allowed admin emails from env. */
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
}

/** Returns true if the given email is an allowed super-admin. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return getAdminEmails().has(email.toLowerCase())
}
