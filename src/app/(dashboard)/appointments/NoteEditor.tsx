'use client'

import React, { useState, useTransition, useRef, useEffect } from 'react'
import { FileText, Pencil } from 'lucide-react'
import { updateAppointmentNote } from './actions'
import { Icon } from '@/components/ui/Icon'
import styles from './appointments.module.css'

interface Props {
  appointmentId: number
  initialNote:   string | null
}

export function NoteEditor({ appointmentId, initialNote }: Props) {
  const [open,    setOpen]    = useState(false)
  const [note,    setNote]    = useState(initialNote ?? '')
  const [saved,   setSaved]   = useState(initialNote ?? '')
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  function showFeedback(ok: boolean, msg: string) {
    setFeedback({ ok, msg })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFeedback(null), 3000)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateAppointmentNote(appointmentId, note)
      if (result.error) {
        showFeedback(false, result.error)
      } else {
        setSaved(note.trim())
        showFeedback(true, 'Kaydedildi')
        setOpen(false)
      }
    })
  }

  function handleCancel() {
    setNote(saved)
    setOpen(false)
  }

  const hasNote = Boolean(saved.trim())

  return (
    <div className={styles.noteWrap}>
      <button
        className={`${styles.noteToggle} ${hasNote ? styles.noteToggleActive : ''}`}
        onClick={() => setOpen(v => !v)}
        title={hasNote ? saved : 'Not ekle'}
        aria-label="Not"
      >
        <Icon icon={hasNote ? FileText : Pencil} size="sm" />
      </button>

      {open && (
        <div className={styles.notePanel}>
          <textarea
            ref={textareaRef}
            className={styles.noteTextarea}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Randevu notu… (örn: hassas cilt, indirim uygulandı)"
            rows={3}
            maxLength={500}
          />
          <div className={styles.noteActions}>
            <button
              className={styles.noteSaveBtn}
              onClick={handleSave}
              disabled={pending}
            >
              {pending ? '…' : 'Kaydet'}
            </button>
            <button
              className={styles.noteCancelBtn}
              onClick={handleCancel}
              disabled={pending}
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <span className={feedback.ok ? styles.actionSuccess : styles.actionError}>
          {feedback.msg}
        </span>
      )}
    </div>
  )
}
