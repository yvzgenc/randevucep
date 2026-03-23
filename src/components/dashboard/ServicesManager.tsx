'use client'
import React, { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Service } from '@/types/database'
import { getBusinessTypeConfig } from '@/lib/businessTypes'
import { checkServicesLimit } from '@/lib/plans'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import styles from './DataManager.module.css'

interface Props {
  businessId:   number
  businessType: string | null
  planName:     string | null
  initial:      Service[]
}

interface FormState {
  service_name:     string
  duration_minutes: string
  price:            string
  status:           'Aktif' | 'Pasif'
}

const EMPTY_FORM: FormState = {
  service_name:     '',
  duration_minutes: '30',
  price:            '',
  status:           'Aktif',
}

export function ServicesManager({ businessId, businessType, planName, initial }: Props) {
  const [items, setItems]       = useState<Service[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Service | null>(null)
  const [form, setForm]         = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const cfg      = getBusinessTypeConfig(businessType)
  const supabase = createClient()

  // Active services count for limit check
  const activeCount = items.filter((s) => s.status === 'Aktif').length

  function openAdd() {
    const check = checkServicesLimit(planName, activeCount)
    if (!check.allowed) {
      setError(check.reason)
      return
    }
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function openEdit(item: Service) {
    setEditing(item)
    setForm({
      service_name:     item.service_name,
      duration_minutes: String(item.duration_minutes),
      price:            String(item.price),
      status:           (item.status ?? 'Aktif') as 'Aktif' | 'Pasif',
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

  function validate(): string | null {
    if (!form.service_name.trim()) return `${cfg.serviceLabel} adı zorunludur.`
    const dur = Number(form.duration_minutes)
    if (!dur || dur < 5 || dur > 480) return 'Süre 5–480 dakika arasında olmalıdır.'
    const price = Number(form.price)
    if (isNaN(price) || price < 0) return 'Geçerli bir fiyat girin.'
    return null
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    // Re-check limit at save time for new Aktif services
    if (!editing && form.status === 'Aktif') {
      const check = checkServicesLimit(planName, activeCount)
      if (!check.allowed) { setError(check.reason); return }
    }
    if (editing && editing.status !== 'Aktif' && form.status === 'Aktif') {
      const check = checkServicesLimit(planName, activeCount)
      if (!check.allowed) { setError(check.reason); return }
    }

    setSaving(true)
    setError(null)

    const payload = {
      business_id:      businessId,
      service_name:     form.service_name.trim(),
      duration_minutes: Number(form.duration_minutes),
      price:            Number(form.price),
      status:           form.status,
    }

    if (editing) {
      const { error: dbErr } = await supabase
        .from('services')
        .update(payload)
        .eq('id', editing.id)

      if (dbErr) { setError(dbErr.message); setSaving(false); return }
      setItems((prev) =>
        prev.map((s) => (s.id === editing.id ? { ...s, ...payload } : s))
      )
    } else {
      const { data, error: dbErr } = await supabase
        .from('services')
        .insert(payload)
        .select('*')
        .single()

      if (dbErr) { setError(dbErr.message); setSaving(false); return }
      if (data) setItems((prev) => [data, ...prev])
    }

    cancelForm()
    setSaving(false)
  }

  async function handleDelete(item: Service) {
    if (!confirm(`"${item.service_name}" ${cfg.serviceLabel.toLowerCase()}ini silmek istediğinizden emin misiniz?`)) return
    const { error: dbErr } = await supabase.from('services').delete().eq('id', item.id)
    if (dbErr) { alert(dbErr.message); return }
    setItems((prev) => prev.filter((s) => s.id !== item.id))
  }

  return (
    <div>
      <div className={styles.pageHeader}>
        <h1 className={styles.title}>{cfg.servicesLabel}</h1>
        <Button onClick={openAdd} size="sm">+ {cfg.serviceLabel} Ekle</Button>
      </div>

      {/* Limit error shown above form */}
      {error && !showForm ? (
        <div className={styles.limitError}>
          <p>{error}</p>
          <a href="/settings" className={styles.limitUpgradeLink}>Planı yükselt →</a>
        </div>
      ) : null}

      {showForm && (
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>
            {editing ? `${cfg.serviceLabel} Düzenle` : `Yeni ${cfg.serviceLabel}`}
          </h2>
          <form onSubmit={handleSave} className={styles.form}>
            <Input
              label={`${cfg.serviceLabel} Adı *`}
              id="service_name"
              value={form.service_name}
              onChange={(e) => setForm((f) => ({ ...f, service_name: e.target.value }))}
              placeholder={cfg.serviceNamePlaceholder}
              required
            />
            <div className={styles.row2}>
              <Input
                label="Süre (dakika) *"
                id="duration_minutes"
                type="number"
                value={form.duration_minutes}
                onChange={(e) => setForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                min={5}
                max={480}
                required
              />
              <Input
                label="Fiyat (₺) *"
                id="price"
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                min={0}
                step="0.01"
                placeholder="0.00"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Durum</label>
              <div className={styles.radioGroup}>
                {(['Aktif', 'Pasif'] as const).map((s) => (
                  <label key={s} className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="status"
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
          <p className={styles.emptyTitle}>Henüz {cfg.serviceLabel.toLowerCase()} eklenmemiş</p>
          <p className={styles.emptyDesc}>İlk {cfg.serviceLabel.toLowerCase()}i ekleyerek başlayın.</p>
        </div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>{cfg.serviceLabel} Adı</span>
            <span>Süre</span>
            <span>Fiyat</span>
            <span>Durum</span>
            <span></span>
          </div>
          {items.map((item) => (
            <div key={item.id} className={styles.tableRow}>
              <span className={styles.primary}>{item.service_name}</span>
              <span className={styles.muted}>{item.duration_minutes} dk</span>
              <span>₺{Number(item.price).toFixed(2)}</span>
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
