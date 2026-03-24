// ─── Email templates ──────────────────────────────────────────────────────────
// One function per notification event. Returns { subject, html, text }.
// Templates are intentionally simple inline HTML — no external template engine.

import type { NotificationEvent, NotificationData } from './types'

export interface RenderedEmail {
  subject: string
  html:    string
  text:    string
}

// ── Shared layout wrapper ─────────────────────────────────────────────────────

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
    .wrap{max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);}
    .header{background:#4f3ef5;padding:28px 32px;}
    .header-logo{color:#fff;font-size:18px;font-weight:700;letter-spacing:-.3px;}
    .body{padding:28px 32px;}
    .title{font-size:20px;font-weight:600;color:#0a0c10;margin:0 0 8px;}
    .info-box{background:#f8f8ff;border:1px solid #e8e4ff;border-radius:8px;padding:16px 18px;margin:20px 0;}
    .info-row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #ede9ff;font-size:14px;color:#333;}
    .info-row:last-child{border-bottom:none;}
    .info-key{color:#666;font-weight:500;}
    .info-val{font-weight:600;color:#0a0c10;}
    .footer{padding:16px 32px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#999;text-align:center;}
    p{font-size:15px;line-height:1.65;color:#333;margin:0 0 12px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header"><div class="header-logo">📅 RandevuCep</div></div>
    <div class="body">${body}</div>
    <div class="footer">Bu e-posta RandevuCep randevu sistemi tarafından gönderilmiştir.</div>
  </div>
</body>
</html>`
}

function infoBox(rows: [string, string][]): string {
  const rowsHtml = rows
    .map(([k, v]) => `<div class="info-row"><span class="info-key">${k}</span><span class="info-val">${v}</span></div>`)
    .join('')
  return `<div class="info-box">${rowsHtml}</div>`
}

// ── Template renderers ────────────────────────────────────────────────────────

function bookingCreatedCustomer(d: NotificationData): RenderedEmail {
  const subject = `Randevunuz alındı — ${d.businessName}`
  const rows = infoBox([
    ['İşletme',  d.businessName],
    ['Hizmet',   d.serviceName],
    ['Personel', d.staffName],
    ['Tarih',    d.appointmentDate],
    ['Saat',     d.appointmentTime],
  ])

  const manageBlock = d.manageUrl
    ? `<div style="margin:20px 0;text-align:center;">
        <a href="${d.manageUrl}" style="display:inline-block;padding:12px 28px;background:#4f3ef5;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;">
          📅 Randevumu Yönet
        </a>
        <p style="font-size:12px;color:#999;margin-top:10px;">İptal etmek veya tarih/saat değiştirmek için bu butonu kullanabilirsiniz.</p>
      </div>`
    : '<p>İptal etmek isterseniz lütfen işletmeyi arayın.</p>'

  const body = `
    <h1 class="title">Randevunuz alındı ✓</h1>
    <p>Merhaba ${d.customerName}, randevunuz başarıyla oluşturuldu.</p>
    ${rows}
    ${manageBlock}
    <p>Randevunuz onaylandığında size bilgi vereceğiz.</p>
  `
  const manageText = d.manageUrl ? `\n\nRandevunuzu yönetmek için: ${d.manageUrl}` : '\n\nİptal için işletmeyi arayın.'
  const text = `Randevunuz alındı!\n\nİşletme: ${d.businessName}\nHizmet: ${d.serviceName}\nPersonel: ${d.staffName}\nTarih: ${d.appointmentDate} ${d.appointmentTime}${manageText}`
  return { subject, html: layout(subject, body), text }
}

function bookingCreatedBusiness(d: NotificationData): RenderedEmail {
  const subject = `Yeni randevu — ${d.customerName}`
  const rows = infoBox([
    ['Müşteri',  d.customerName],
    ['Telefon',  d.customerPhone ?? '—'],
    ['Hizmet',   d.serviceName],
    ['Personel', d.staffName],
    ['Tarih',    d.appointmentDate],
    ['Saat',     d.appointmentTime],
  ])
  const body = `
    <h1 class="title">Yeni randevu oluşturuldu</h1>
    <p>Bir müşteri online rezervasyon yaptı.</p>
    ${rows}
    <p>Dashboard üzerinden randevuyu onaylayabilir veya iptal edebilirsiniz.</p>
  `
  const text = `Yeni randevu!\n\nMüşteri: ${d.customerName} (${d.customerPhone ?? ''})\nHizmet: ${d.serviceName}\nPersonel: ${d.staffName}\nTarih: ${d.appointmentDate} ${d.appointmentTime}`
  return { subject, html: layout(subject, body), text }
}

function bookingConfirmed(d: NotificationData): RenderedEmail {
  const subject = `Randevunuz onaylandı — ${d.businessName}`
  const rows = infoBox([
    ['İşletme',  d.businessName],
    ['Hizmet',   d.serviceName],
    ['Personel', d.staffName],
    ['Tarih',    d.appointmentDate],
    ['Saat',     d.appointmentTime],
  ])
  const body = `
    <h1 class="title">Randevunuz onaylandı ✓</h1>
    <p>Merhaba ${d.customerName}, randevunuz işletme tarafından onaylandı.</p>
    ${rows}
    <p>Sizi bekliyoruz! İptal etmek isterseniz lütfen en az birkaç saat öncesinden işletmeyi arayın.</p>
  `
  const text = `Randevunuz onaylandı!\n\nİşletme: ${d.businessName}\nHizmet: ${d.serviceName}\nTarih: ${d.appointmentDate} ${d.appointmentTime}`
  return { subject, html: layout(subject, body), text }
}

function bookingCanceled(d: NotificationData): RenderedEmail {
  const subject = `Randevunuz iptal edildi — ${d.businessName}`
  const rows = infoBox([
    ['İşletme',  d.businessName],
    ['Hizmet',   d.serviceName],
    ['Tarih',    d.appointmentDate],
    ['Saat',     d.appointmentTime],
  ])
  const body = `
    <h1 class="title">Randevunuz iptal edildi</h1>
    <p>Merhaba ${d.customerName}, aşağıdaki randevunuz iptal edildi.</p>
    ${rows}
    <p>Yeni randevu almak isterseniz işletmenin rezervasyon sayfasını ziyaret edebilirsiniz.</p>
  `
  const text = `Randevunuz iptal edildi.\n\nİşletme: ${d.businessName}\nHizmet: ${d.serviceName}\nTarih: ${d.appointmentDate} ${d.appointmentTime}`
  return { subject, html: layout(subject, body), text }
}

function upcomingReminder(d: NotificationData): RenderedEmail {
  const subject = `Yarınki randevunuz — ${d.businessName}`
  const rows = infoBox([
    ['İşletme',  d.businessName],
    ['Hizmet',   d.serviceName],
    ['Personel', d.staffName],
    ['Tarih',    d.appointmentDate],
    ['Saat',     d.appointmentTime],
  ])

  const manageBlock = d.manageUrl
    ? `<div style="margin:20px 0;text-align:center;">
        <a href="${d.manageUrl}" style="display:inline-block;padding:12px 28px;background:#4f3ef5;color:#fff;border-radius:8px;font-weight:700;text-decoration:none;font-size:14px;">
          📅 Randevumu Yönet / İptal Et
        </a>
      </div>`
    : `<p>İptal etmek isterseniz lütfen işletmeyi öncesinde arayın.</p>`

  const body = `
    <h1 class="title">Randevunuzu hatırlatmak istedik ⏰</h1>
    <p>Merhaba ${d.customerName}, yarınki randevunuz için hatırlatma!</p>
    ${rows}
    ${manageBlock}
  `
  const manageText = d.manageUrl
    ? `\n\nRandevunuzu yönetmek veya iptal etmek için: ${d.manageUrl}`
    : '\n\nİptal için işletmeyi öncesinde arayın.'
  const text = `Randevu hatırlatması!\n\nİşletme: ${d.businessName}\nHizmet: ${d.serviceName}\nTarih: ${d.appointmentDate} ${d.appointmentTime}${manageText}`
  return { subject, html: layout(subject, body), text }
}

// ── Main render function ──────────────────────────────────────────────────────

export function renderTemplate(
  event: NotificationEvent,
  data:  NotificationData,
): RenderedEmail {
  switch (event) {
    case 'booking_created_customer': return bookingCreatedCustomer(data)
    case 'booking_created_business': return bookingCreatedBusiness(data)
    case 'booking_confirmed':        return bookingConfirmed(data)
    case 'booking_canceled':         return bookingCanceled(data)
    case 'upcoming_reminder':        return upcomingReminder(data)
  }
}

// ─── SMS / WhatsApp templates ─────────────────────────────────────────────────
// Short, plain-text messages optimised for mobile screens.
// Turkish character support: Twilio handles UTF-8 natively.
// Keep under 160 chars when possible (1 SMS segment) — reminder is slightly longer.

export interface RenderedSms {
  body: string
}

export function renderSmsTemplate(
  event: NotificationEvent,
  data:  NotificationData,
): RenderedSms {
  const biz  = data.businessName
  const svc  = data.serviceName
  const date = data.appointmentDate
  const time = data.appointmentTime
  const cust = data.customerName

  switch (event) {
    case 'booking_created_customer':
      return {
        body: `📅 Randevunuz alındı!\n\n${biz}\n${svc}\n${date} – ${time}\n\nİptal için: ${data.businessPhone ?? biz + "'i arayın"}`,
      }

    case 'booking_created_business':
      return {
        body: `🔔 Yeni randevu!\n\nMüşteri: ${cust} (${data.customerPhone ?? ''})\nHizmet: ${svc}\nTarih: ${date} ${time}`,
      }

    case 'booking_confirmed':
      return {
        body: `✅ Randevunuz onaylandı!\n\n${biz}\n${svc} – ${date} ${time}\n\nSizi bekliyoruz!`,
      }

    case 'booking_canceled':
      return {
        body: `❌ Randevunuz iptal edildi.\n\n${biz} – ${svc}\n${date} ${time}\n\nYeni randevu için: ${data.businessPhone ?? biz}`,
      }

    case 'upcoming_reminder':
      return {
        body: `⏰ Yarınki randevu hatırlatması!\n\n${biz}\n${svc}\n${date} – ${time}\n\nİptal için lütfen öncesinden ${data.businessPhone ?? 'işletmeyi'} arayın.`,
      }
  }
}
