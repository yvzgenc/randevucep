'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Plus, List, LayoutGrid, Search, X, Filter,
  Hourglass, CheckCircle2, Star, Calendar,
} from 'lucide-react'
import type { Appointment, Service, StaffMember } from '@/types/database'
import { CalendarView }          from './CalendarView'
import { AppointmentActions }    from './AppointmentActions'
import { AddAppointmentModal }   from './AddAppointmentModal'
import { NoteEditor }            from './NoteEditor'
import { Icon }                  from '@/components/ui/Icon'
import calStyles  from './calendar.module.css'
import styles     from './appointments.module.css'
import tabStyles  from './appt-tabs.module.css'
import srchStyles from './search.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  appointments: Appointment[]
  services:     Service[]
  staff:        StaffMember[]
}
type TabId = 'all' | 'pending' | 'confirmed' | 'done' | 'cancelled'

const TABS: { id: TabId; label: string; empty: string }[] = [
  { id: 'all',       label: 'Tümü',       empty: 'Hiç randevu yok.'           },
  { id: 'pending',   label: 'Bekleyen',   empty: 'Onay bekleyen randevu yok.' },
  { id: 'confirmed', label: 'Onaylı',     empty: 'Onaylanmış randevu yok.'    },
  { id: 'done',      label: 'Tamamlanan', empty: 'Tamamlanan randevu yok.'    },
  { id: 'cancelled', label: 'İptal',      empty: 'İptal edilen randevu yok.'  },
]

function matchesTab(status: string | null, tab: TabId): boolean {
  if (tab === 'all')       return true
  if (tab === 'pending')   return status === 'Bekliyor'   || status === 'pending'
  if (tab === 'confirmed') return status === 'Onaylı'     || status === 'confirmed'
  if (tab === 'done')      return status === 'Tamamlandı'
  if (tab === 'cancelled') return status === 'İptal'      || status === 'Gelmedi'
  return false
}

function statusBadgeCls(status: string | null): string {
  switch (status) {
    case 'Tamamlandı':               return styles.badgeDone
    case 'Onaylı': case 'confirmed': return styles.badgeConfirmed
    case 'İptal':  case 'Gelmedi':   return styles.badgeCancelled
    default:                         return styles.badgePending
  }
}

function norm(s: string): string {
  return s.toLowerCase()
    .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
    .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
}

