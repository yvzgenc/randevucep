'use client'

import React, { useState } from 'react'
import styles from './settings-tabs.module.css'

const TABS = [
  { id: 'profil',  label: '🏪 İşletme Profili'   },
  { id: 'hours',   label: '🕐 Çalışma Saatleri'  },
  { id: 'qr',      label: '📱 QR & Link'          },
  { id: 'sms',     label: '💬 SMS & WhatsApp'      },
  { id: 'billing', label: '💳 Abonelik'            },
  { id: 'plan',    label: '⭐ Planlar'              },
] as const

type TabId = typeof TABS[number]['id']

interface Props {
  children: Partial<Record<TabId, React.ReactNode>>
}

export function SettingsTabs({ children }: Props) {
  const [active, setActive] = useState<TabId>('profil')

  return (
    <div>
      <div className={styles.tabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.panel}>
        {children[active]}
      </div>
    </div>
  )
}
