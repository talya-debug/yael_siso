// מקבל את הקוד מגוגל, מחליף ל-refresh token ושומר ב-Supabase
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code } = req.query
  if (!code) return res.status(400).send('Missing code')

  // החלפת קוד ל-tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://yaelsiso.vercel.app/auth/callback',
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) {
    return res.status(400).send('No refresh token received. Try again.')
  }

  // שמירת refresh token ב-Supabase
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
  await sb.from('settings').upsert({
    key: 'gmail_refresh_token',
    value: tokens.refresh_token,
  }, { onConflict: 'key' })

  res.redirect(302, 'https://yaelsiso.vercel.app/?gmail=connected')
}
