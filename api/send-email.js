// שליחת מייל דרך Gmail API מ-hello@yaelsiso.com — תומך בקבצים מצורפים
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { to, subject, body, attachments } = req.body
  if (!to || !subject || !body) return res.status(400).json({ error: 'Missing to, subject, or body' })

  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

  // שליפת refresh token
  const { data: setting } = await sb.from('settings').select('value').eq('key', 'gmail_refresh_token').single()
  if (!setting?.value) return res.status(400).json({ error: 'Gmail not connected. Go to /api/gmail-auth first.' })

  // קבלת access token חדש
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: setting.value,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  const { access_token } = await tokenRes.json()
  if (!access_token) return res.status(500).json({ error: 'Failed to get access token' })

  let raw

  if (attachments && attachments.length > 0) {
    // מייל עם קבצים מצורפים — multipart MIME
    const boundary = 'boundary_' + Date.now()
    const parts = []

    // חלק HTML
    parts.push([
      `Content-Type: text/html; charset=UTF-8`,
      ``,
      body,
    ].join('\r\n'))

    // קבצים מצורפים
    for (const att of attachments) {
      // att.dataUrl = "data:application/pdf;base64,ABC..."
      const match = att.dataUrl.match(/^data:(.+?);base64,(.+)$/)
      if (!match) continue
      const mimeType = match[1]
      const base64Data = match[2]
      parts.push([
        `Content-Type: ${mimeType}`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${att.name}"`,
        ``,
        base64Data,
      ].join('\r\n'))
    }

    const email = [
      `From: Yael Siso Studio <hello@yaelsiso.com>`,
      `Reply-To: hello@yaelsiso.com`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      ...parts.map(p => `--${boundary}\r\n${p}`),
      `--${boundary}--`,
    ].join('\r\n')

    raw = Buffer.from(email).toString('base64url')
  } else {
    // מייל פשוט בלי קבצים — multipart/alternative לשיפור deliverability
    const boundary = 'alt_' + Date.now()
    // יצירת גרסת טקסט פשוט מ-HTML
    const plainText = body.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

    const htmlDoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${body}</body></html>`

    const email = [
      `From: Yael Siso Studio <hello@yaelsiso.com>`,
      `Reply-To: hello@yaelsiso.com`,
      `To: ${to}`,
      `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      plainText,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      htmlDoc,
      `--${boundary}--`,
    ].join('\r\n')

    raw = Buffer.from(email).toString('base64url')
  }

  // שליחה דרך Gmail API
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })

  const result = await sendRes.json()
  if (result.error) return res.status(500).json({ error: result.error.message })

  res.json({ success: true, messageId: result.id })
}
