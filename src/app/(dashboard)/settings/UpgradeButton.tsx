'use client'
import React, { useState, useTransition } from 'react'
import { startCheckout } from './checkout-actions'
import styles from './settings.module.css'

interface Props {
  planName: string
  label:    string
}

export function UpgradeButton({ planName, label }: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError]          = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await startCheckout(planName)

      if (result.error) {
        setError(result.error)
        return
      }

      // iyzico: inject HTML form and auto-submit
      if (result.checkoutFormContent) {
        const wrap = document.createElement('div')
        wrap.innerHTML = result.checkoutFormContent
        document.body.appendChild(wrap)
        const form = wrap.querySelector('form')
        if (form) form.submit()
        return
      }

      // Stripe / Paddle: redirect to checkout URL
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl
        return
      }

      setError('Ödeme sayfası açılamadı. Lütfen tekrar deneyin.')
    })
  }

  return (
    <div>
      <button
        className={styles.upgradeBtn}
        onClick={handleClick}
        disabled={pending}
      >
        {pending ? 'İşleniyor…' : label}
      </button>
      {error ? (
        <p className={styles.upgradeError}>{error}</p>
      ) : null}
    </div>
  )
}
