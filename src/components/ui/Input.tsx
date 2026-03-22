import React from 'react'
import styles from './Input.module.css'

// Minimal interface that works with or without @types/react installed.
// Accepts all standard HTML input attributes via index signature.
export interface InputProps {
  label?: string
  error?: string
  hint?: string
  id?: string
  type?: string
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  placeholder?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  autoComplete?: string
  autoFocus?: boolean
  name?: string
  min?: string | number
  max?: string | number
  minLength?: number
  maxLength?: number
  step?: string | number
  pattern?: string
  className?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onBlur?: (e: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFocus?: (e: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onKeyDown?: (e: any) => void
}

export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  return (
    <div className={styles.wrapper}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input
        id={id}
        className={[
          styles.input,
          error ? styles.hasError : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />
      {error ? <p className={styles.error}>{error}</p> : null}
      {hint && !error ? <p className={styles.hint}>{hint}</p> : null}
    </div>
  )
}

export interface SelectProps {
  label?: string
  error?: string
  id?: string
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  name?: string
  disabled?: boolean
  required?: boolean
  className?: string
  children?: React.ReactNode
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onChange?: (e: any) => void
}

export function Select({ label, error, id, children, className, ...props }: SelectProps) {
  return (
    <div className={styles.wrapper}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      <select
        id={id}
        className={[
          styles.input,
          styles.select,
          error ? styles.hasError : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </select>
      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  )
}
