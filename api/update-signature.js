// עדכון חתימה וסטטוס משימה — endpoint ציבורי לדף החתימה
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { token, signer_name, signature_data } = req.body
  if (!token || !signer_name || !signature_data) {
    return res.status(400).json({ error: 'Missing token, signer_name, or signature_data' })
  }

  // שימוש ב-service role key כדי לעקוף RLS
  const sb = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  )

  // עדכון רשומת החתימה
  const { data: sig, error: sigError } = await sb.from('signatures').update({
    status: 'signed',
    signed_at: new Date().toISOString(),
    signer_name: signer_name.trim(),
    signature_data,
  }).eq('token', token).select('task_id').single()

  if (sigError) {
    return res.status(500).json({ error: 'Failed to update signature: ' + sigError.message })
  }

  // עדכון סטטוס המשימה ל-done
  if (sig?.task_id) {
    await sb.from('tasks').update({ status: 'done' }).eq('id', sig.task_id)
    await sb.from('task_logs').insert({
      task_id: sig.task_id,
      note: '✅ Signed by ' + signer_name.trim(),
    })
  }

  res.json({ success: true })
}
