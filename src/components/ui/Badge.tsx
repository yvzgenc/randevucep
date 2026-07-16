import React from 'react'
import styles from './Badge.module.css'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'accent' | 'neutral'

export interface BadgeProps {
  variant?:   BadgeVariant
  children:   React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  const cls = [styles.badge, styles[variant], className ?? ''].filter(Boolean).join(' ')
  return <span className={cls}>{children}</span>
}
