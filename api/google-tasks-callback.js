// מקבל את הקוד מגוגל, מחליף ל-tokens ושומר ב-Supabase
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const { code, state: userEmail } = req.query
  if (!code) return res.status(400).send('Missing code')

  // החלפת קוד ל-tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'https://yaelsiso.vercel.app/api/google-tasks-callback',
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()
  if (!tokens.refresh_token) {
    return res.status(400).send('No refresh token received. Try again.')
  }

  const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  // יצירת רשימת משימות ייעודית ב-Google Tasks
  let taskListId = null
  try {
    const listRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: 'Yael Siso Studio' }),
    })
    const list = await listRes.json()
    taskListId = list.id
  } catch (e) {
    // אם נכשל — נשתמש ברשימת ברירת מחדל
    taskListId = '@default'
  }

  // שמירת tokens ב-Supabase
  await sb.from('google_task_tokens').upsert({
    user_email: userEmail || 'unknown',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    task_list_id: taskListId,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_email' })

  res.redirect(302, 'https://yaelsiso.vercel.app/?google_tasks=connected')
}
