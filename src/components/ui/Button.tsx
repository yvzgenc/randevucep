import React from 'react'
import styles from './Button.module.css'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize    = 'sm' | 'md' | 'lg'

export interface ButtonProps {
  variant?:   ButtonVariant
  size?:      ButtonSize
  loading?:   boolean
  fullWidth?: boolean
  disabled?:  boolean
  type?:      'button' | 'submit' | 'reset'
  children?:  React.ReactNode
  className?: string
  title?:     string
  form?:      string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onClick?:   (e: any) => void
}

export function Button({
  variant   = 'primary',
  size      = 'md',
  loading   = false,
  fullWidth = false,
  disabled,
  type      = 'button',
  children,
  className,
  onClick,
  title,
  form,
}: ButtonProps) {
  const cls = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled ?? loading}
      onClick={onClick}
      title={title}
      form={form}
    >
      {loading ? <span className={styles.spinner} aria-hidden /> : null}
      {children}
    </button>
  )
}
