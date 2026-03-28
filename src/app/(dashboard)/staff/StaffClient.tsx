'use client'

import React, { useState, useMemo } from 'react'
import type { StaffMember, StaffWorkingDay } from '@/types/database'
import { StaffManager }            from '@/components/dashboard/StaffManager'
import { StaffWorkingDaysEditor }  from './StaffWorkingDaysEditor'
import tabStyles from '../appointments/appt-tabs.module.css'
import styles    from './staff.module.css'

interface Props {
  businessId:   number
  businessType: string | null
  planName:     string | null
  staff:        StaffMember[]
  workingDays:  StaffWorkingDay[]
}

type TabId = 'active' | 'passive' | 'schedule'

export function StaffClient({ businessId, businessType, planName, staff, workingDays }: Props) {
  const [tab, setTab] = useState<TabId>('active')

  const counts = useMemo(() => ({
    active:   staff.filter((s) => s.status === 'Aktif').length,
    passive:  staff.filter((s) => s.status !== 'Aktif').length,
    schedule: staff.filter((s) => s.status === 'Aktif').length,
  }), [staff])

  const TABS: { id: TabId; label: string }[] = [
    { id: 'active',   label: 'Aktif Personel'   },
    { id: 'passive',  label: 'Pasif'             },
    { id: 'schedule', label: '📅 Çalışma Günleri' },
  ]

  const activeStaff  = useMemo(() => staff.filter((s) => s.status === 'Aktif'),  [staff])
  const passiveStaff = useMemo(() => staff.filter((s) => s.status !== 'Aktif'),  [staff])

  return (
    <div>
      {/* Tab bar */}
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
                t.id === 'active'   ? tabStyles.badgeGreen :
                t.id === 'passive'  ? tabStyles.badgeGray  : tabStyles.badgeAccent
              }`}>{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Aktif personel ── */}
      {tab === 'active' && (
        <StaffManager
          businessId={businessId}
          businessType={businessType}
          planName={planName}
          initial={activeStaff}
        />
      )}

      {/* ── Pasif personel ── */}
      {tab === 'passive' && (
        passiveStaff.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 32px',
            textAlign: 'center',
            color: 'var(--color-muted)',
            fontSize: 14,
          }}>
            Pasif personel yok.
          </div>
        ) : (
          <StaffManager
            businessId={businessId}
            businessType={businessType}
            planName={planName}
            initial={passiveStaff}
          />
        )
      )}

      {/* ── Çalışma günleri ── */}
      {tab === 'schedule' && (
        activeStaff.length === 0 ? (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 32px',
            textAlign: 'center',
            color: 'var(--color-muted)',
            fontSize: 14,
          }}>
            Aktif personel eklediğinizde burada çalışma günlerini ayarlayabilirsiniz.
          </div>
        ) : (
          <div className={styles.scheduleCard}>
            <p className={styles.scheduleDesc}>
              Her personelin hangi günler çalıştığını ayarlayın.
              Rezervasyon sayfasında müşteriler sadece o personelin müsait olduğu günleri görecek.
            </p>
            <div className={styles.scheduleList}>
              {activeStaff.map((s, i) => (
                <div key={s.id} className={`${styles.scheduleRow} ${i < activeStaff.length - 1 ? styles.scheduleRowBorder : ''}`}>
                  <div className={styles.scheduleStaff}>
                    <div className={styles.scheduleAvatar}>
                      {s.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={styles.scheduleStaffName}>{s.full_name}</p>
                      {s.title && <p className={styles.scheduleStaffTitle}>{s.title}</p>}
                    </div>
                  </div>
                  <StaffWorkingDaysEditor
                    staffId={s.id}
                    businessId={businessId}
                    staffName={s.full_name}
                    initialDays={workingDays}
                  />
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  )
}
