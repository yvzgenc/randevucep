// ─── Display formatters ───────────────────────────────────────────────────────
// Pure helper functions for formatting dates, amounts, and status labels.
// No external dependencies.

// ─── Date formatting ──────────────────────────────────────────────────────────

const TR_DATE: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: 'long', day: 'numeric',
}

const TR_DATETIME: Intl.DateTimeFormatOptions = {
  year: 'numeric', month: 'short', day: 'numeric',
  hour: '2-digit', minute: '2-digit',
}

/**
 * Formats an ISO date string as "15 Ocak 2026".
 * Returns "—" for null/undefined.
 */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('tr-TR', TR_DATE)
  } catch {
    return '—'
  }
}

/**
 * Formats an ISO datetime string as "15 Oca 2026, 14:30".
 * Returns "—" for null/undefined.
 */
export function fmtDatetime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('tr-TR', TR_DATETIME)
  } catch {
    return '—'
  }
}

// ─── Money formatting ─────────────────────────────────────────────────────────

/**
 * Formats an amount + currency code as "₺299,00" or "299.00 USD".
 */
export function fmtAmount(amount: number, currency: string): string {
  const upper = currency.toUpperCase()
  try {
    return new Intl.NumberFormat('tr-TR', {
      style:    'currency',
      currency: upper,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    // Fallback for unknown currency codes
    return `${amount.toFixed(2)} ${upper}`
  }
}

// ─── Subscription status labels ───────────────────────────────────────────────

export type SubStatusKey = 'active' | 'canceled' | 'past_due' | 'trial' | string

export interface StatusDisplay {
  label: string
  /** CSS class suffix — map to .badgeActive, .badgeCanceled etc. in CSS */
  variant: 'active' | 'trial' | 'warning' | 'error' | 'neutral'
}

export function subscriptionStatusDisplay(
  status:      string | null | undefined,
  inTrial:     boolean,
): StatusDisplay {
  if (!status) return { label: 'Bilinmiyor', variant: 'neutral' }

  if (status === 'active' && inTrial) {
    return { label: 'Deneme Sürümü', variant: 'trial' }
  }
  switch (status) {
    case 'active':    return { label: 'Aktif',    variant: 'active'  }
    case 'canceled':  return { label: 'İptal',    variant: 'error'   }
    case 'past_due':  return { label: 'Gecikmiş', variant: 'warning' }
    default:          return { label: status,     variant: 'neutral' }
  }
}

// ─── Payment status labels ────────────────────────────────────────────────────

export function paymentStatusDisplay(status: string | null | undefined): StatusDisplay {
  switch (status) {
    case 'success':  return { label: 'Başarılı', variant: 'active'  }
    case 'pending':  return { label: 'Bekliyor', variant: 'trial'   }
    case 'failed':   return { label: 'Başarısız', variant: 'error'  }
    case 'canceled': return { label: 'İptal',    variant: 'error'   }
    default:         return { label: status ?? '—', variant: 'neutral' }
  }
}

// ─── Billing period labels ────────────────────────────────────────────────────

export function fmtBillingPeriod(period: string | null | undefined): string {
  if (!period) return '—'
  if (period === 'monthly') return 'Aylık'
  if (period === 'yearly')  return 'Yıllık'
  return period
}

// ─── Provider labels ──────────────────────────────────────────────────────────

export function fmtProvider(provider: string | null | undefined): string {
  if (!provider) return '—'
  if (provider === 'iyzico') return 'iyzico'
  return provider.charAt(0).toUpperCase() + provider.slice(1)
}
