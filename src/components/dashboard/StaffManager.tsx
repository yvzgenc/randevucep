'use client'
import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StaffMember } from '@/types/database'
import { getBusinessTypeConfig } from '@/lib/businessTypes'
import { checkStaffLimit } from '@/lib/plans'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from './DataManager.module.css'

interface Props {
  businessId:   number
  businessType: string | null
  planName:     string | null
  initial:      StaffMember[]
}

interface FormState {
  full_name: string
  phone:     string
  title:     string
  status:    'Aktif' | 'Pasif'
}

const EMPTY_FORM: FormState = {
  full_name: '',
  phone:     '',
  title:     '',
  status:    'Aktif',
}

export function StaffManager({ businessId, businessType, planName, initial }: Props) {
  const [items, setItems]       = useState<StaffMember[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<StaffMember | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const cfg      = getBusinessTypeConfig(businessType)
  const supabase = createClient()

  // Active staff count (Aktif only — limit applies to active members)
  const activeCount = items.filter((s) => s.status === 'Aktif').length

  function openAdd() {
    // Enforce limit before opening form
    const check = checkStaffLimit(planName, activeCount)
    if (!check.allowed) {
      setError(check.reason)
      return
    }
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function openEdit(item: StaffMember) {
    setEditing(item)
    setForm({
      full_name: item.full_name,
      phone:     item.phone ?? '',
      title:     item.title ?? '',
      status:    (item.status ?? 'Aktif') as 'Aktif' | 'Pasif',
    })
    setError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.full_name.trim()) {
      setError('Ad Soyad zorunludur.')
      return
    }

    // If adding new AND setting Aktif, re-check limit at save time
    if (!editing && form.status === 'Aktif') {
      const check = checkStaffLimit(planName, activeCount)
      if (!check.allowed) {
        setError(check.reason)
        return
      }
    }
    // If editing and changing to Aktif, check that the limit allows it
    if (editing && editing.status !== 'Aktif' && form.status === 'Aktif') {
      const check = checkStaffLimit(planName, activeCount)
      if (!check.allowed) {
        setError(check.reason)
        return
      }
    }

    setSaving(true)
    setError(null)

    const payload = {
      business_id: businessId,
      full_name:   form.full_name.trim(),
      phone:       form.phone.trim() || null,
      title:       form.title.trim() || null,
      status:      form.status,
    }

    if (editing) {
      const { error: dbErr } = await supabase
        .from('staff')
        .update(payload)
        .eq('id', editing.id)

      if (dbErr) { setError(dbErr.message); setSaving(false); return }
      setItems((prev) =>
        prev.map((s) => (s.id === editing.id ? { ...s, ...payload } : s))
      )
    } else {
      const { data, error: dbErr } = await supabase
        .from('staff')
        .insert(payload)
        .select('*')
        .single()

      if (dbErr) { setError(dbErr.message); setSaving(false); return }
      if (data) setItems((prev) => [data, ...prev])
    }

    cancelForm()
    setSaving(false)
  }

  async function handleDelete(item: StaffMember) {
    if (!confirm(`"${item.full_name}" adlı ${cfg.staffMemberLabel.toLowerCase()}i silmek istediğinizden emin misiniz?`)) return
    const { error: dbErr } = await supabase.from('staff').delete().eq('id', item.id)
    if (dbErr) { alert(dbErr.message); return }
    setItems((prev) => prev.filter((s) => s.id !== item.id))
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{cfg.staffLabel}</h1>
        <Button onClick={openAdd} size="sm">+ {cfg.staffMemberLabel} Ekle</Button>
      </div>

      {/* Limit error shown above form (when openAdd is blocked) */}
      {error && !showForm ? (
        <div className={styles.limitError}>
          <p>{error}</p>
          <a href="/settings" className={styles.limitUpgradeLink}>Planı yükselt →</a>
        </div>
      ) : null}

      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editing ? `${cfg.staffMemberLabel} Düzenle` : `Yeni ${cfg.staffMemberLabel}`}
          </h2>
          <form onSubmit={handleSave} className={styles.form}>
            <Input
              label="Ad Soyad *"
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder={cfg.staffNamePlaceholder}
              required
            />
            <div className={styles.row2}>
              <Input
                label="Unvan"
                id="title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={cfg.staffTitlePlaceholder}
              />
              <Input
                label="Telefon"
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="0532 000 00 00"
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Durum</label>
              <div className={styles.radioGroup}>
                {(['Aktif', 'Pasif'] as const).map((s) => (
                  <label key={s} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="staff_status"
                      value={s}
                      checked={form.status === s}
                      onChange={() => setForm((f) => ({ ...f, status: s }))}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            {error ? <p className={styles.errorMsg}>{error}</p> : null}
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" onClick={cancelForm}>İptal</Button>
              <Button type="submit" loading={saving}>
                {editing ? 'Güncelle' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>Henüz {cfg.staffMemberLabel.toLowerCase()} eklenmemiş</p>
          <p className={styles.emptyDesc}>İlk {cfg.staffMemberLabel.toLowerCase()}i ekleyerek başlayın.</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>Ad Soyad</span>
            <span>Unvan</span>
            <span>Telefon</span>
            <span>Durum</span>
            <span></span>
          </div>
          {items.map((item) => (
            <div key={item.id} className={styles.tableRow}>
              <span className={styles.primary}>{item.full_name}</span>
              <span className={styles.muted}>{item.title ?? '—'}</span>
              <span className={styles.muted}>{item.phone ?? '—'}</span>
              <span>
                <span className={item.status === 'Aktif' ? styles.badgeActive : styles.badgePassive}>
                  {item.status ?? 'Aktif'}
                </span>
              </span>
              <span className={styles.actions}>
                <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>Düzenle</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(item)}>Sil</Button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