// ─── Component ────────────────────────────────────────────────────────────────
export function AppointmentsClient({ appointments, services, staff }: Props) {
  const [tab,       setTab]       = useState<TabId>('all')
  const [view,      setView]      = useState<'list' | 'week'>('list')
  const [showModal, setShowModal] = useState(false)

  // ── Search & filter state ──────────────────────────────────────────────────
  const [query,     setQuery]     = useState('')
  const [staffSel,  setStaffSel]  = useState('')
  const [svcSel,    setSvcSel]    = useState('')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Unique staff & service lists for dropdowns
  const staffList = useMemo(
    () => [...new Set(appointments.map((a) => a.staff_name))].sort(),
    [appointments],
  )
  const svcList = useMemo(
    () => [...new Set(appointments.map((a) => a.service_name))].sort(),
    [appointments],
  )

  const hasActiveFilter = Boolean(query || staffSel || svcSel || dateFrom || dateTo)

  function clearFilters() {
    setQuery(''); setStaffSel(''); setSvcSel(''); setDateFrom(''); setDateTo('')
  }

  // ── Counts per tab (before search filter) ─────────────────────────────────
  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: 0, pending: 0, confirmed: 0, done: 0, cancelled: 0 }
    for (const a of appointments) {
      c.all++
      if (matchesTab(a.status, 'pending'))   c.pending++
      if (matchesTab(a.status, 'confirmed')) c.confirmed++
      if (matchesTab(a.status, 'done'))      c.done++
      if (matchesTab(a.status, 'cancelled')) c.cancelled++
    }
    return c
  }, [appointments])

  // ── Combined filter: tab + search + filters ────────────────────────────────
  const filtered = useMemo(() => {
    const q = norm(query.trim())
    return appointments.filter((a) => {
      // Tab
      if (!matchesTab(a.status, tab)) return false
      // Text search: name, phone, service, staff
      if (q && !norm(a.customer_name).includes(q) &&
               !a.customer_phone.includes(q) &&
               !norm(a.service_name).includes(q) &&
               !norm(a.staff_name).includes(q)) return false
      // Staff dropdown
      if (staffSel && a.staff_name !== staffSel) return false
      // Service dropdown
      if (svcSel   && a.service_name !== svcSel)   return false
      // Date from
      if (dateFrom && a.appointment_date < dateFrom) return false
      // Date to
      if (dateTo   && a.appointment_date > dateTo)   return false
      return true
    })
  }, [appointments, tab, query, staffSel, svcSel, dateFrom, dateTo])

  const currentTab = TABS.find((t) => t.id === tab)!

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Randevular</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            className={styles.addBtn}
            onClick={() => setShowModal(true)}
            type="button"
          >
            <Icon icon={Plus} size="sm" /> Randevu Ekle
          </button>
          <div className={calStyles.viewToggle}>
            <button
              className={`${calStyles.viewBtn} ${view === 'list' ? calStyles.viewBtnActive : ''}`}
              onClick={() => setView('list')}
            ><Icon icon={List} size="xs" /> Liste</button>
            <button
              className={`${calStyles.viewBtn} ${view === 'week' ? calStyles.viewBtnActive : ''}`}
              onClick={() => setView('week')}
            ><Icon icon={LayoutGrid} size="xs" /> Hafta</button>
          </div>
        </div>
      </div>

      {/* ── Add appointment modal ── */}
      {showModal && (
        <AddAppointmentModal
          services={services}
          staff={staff}
          onClose={() => setShowModal(false)}
          onDone={() => { setShowModal(false); window.location.reload() }}
        />
      )}

      {/* ── Tab bar ── */}
      <div className={tabStyles.tabBar}>
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`${tabStyles.tab} ${tab === t.id ? tabStyles.tabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
            {counts[t.id] > 0 && (
              <span className={`${tabStyles.badge} ${
                t.id === 'pending'   ? tabStyles.badgeWarn   :
                t.id === 'confirmed' ? tabStyles.badgeAccent :
                t.id === 'done'      ? tabStyles.badgeGreen  :
                t.id === 'cancelled' ? tabStyles.badgeRed    : tabStyles.badgeGray
              }`}>{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Search & filter bar ── */}
      {view === 'list' && (
        <div className={srchStyles.searchBar}>
          {/* Text search */}
          <div className={srchStyles.searchInputWrap}>
            <span className={srchStyles.searchIcon}><Icon icon={Search} size="sm" /></span>
            <input
              className={srchStyles.searchInput}
              type="text"
              placeholder="Müşteri adı, telefon, hizmet veya personel…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className={srchStyles.clearBtn} onClick={() => setQuery('')} type="button">
                <Icon icon={X} size="xs" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            className={`${srchStyles.filterToggle} ${(showFilters || hasActiveFilter) ? srchStyles.filterToggleActive : ''}`}
            onClick={() => setShowFilters((v) => !v)}
            type="button"
          >
            <Icon icon={Filter} size="sm" /> Filtre
            {hasActiveFilter && <span className={srchStyles.filterDot} />}
          </button>
        </div>
      )}

      {/* ── Expanded filters ── */}
      {view === 'list' && showFilters && (
        <div className={srchStyles.filterPanel}>
          <div className={srchStyles.filterGrid}>
            {/* Staff */}
            <div className={srchStyles.filterField}>
              <label className={srchStyles.filterLabel}>Personel</label>
              <select
                className={srchStyles.filterSelect}
                value={staffSel}
                onChange={(e) => setStaffSel(e.target.value)}
              >
                <option value="">Tümü</option>
                {staffList.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Service */}
            <div className={srchStyles.filterField}>
              <label className={srchStyles.filterLabel}>Hizmet</label>
              <select
                className={srchStyles.filterSelect}
                value={svcSel}
                onChange={(e) => setSvcSel(e.target.value)}
              >
                <option value="">Tümü</option>
                {svcList.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Date from */}
            <div className={srchStyles.filterField}>
              <label className={srchStyles.filterLabel}>Tarihten</label>
              <input
                type="date"
                className={srchStyles.filterSelect}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            {/* Date to */}
            <div className={srchStyles.filterField}>
              <label className={srchStyles.filterLabel}>Tarihe Kadar</label>
              <input
                type="date"
                className={srchStyles.filterSelect}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {hasActiveFilter && (
            <button className={srchStyles.clearAllBtn} onClick={clearFilters} type="button">
              <Icon icon={X} size="xs" /> Filtreleri Temizle
            </button>
          )}
        </div>
      )}

      {/* ── Result count ── */}
      {view === 'list' && hasActiveFilter && (
        <p className={srchStyles.resultCount}>
          {filtered.length} sonuç
          {filtered.length !== counts[tab] && ` (${counts[tab]} içinden)`}
        </p>
      )}

      {/* ── Calendar view ── */}
      {view === 'week' && (
        <CalendarView appointments={appointments} />
      )}

      {/* ── List view ── */}
      {view === 'list' && (
        filtered.length === 0 ? (
          <div className={styles.empty}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.35 }}>
              <Icon
                icon={
                  hasActiveFilter ? Search :
                  tab === 'pending' ? Hourglass : tab === 'confirmed' ? CheckCircle2 :
                  tab === 'done' ? Star : tab === 'cancelled' ? X : Calendar
                }
                size={32}
              />
            </div>
            <p className={styles.emptyTitle}>
              {hasActiveFilter ? 'Arama kriterinizle eşleşen randevu bulunamadı.' : currentTab.empty}
            </p>
            {hasActiveFilter && (
              <button className={srchStyles.clearAllBtn} onClick={clearFilters} style={{ margin: '12px auto 0', display: 'block' }}>
                Filtreleri Temizle
              </button>
            )}
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>Tarih / Saat</span>
              <span>Müşteri</span>
              <span>Hizmet</span>
              <span>Personel</span>
              <span>Durum</span>
              <span>Not</span>
              <span></span>
            </div>
            {filtered.map((appt) => (
              <div key={appt.id} className={styles.tableRow}>
                <span>
                  <span className={styles.date}>
                    {new Date(appt.appointment_date).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short',
                    })}
                  </span>
                  <span className={styles.time}>{appt.appointment_time}</span>
                </span>
                <span>
                  <span className={styles.primary}>{appt.customer_name}</span>
                  <span className={styles.phone}>{appt.customer_phone}</span>
                </span>
                <span className={styles.muted}>{appt.service_name}</span>
                <span className={styles.muted}>{appt.staff_name}</span>
                <span>
                  <span className={statusBadgeCls(appt.status)}>
                    {appt.status ?? 'Bekliyor'}
                  </span>
                </span>
                <span>
                  <NoteEditor
                    appointmentId={appt.id}
                    initialNote={appt.notes ?? null}
                  />
                </span>
                <span>
                  <AppointmentActions
                    appointmentId={appt.id}
                    currentStatus={appt.status}
                    savedEmail={appt.customer_email ?? null}
                  />
                </span>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
