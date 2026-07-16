'use client'

import React, { useState } from 'react'
import { Store, Clock, Smartphone, MessageCircle, CreditCard, Star } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import styles from './settings-tabs.module.css'

const TABS = [
  { id: 'profil',  label: 'İşletme Profili',  icon: Store         },
  { id: 'hours',   label: 'Çalışma Saatleri', icon: Clock         },
  { id: 'qr',      label: 'QR & Link',        icon: Smartphone    },
  { id: 'sms',     label: 'SMS & WhatsApp',   icon: MessageCircle },
  { id: 'billing', label: 'Abonelik',         icon: CreditCard    },
  { id: 'plan',    label: 'Planlar',          icon: Star          },
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
            <Icon icon={tab.icon} size="sm" /> {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.panel}>
        {children[active]}
      </div>
    </div>
  )
}
