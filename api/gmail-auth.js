// מפנה את המשתמש לגוגל לאישור גישה ל-Gmail
export default function handler(req, res) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: 'https://yaelsiso.vercel.app/api/auth/callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
    login_hint: 'hello@yaelsiso.com',
  })
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
