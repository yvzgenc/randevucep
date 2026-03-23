'use client'
import React, { useState, useTransition } from 'react'
import { PLAN_NAMES } from '@/lib/plans'
import { Button } from '@/components/ui/Button'
import { updatePlan, updateStatus } from './actions'
import styles from '../../admin.module.css'

interface Props {
  businessId: number
  currentPlan:   string | null
  currentStatus: string | null
  hasSubscription: boolean
}

export function EditForm({
  businessId,
  currentPlan,
  currentStatus,
  hasSubscription,
}: Props) {
  const [plan,   setPlan]   = useState(currentPlan   ?? 'starter')
  const [status, setStatus] = useState(currentStatus ?? 'active')
  const [planMsg,   setPlanMsg]   = useState<{ ok: boolean; text: string } | null>(null)
  const [statusMsg, setStatusMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [planPending,   startPlanTransition]   = useTransition()
  const [statusPending, startStatusTransition] = useTransition()

  function handlePlanSave() {
    startPlanTransition(async () => {
      const result = await updatePlan(businessId, plan)
      setPlanMsg({ ok: result.success, text: result.message })
      setTimeout(() => setPlanMsg(null), 3000)
    })
  }

  function handleStatusSave() {
    startStatusTransition(async () => {
      const result = await updateStatus(businessId, status)
      setStatusMsg({ ok: result.success, text: result.message })
      setTimeout(() => setStatusMsg(null), 3000)
    })
  }

  if (!hasSubscription) {
    return (
      <div className={styles.editCard}>
        <h3 className={styles.editCardTitle}>Abonelik Yönetimi</h3>
        <p className={styles.cellMuted} style={{ fontSize: 13 }}>
          Bu işletmenin henüz bir abonelik kaydı yok. Onboarding tamamlanmamış olabilir.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Plan update */}
      <div className={styles.editCard}>
        <h3 className={styles.editCardTitle}>Plan Değiştir</h3>
        <div className={styles.editRow}>
          <span className={styles.editLabel}>Plan</span>
          <select
            className={styles.editSelect}
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            {PLAN_NAMES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <Button size="sm" loading={planPending} onClick={handlePlanSave}>
            Kaydet
          </Button>
        </div>
        {planMsg ? (
          <p className={planMsg.ok ? styles.successMsg : styles.errorMsg}>
            {planMsg.text}
          </p>
        ) : null}
      </div>

      {/* Status update */}
      <div className={styles.editCard}>
        <h3 className={styles.editCardTitle}>Abonelik Durumu</h3>
        <div className={styles.editRow}>
          <span className={styles.editLabel}>Durum</span>
          <select
            className={styles.editSelect}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">active</option>
            <option value="canceled">canceled</option>
            <option value="past_due">past_due</option>
          </select>
          <Button size="sm" loading={statusPending} onClick={handleStatusSave}>
            Kaydet
          </Button>
        </div>
        {statusMsg ? (
          <p className={statusMsg.ok ? styles.successMsg : styles.errorMsg}>
            {statusMsg.text}
          </p>
        ) : null}
      </div>
    </>
  )
}
