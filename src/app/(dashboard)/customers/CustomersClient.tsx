'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Customer } from '@/types/database'
import styles    from './customers.module.css'
import tabStyles from '../appointments/appt-tabs.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props { customers: Customer[] }
type TabId = 'all' | 'repeat' | 'new' | 'noted'

const TABS: { id: TabId; label: string; empty: string }[] = [
  { id: 'all',    label: 'Tümü',          empty: 'Henüz müşteri yok.'                     },
  { id: 'repeat', label: 'Tekrar Gelen',  empty: 'Tekrar gelen müşteri henüz yok.'        },
  { id: 'new',    label: 'Yeni',          empty: 'Yeni müşteri yok.'                      },
  { id: 'noted',  label: 'Notlu',         empty: 'Not eklenmiş müşteri yok.'              },
]

function matchesTab(c: Customer, tab: TabId): boolean {
  if (tab === 'all')    return true
  if (tab === 'repeat') return (c.visit_count ?? 0) > 1
  if (tab === 'new')    return (c.visit_count ?? 0) <= 1
  if (tab === 'noted')  return Boolean(c.notes?.trim())
  return false
}

// ─── Component ────────────────────────────────────────────────────────────────
export function CustomersClient({ customers }: Props) {
  const [tab, setTab] = useState<TabId>('all')

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { all: 0, repeat: 0, new: 0, noted: 0 }
    for (const cu of customers) {
      c.all++
      if (matchesTab(cu, 'repeat')) c.repeat++
      if (matchesTab(cu, 'new'))    c.new++
      if (matchesTab(cu, 'noted'))  c.noted++
    }
    return c
  }, [customers])

  const filtered = useMemo(
    () => customers.filter((c) => matchesTab(c, tab)),
    [customers, tab],
  )

  const currentTab = TABS.find((t) => t.id === tab)!

  return (
    <div>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h1 className={styles.title}>Müşteriler</h1>
        <span className={styles.count}>{customers.length} müşteri</span>
      </div>

      {/* ── Tabs ── */}
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
                t.id === 'repeat' ? tabStyles.badgeAccent :
                t.id === 'noted'  ? tabStyles.badgeWarn   : tabStyles.badgeGray
              }`}>{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.35 }}>👥</div>
          <p className={styles.emptyTitle}>{currentTab.empty}</p>
          {tab === 'all' && (
            <p className={styles.emptyDesc}>
              Müşteriler, rezervasyon sayfanızdan randevu alındığında otomatik oluşturulur.
            </p>
          )}
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Ad Soyad</span>
            <span>Telefon</span>
            <span>E-posta</span>
            <span>Ziyaret</span>
            <span>Son Ziyaret</span>
          </div>
          {filtered.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className={styles.tableRowLink}>
              <span className={styles.primaryWithNote}>
                <span className={styles.primary}>{c.full_name}</span>
                {c.notes && <span className={styles.noteIndicator} title={c.notes}>📝</span>}
              </span>
              <span className={styles.muted}>{c.phone}</span>
              <span className={styles.muted}>{c.email ?? '—'}</span>
              <span>
                <span className={(c.visit_count ?? 0) > 1 ? styles.visitBadgeRepeat : styles.muted}>
                  {c.visit_count ?? 0}
                </span>
              </span>
              <span className={styles.muted}>
                {c.last_visit_at
                  ? new Date(c.last_visit_at).toLocaleDateString('tr-TR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })
                  : '—'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
