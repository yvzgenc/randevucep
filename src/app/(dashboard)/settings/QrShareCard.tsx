'use client'

import React, { useState, useCallback } from 'react'
import {
  Download, Printer, Check, MessageCircle, Share2,
  Smartphone, Tag, Camera, type LucideIcon,
} from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import styles from './qr.module.css'

interface Props {
  bookingUrl: string   // full URL e.g. https://yourdomain.com/book/my-salon
  bizName:    string
}

export function QrShareCard({ bookingUrl, bizName }: Props) {
  const [copied,    setCopied]    = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError,  setImgError]  = useState(false)

  // QR SVG via our API route — dark pixels black, white bg for print
  const qrSrc = `/api/qr?url=${encodeURIComponent(bookingUrl)}&size=304&dark=111111&light=ffffff`

  // ── Copy URL ──────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = bookingUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [bookingUrl])

  // ── Download QR as PNG ────────────────────────────────────────────────────
  const handleDownload = useCallback(async () => {
    try {
      // Fetch the SVG and convert to PNG via canvas
      const res = await fetch(qrSrc)
      const svgText = await res.text()
      const blob = new Blob([svgText], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(blob)

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale  = 3   // 3× for print quality (912×912px)
        canvas.width  = 304 * scale
        canvas.height = 304 * scale
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(svgUrl)

        const link = document.createElement('a')
        link.download = `randevucep-qr-${Date.now()}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = svgUrl
    } catch (err) {
      console.error('QR download failed:', err)
    }
  }, [qrSrc])

  // ── Print QR ─────────────────────────────────────────────────────────────
  const handlePrint = useCallback(() => {
    const win = window.open('', '_blank', 'width=600,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QR Kod — ${bizName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #fff;
      padding: 32px;
    }
    .brand {
      font-size: 13px;
      font-weight: 700;
      color: #6c5ce7;
      letter-spacing: 0.3px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0a0c10;
      margin-bottom: 6px;
      text-align: center;
    }
    .sub {
      font-size: 14px;
      color: #666;
      margin-bottom: 28px;
      text-align: center;
    }
    img {
      width: 220px;
      height: 220px;
      display: block;
      margin-bottom: 20px;
    }
    .url {
      font-size: 11px;
      color: #999;
      font-family: monospace;
      text-align: center;
      word-break: break-all;
      max-width: 280px;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="brand">📅 RandevuCep</div>
  <h1>${bizName}</h1>
  <p class="sub">Kameranızı QR koda tutun ve randevu alın</p>
  <img src="${window.location.origin}${qrSrc}" alt="QR Kod">
  <p class="url">${bookingUrl}</p>
  <script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`)
    win.document.close()
  }, [bookingUrl, bizName, qrSrc])

  // ── Share links ───────────────────────────────────────────────────────────
  const waMsg    = encodeURIComponent(`${bizName} için online randevu alabilirsiniz: ${bookingUrl}`)
  const waUrl    = `https://wa.me/?text=${waMsg}`
  const tweetMsg = encodeURIComponent(`${bizName} — Online randevu için: ${bookingUrl}`)
  const twUrl    = `https://twitter.com/intent/tweet?text=${tweetMsg}`

  return (
    <div className={styles.qrCard}>
      <div className={styles.qrBody}>

        {/* ── QR visual ── */}
        <div className={styles.qrPanel}>
          <div className={styles.qrFrame}>
            {!imgLoaded && !imgError && (
              <div className={styles.qrLoading}>Yükleniyor…</div>
            )}
            {imgError && (
              <div className={styles.qrLoading}>QR yüklenemedi</div>
            )}
            {/* Always render img, hide while loading via opacity */}
            <img
              src={qrSrc}
              alt={`${bizName} rezervasyon QR kodu`}
              className={styles.qrImage}
              style={{ display: imgLoaded ? 'block' : 'none' }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </div>

          <div className={styles.qrMiniActions}>
            <button className={styles.qrMiniBtn} onClick={handleDownload}>
              <Icon icon={Download} size="xs" /> İndir
            </button>
            <button className={styles.qrMiniBtn} onClick={handlePrint}>
              <Icon icon={Printer} size="xs" /> Yazdır
            </button>
          </div>
        </div>

        {/* ── Info panel ── */}
        <div className={styles.qrInfo}>
          <div className={styles.qrInfoTop}>
            <h3 className={styles.qrTitle}>Rezervasyon Linki &amp; QR Kodu</h3>
            <p className={styles.qrDesc}>
              Müşterileriniz bu linki ziyaret ederek veya QR kodu okutarak doğrudan rezervasyon yapabilir.
              QR kodu yazdırıp kasanıza, kapınıza veya kartvizitinize yapıştırın.
            </p>

            {/* URL copy */}
            <div className={styles.urlRow}>
              <span className={styles.urlText}>{bookingUrl}</span>
              <button
                className={`${styles.copyBtn} ${copied ? styles.copyBtnDone : ''}`}
                onClick={handleCopy}
              >
                {copied ? <><Icon icon={Check} size="xs" /> Kopyalandı</> : 'Kopyala'}
              </button>
            </div>

            {/* Share buttons */}
            <div className={styles.shareRow}>
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.shareBtnWa}`}
              >
                <Icon icon={MessageCircle} size="xs" /> WhatsApp
              </a>
              <a
                href={twUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.shareBtn} ${styles.shareBtnTw}`}
              >
                <Icon icon={Share2} size="xs" /> Twitter / X
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Usage tips ── */}
      <div className={styles.tips}>
        {([
          { icon: Printer,    text: 'A4 veya A5 çıktı alıp kasanıza koyun — müşteriler kamerasıyla okutabilir.' },
          { icon: Smartphone, text: 'WhatsApp ile paylaşın — müşterilerinize linki gönderin.' },
          { icon: Tag,        text: 'Kartvizitinize QR kodu ekleyin — grafik tasarımcınıza PNG gönderin.' },
          { icon: Camera,     text: 'Instagram bio\'nuzda link olarak kullanın ya da story\'de paylaşın.' },
        ] as { icon: LucideIcon; text: string }[]).map(({ icon, text }) => (
          <div key={text} className={styles.tip}>
            <span className={styles.tipIcon}><Icon icon={icon} size="md" /></span>
            <span className={styles.tipText}>{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
