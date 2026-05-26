// מפנה את המשתמש לגוגל לאישור גישה ל-Google Tasks
export default function handler(req, res) {
  const userEmail = req.query.email || ''
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://yaelsiso.vercel.app/api/google-tasks-callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/tasks',
    access_type: 'offline',
    prompt: 'consent',
    state: userEmail,
    ...(userEmail ? { login_hint: userEmail } : {}),
  })
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
