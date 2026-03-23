// ─── Plan definitions ─────────────────────────────────────────────────────────
// Single source of truth for plan names, limits, and display config.
// Add new plans or change limits here only.

export const PLAN_NAMES = ['starter', 'pro', 'business'] as const
export type PlanName = (typeof PLAN_NAMES)[number]

export interface PlanLimits {
  max_staff:             number   // max active staff members
  max_services:          number   // max active services
  monthly_appointments:  number   // max appointments per calendar month (-1 = unlimited)
  online_booking_enabled: boolean // whether public /book/[slug] accepts new appointments
}

export interface PlanConfig extends PlanLimits {
  label:       string
  description: string
  price_try:   number   // monthly price in TRY (0 = free/trial)
  highlighted: boolean  // show as "popular" in upgrade UI
}

export const PLANS: Record<PlanName, PlanConfig> = {
  starter: {
    label:                  'Starter',
    description:            'Küçük işletmeler için temel özellikler.',
    price_try:              0,
    highlighted:            false,
    max_staff:              2,
    max_services:           5,
    monthly_appointments:   30,
    online_booking_enabled: true,
  },
  pro: {
    label:                  'Pro',
    description:            'Büyüyen işletmeler için tam özellik seti.',
    price_try:              299,
    highlighted:            true,
    max_staff:              10,
    max_services:           30,
    monthly_appointments:   -1,   // unlimited
    online_booking_enabled: true,
  },
  business: {
    label:                  'Business',
    description:            'Çok şubeli işletmeler için sınırsız kullanım.',
    price_try:              699,
    highlighted:            false,
    max_staff:              -1,   // unlimited
    max_services:           -1,
    monthly_appointments:   -1,
    online_booking_enabled: true,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Safely coerce a raw string to PlanName, falling back to 'starter'. */
export function toPlanName(raw: string | null | undefined): PlanName {
  if (raw && (PLAN_NAMES as readonly string[]).includes(raw)) {
    return raw as PlanName
  }
  return 'starter'
}

/** Get plan config for a raw plan string. */
export function getPlanConfig(raw: string | null | undefined): PlanConfig {
  return PLANS[toPlanName(raw)]
}

// ─── Trial helpers ────────────────────────────────────────────────────────────

export const TRIAL_DAYS = 14

/**
 * Returns the number of days remaining in a trial.
 * Returns null if trialEndsAt is null (no trial / already on paid plan).
 * Returns 0 if the trial has expired.
 */
export function trialDaysRemaining(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/** True if the subscription is still within its trial window. */
export function isInTrial(trialEndsAt: string | null): boolean {
  if (!trialEndsAt) return false
  return new Date(trialEndsAt).getTime() > Date.now()
}

// ─── Limit checks ─────────────────────────────────────────────────────────────

export interface LimitCheckResult {
  allowed: boolean
  /** Human-readable reason when not allowed */
  reason:  string
}

export function checkStaffLimit(
  planRaw:       string | null | undefined,
  currentCount:  number,
): LimitCheckResult {
  const { max_staff, label } = getPlanConfig(planRaw)
  if (max_staff === -1) return { allowed: true, reason: '' }
  if (currentCount < max_staff) return { allowed: true, reason: '' }
  return {
    allowed: false,
    reason:  `${label} planında en fazla ${max_staff} personel ekleyebilirsiniz.`,
  }
}

export function checkServicesLimit(
  planRaw:      string | null | undefined,
  currentCount: number,
): LimitCheckResult {
  const { max_services, label } = getPlanConfig(planRaw)
  if (max_services === -1) return { allowed: true, reason: '' }
  if (currentCount < max_services) return { allowed: true, reason: '' }
  return {
    allowed: false,
    reason:  `${label} planında en fazla ${max_services} hizmet ekleyebilirsiniz.`,
  }
}

export function checkMonthlyAppointments(
  planRaw:       string | null | undefined,
  monthlyCount:  number,
): LimitCheckResult {
  const { monthly_appointments, label } = getPlanConfig(planRaw)
  if (monthly_appointments === -1) return { allowed: true, reason: '' }
  if (monthlyCount < monthly_appointments) return { allowed: true, reason: '' }
  return {
    allowed: false,
    reason:  `${label} planında aylık en fazla ${monthly_appointments} randevu alınabilir.`,
  }
}

export function checkOnlineBooking(
  planRaw: string | null | undefined,
): LimitCheckResult {
  const { online_booking_enabled, label } = getPlanConfig(planRaw)
  if (online_booking_enabled) return { allowed: true, reason: '' }
  return {
    allowed: false,
    reason:  `${label} planında online rezervasyon kapalıdır.`,
  }
}
