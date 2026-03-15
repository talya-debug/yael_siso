import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function WorkLog() {
  const [logs, setLogs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ project_id: '', work_date: new Date().toISOString().split('T')[0], hours: '', description: '', user_email: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('work_log').select('*, projects(name)').order('work_date', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
    ])
    setLogs(l || [])
    setProjects(p || [])
    setLoading(false)
  }

  async function save() {
    if (!form.description.trim()) return
    await supabase.from('work_log').insert({
      project_id: form.project_id || null,
      work_date: form.work_date,
      hours: Number(form.hours) || null,
      description: form.description,
      user_email: form.user_email,
    })
    setShowForm(false)
    setForm({ project_id: '', work_date: new Date().toISOString().split('T')[0], hours: '', description: '', user_email: '' })
    fetchAll()
  }

  async function remove(id) {
    await supabase.from('work_log').delete().eq('id', id)
    fetchAll()
  }

  const totalHours = logs.reduce((s, l) => s + Number(l.hours || 0), 0)

  if (loading) return <div className="text-gray-400 p-8">טוען...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">יומן עבודה</h1>
          {totalHours > 0 && <p className="text-sm text-gray-500 mt-0.5">סה"כ: {totalHours} שעות</p>}
        </div>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + רישום חדש
        </button>
      </div>

      {logs.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <div className="text-5xl mb-3">📅</div>
          <p>אין רשומות עדיין</p>
        </div>
      )}

      <div className="space-y-2">
        {logs.map(l => (
          <div key={l.id} className="bg-white rounded-xl border p-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-gray-500">{l.work_date}</span>
                {l.projects?.name && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{l.projects.name}</span>}
                {l.user_email && <span className="text-xs text-gray-400">{l.user_email}</span>}
              </div>
              <p className="text-gray-800 mt-1">{l.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 mr-3">
              {l.hours && <span className="font-semibold text-gray-700">{l.hours}ש'</span>}
              <button onClick={() => remove(l.id)} className="text-red-400 text-xs hover:text-red-600">✕</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">רישום עבודה</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">תאריך</label>
                  <input type="date" value={form.work_date} onChange={e => setForm({...form, work_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">שעות</label>
                  <input type="number" step="0.5" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">פרויקט</label>
                <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">בחרי פרויקט...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">מה עשית *</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="תיאור העבודה..." />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">שם עובד</label>
                <input value={form.user_email} onChange={e => setForm({...form, user_email: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="שם / אימייל" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">שמירה</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
