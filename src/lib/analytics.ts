// ─── Analytics helpers ─────────────────────────────────────────────────────────
// Pure aggregation functions that work on already-fetched appointment rows.
// No DB calls here — keep this side-effect free and easy to test.

export interface AppointmentRow {
  status:           string | null
  service_name:     string
  staff_name:       string
  appointment_date: string
}

export interface CountByKey {
  key:   string
  count: number
}

export interface TrendDay {
  date:      string   // YYYY-MM-DD
  label:     string   // e.g. "Pzt"
  count:     number
}

// ─── Status counts ────────────────────────────────────────────────────────────

export interface StatusCounts {
  bekliyor:   number
  onaylı:     number
  tamamlandı: number
  iptal:      number
  gelmedi:    number
  other:      number
  total:      number
}

const STATUS_MAP: Record<string, keyof Omit<StatusCounts, 'total'>> = {
  'Bekliyor':   'bekliyor',
  'bekliyor':   'bekliyor',
  'pending':    'bekliyor',
  'Onaylı':     'onaylı',
  'onaylı':     'onaylı',
  'confirmed':  'onaylı',
  'Tamamlandı': 'tamamlandı',
  'tamamlandı': 'tamamlandı',
  'completed':  'tamamlandı',
  'İptal':      'iptal',
  'iptal':      'iptal',
  'canceled':   'iptal',
  'cancelled':  'iptal',
  'Gelmedi':    'gelmedi',
  'gelmedi':    'gelmedi',
  'no_show':    'gelmedi',
}

export function countByStatus(rows: AppointmentRow[]): StatusCounts {
  const counts: StatusCounts = {
    bekliyor: 0, onaylı: 0, tamamlandı: 0,
    iptal: 0, gelmedi: 0, other: 0, total: rows.length,
  }
  for (const r of rows) {
    const key = r.status ? STATUS_MAP[r.status] ?? 'other' : 'other'
    counts[key]++
  }
  return counts
}

// ─── Top services ─────────────────────────────────────────────────────────────

export function topServices(rows: AppointmentRow[], limit = 5): CountByKey[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = r.service_name.trim()
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ─── Top staff ────────────────────────────────────────────────────────────────

export function topStaff(rows: AppointmentRow[], limit = 5): CountByKey[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = r.staff_name.trim()
    map.set(k, (map.get(k) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

// ─── 7-day trend ──────────────────────────────────────────────────────────────

const TR_DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

/** Returns the last `days` calendar dates as YYYY-MM-DD, oldest first. */
export function lastNDates(days = 7): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    return d.toISOString().split('T')[0]
  })
}

export function trendLast7Days(rows: AppointmentRow[]): TrendDay[] {
  const dates = lastNDates(7)
  const map = new Map<string, number>()
  for (const r of rows) {
    const d = r.appointment_date.slice(0, 10)
    if (dates.includes(d)) {
      map.set(d, (map.get(d) ?? 0) + 1)
    }
  }
  return dates.map((date) => {
    const dayOfWeek = new Date(date + 'T12:00:00').getDay()
    return {
      date,
      label: TR_DAYS[dayOfWeek] ?? date.slice(5),
      count: map.get(date) ?? 0,
    }
  })
}

// ─── Date range helpers ───────────────────────────────────────────────────────

/** YYYY-MM-DD for today. */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

/** YYYY-MM-DD for Monday of the current week (ISO week). */
export function weekStartISO(): string {
  const d = new Date()
  const day = d.getDay()          // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

/** YYYY-MM-DD for the first day of the current month. */
export function monthStartISO(): string {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}
