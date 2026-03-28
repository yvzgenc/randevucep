'use client'

import React, { useState, useMemo } from 'react'
import type { Service } from '@/types/database'
import { ServicesManager } from '@/components/dashboard/ServicesManager'
import tabStyles from '../appointments/appt-tabs.module.css'

interface Props {
  businessId:   number
  businessType: string | null
  planName:     string | null
  services:     Service[]
}

type TabId = 'active' | 'passive' | 'all'

export function ServicesClient({ businessId, businessType, planName, services }: Props) {
  const [tab, setTab] = useState<TabId>('active')

  const counts = useMemo(() => ({
    active:  services.filter((s) => s.status === 'Aktif').length,
    passive: services.filter((s) => s.status !== 'Aktif').length,
    all:     services.length,
  }), [services])

  const filtered = useMemo(() => {
    if (tab === 'active')  return services.filter((s) => s.status === 'Aktif')
    if (tab === 'passive') return services.filter((s) => s.status !== 'Aktif')
    return services
  }, [services, tab])

  const TABS: { id: TabId; label: string }[] = [
    { id: 'active',  label: 'Aktif'  },
    { id: 'passive', label: 'Pasif'  },
    { id: 'all',     label: 'Tümü'   },
  ]

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
                t.id === 'active'  ? tabStyles.badgeGreen :
                t.id === 'passive' ? tabStyles.badgeGray  : tabStyles.badgeGray
              }`}>{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ServicesManager handles its own add/edit/delete state */}
      <ServicesManager
        businessId={businessId}
        businessType={businessType}
        planName={planName}
        initial={filtered}
      />
    </div>
  )
}
