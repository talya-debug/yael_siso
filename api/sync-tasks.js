// סנכרון משימות עם Google Tasks
import { createClient } from '@supabase/supabase-js'

const sb = () => createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
)

// קבלת access token חדש מ-refresh token
async function getAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

// יצירת משימה בגוגל
async function createGoogleTask(accessToken, taskListId, task) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: task.name,
      notes: task.phase_name ? `Project phase: ${task.phase_name}` : '',
      due: task.due_date ? `${task.due_date}T00:00:00.000Z` : undefined,
    }),
  })
  return res.json()
}

// עדכון משימה בגוגל (סטטוס + תאריך)
async function updateGoogleTask(accessToken, taskListId, googleTaskId, updates) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${googleTaskId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  })
  return res.json()
}

// שליפת משימות מגוגל (לסנכרון הפוך)
async function listGoogleTasks(accessToken, taskListId) {
  const res = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks?showCompleted=true&showHidden=true&maxResults=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.items || []
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  const { action, user_email, task_id, task_data } = req.body
  const supabase = sb()

  // שליפת טוקן המשתמש
  const { data: tokenRow } = await supabase
    .from('google_task_tokens')
    .select('*')
    .eq('user_email', user_email)
    .maybeSingle()

  if (!tokenRow) return res.json({ synced: false, reason: 'not_connected' })

  const accessToken = await getAccessToken(tokenRow.refresh_token)
  if (!accessToken) return res.status(500).json({ error: 'Failed to get access token' })

  const taskListId = tokenRow.task_list_id || '@default'

  try {
    // ── יצירת משימה בגוגל ──
    if (action === 'create') {
      const googleTask = await createGoogleTask(accessToken, taskListId, task_data)
      if (googleTask.id) {
        await supabase.from('tasks').update({ google_task_id: googleTask.id }).eq('id', task_id)
      }
      return res.json({ synced: true, google_task_id: googleTask.id })
    }

    // ── סימון Done בגוגל ──
    if (action === 'complete') {
      const { data: task } = await supabase.from('tasks').select('google_task_id').eq('id', task_id).single()
      if (task?.google_task_id) {
        await updateGoogleTask(accessToken, taskListId, task.google_task_id, { status: 'completed' })
      }
      return res.json({ synced: true })
    }

    // ── ביטול Done בגוגל ──
    if (action === 'uncomplete') {
      const { data: task } = await supabase.from('tasks').select('google_task_id').eq('id', task_id).single()
      if (task?.google_task_id) {
        await updateGoogleTask(accessToken, taskListId, task.google_task_id, { status: 'needsAction' })
      }
      return res.json({ synced: true })
    }

    // ── עדכון תאריך בגוגל ──
    if (action === 'update_date') {
      const { data: task } = await supabase.from('tasks').select('google_task_id').eq('id', task_id).single()
      if (task?.google_task_id && task_data?.due_date) {
        await updateGoogleTask(accessToken, taskListId, task.google_task_id, {
          due: `${task_data.due_date}T00:00:00.000Z`,
        })
      }
      return res.json({ synced: true })
    }

    // ── סנכרון מגוגל למערכת (polling) ──
    if (action === 'pull') {
      const googleTasks = await listGoogleTasks(accessToken, taskListId)
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('id, google_task_id, status')
        .not('google_task_id', 'is', null)

      let updated = 0
      for (const gt of googleTasks) {
        const dbTask = dbTasks?.find(t => t.google_task_id === gt.id)
        if (!dbTask) continue

        // Done בגוגל → Done במערכת
        if (gt.status === 'completed' && dbTask.status !== 'done') {
          await supabase.from('tasks').update({ status: 'done' }).eq('id', dbTask.id)
          updated++
        }
        // ביטול Done בגוגל → ביטול במערכת
        if (gt.status === 'needsAction' && dbTask.status === 'done') {
          await supabase.from('tasks').update({ status: 'pending' }).eq('id', dbTask.id)
          updated++
        }
      }
      return res.json({ synced: true, updated })
    }

    return res.status(400).json({ error: 'Unknown action' })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
