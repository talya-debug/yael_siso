import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Clock, Link2, Copy, Check } from 'lucide-react'

// תפקידים אפשריים
const ROLES = ['מנהלת פרויקט', 'שרטטת', 'מעצבת', 'אחר']

// כתובת הלינק הציבורי
function getPublicUrl() {
  return `${window.location.origin}/worklog-public`
}

export default function WorkLog() {
  const [logs,       setLogs]       = useState([])
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [filterProj, setFilterProj] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const [form, setForm] = useState({
    project_id: '',
    work_date:  new Date().toISOString().split('T')[0],
    hours:      '',
    role:       ROLES[0],
    description:'',
    worker_name:'',
  })

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
      project_id:  form.project_id  || null,
      work_date:   form.work_date,
      hours:       Number(form.hours) || null,
      role:        form.role,
      description: form.description,
      worker_name: form.worker_name,
    })
    setShowForm(false)
    setForm({ project_id: '', work_date: new Date().toISOString().split('T')[0], hours: '', role: ROLES[0], description: '', worker_name: '' })
    fetchAll()
  }

  async function remove(id) {
    await supabase.from('work_log').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  function copyLink() {
    navigator.clipboard.writeText(getPublicUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // פילטר
  const filtered = logs.filter(l => {
    const matchProj = !filterProj || l.project_id === filterProj
    const matchRole = !filterRole || l.role === filterRole
    return matchProj && matchRole
  })

  const totalHours = filtered.reduce((s, l) => s + Number(l.hours || 0), 0)

  // KPI לפי תפקיד
  const hoursByRole = ROLES.reduce((acc, r) => {
    acc[r] = logs.filter(l => l.role === r).reduce((s, l) => s + Number(l.hours || 0), 0)
    return acc
  }, {})

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
  const lbl = "text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5"

  if (loading) return <div className="text-slate-400 text-sm p-8">טוען...</div>

  return (
    <div className="space-y-5">
      {/* כותרת */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">יומן עבודה</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {logs.length} רשומות · סה"כ {logs.reduce((s,l) => s + Number(l.hours||0),0)} שעות
          </p>
        </div>
        <div className="flex gap-2">
          {/* כפתור קישור חיצוני */}
          <button onClick={copyLink}
            className={`flex items-center gap-2 border px-3 py-2.5 rounded-xl text-sm transition ${
              copied
                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}>
            {copied ? <Check size={14} /> : <Link2 size={14} />}
            {copied ? 'הועתק!' : 'קישור חיצוני'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
            <Plus size={15} /> רישום חדש
          </button>
        </div>
      </div>

      {/* URL הצגה */}
      <div className="bg-slate-800 rounded-xl px-4 py-2.5 flex items-center gap-3">
        <Link2 size={14} className="text-slate-400 shrink-0" />
        <span className="text-slate-300 text-xs font-mono flex-1 truncate">{getPublicUrl()}</span>
        <button onClick={copyLink}
          className="text-xs text-indigo-400 hover:text-indigo-300 transition shrink-0">
          {copied ? '✓ הועתק' : 'העתק'}
        </button>
      </div>

      {/* KPI שעות לפי תפקיד */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-2xl font-bold text-slate-800">{hoursByRole[r] || 0}<span className="text-sm font-normal text-slate-400">ש'</span></p>
            <p className="text-xs text-slate-400 mt-0.5">{r}</p>
          </div>
        ))}
      </div>

      {/* פילטרים */}
      <div className="flex gap-3 flex-wrap">
        <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white min-w-40">
          <option value="">כל הפרויקטים</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white">
          <option value="">כל התפקידים</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterProj || filterRole) && (
          <span className="text-sm text-slate-400 self-center">{filtered.length} רשומות · {totalHours} שעות</span>
        )}
      </div>

      {/* רשימה */}
      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-slate-400 text-sm">אין רשומות עדיין — לחצי "+ רישום חדש"</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(l => (
          <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start justify-between group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium text-slate-500">
                  {new Date(l.work_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {l.projects?.name && (
                  <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                    {l.projects.name}
                  </span>
                )}
                {l.role && (
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {l.role}
                  </span>
                )}
                {l.worker_name && (
                  <span className="text-xs text-slate-400">{l.worker_name}</span>
                )}
              </div>
              <p className="text-slate-800 text-sm">{l.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 mr-4">
              {l.hours && (
                <span className="flex items-center gap-1 font-semibold text-slate-700 text-sm">
                  <Clock size={13} className="text-slate-400" /> {l.hours}ש'
                </span>
              )}
              <button onClick={() => remove(l.id)}
                className="opacity-0 group-hover:opacity-100 transition text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* מודאל רישום חדש */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">רישום עבודה</h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* תאריך + שעות */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>תאריך</label>
                  <input type="date" value={form.work_date}
                    onChange={e => setForm({...form, work_date: e.target.value})} className={inp} />
                </div>
                <div>
                  <label className={lbl}>שעות</label>
                  <input type="number" step="0.5" value={form.hours}
                    onChange={e => setForm({...form, hours: e.target.value})}
                    className={inp} placeholder="0" />
                </div>
              </div>
              {/* תפקיד */}
              <div>
                <label className={lbl}>תפקיד</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={inp}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {/* פרויקט */}
              <div>
                <label className={lbl}>פרויקט</label>
                <select value={form.project_id}
                  onChange={e => setForm({...form, project_id: e.target.value})} className={inp}>
                  <option value="">בחרי פרויקט...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {/* תיאור */}
              <div>
                <label className={lbl}>מה עשית *</label>
                <textarea value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className={inp + ' resize-none'} rows={3}
                  placeholder="תיאור העבודה שבוצעה..." />
              </div>
              {/* שם עובד */}
              <div>
                <label className={lbl}>שם עובד</label>
                <input value={form.worker_name}
                  onChange={e => setForm({...form, worker_name: e.target.value})}
                  className={inp} placeholder="שם..." />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={save}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                שמירה
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
