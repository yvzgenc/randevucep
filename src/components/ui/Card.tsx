import React from 'react'
import styles from './Card.module.css'

export type CardPadding = 'sm' | 'md' | 'lg'

const PADDING_CLASS: Record<CardPadding, string> = {
  sm: styles.paddingSm,
  md: styles.paddingMd,
  lg: styles.paddingLg,
}

export interface CardProps {
  children:   React.ReactNode
  className?: string
  padding?:   CardPadding
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  const cls = [styles.card, PADDING_CLASS[padding], className ?? ''].filter(Boolean).join(' ')
  return <div className={cls}>{children}</div>
}
