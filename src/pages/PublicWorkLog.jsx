import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Calendar } from 'lucide-react'

// תפקידים
const ROLES = ['מנהלת פרויקט', 'שרטטת', 'מעצבת', 'אחר']

// דף ציבורי ליומן עבודה — ללא התחברות
export default function PublicWorkLog() {
  const [logs, setLogs]           = useState([])
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [filterProj, setFilterProj] = useState('')
  const [filterRole, setFilterRole] = useState('')

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

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-slate-400 text-sm">טוען...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* כותרת עליונה */}
      <div className="bg-slate-900 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">M</div>
          <div>
            <span className="text-white font-semibold text-lg">Motiv</span>
            <span className="text-slate-400 text-sm mr-3">· יומן עבודה</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* כותרת */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">יומן עבודה</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {logs.length} רשומות · סה"כ {logs.reduce((s, l) => s + Number(l.hours || 0), 0)} שעות
          </p>
        </div>

        {/* KPI שעות לפי תפקיד */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ROLES.map(r => (
            <div key={r} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <p className="text-2xl font-bold text-slate-800">
                {hoursByRole[r] || 0}<span className="text-sm font-normal text-slate-400">ש'</span>
              </p>
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
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📅</div>
            <p className="text-slate-400 text-sm">אין רשומות עדיין</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(l => (
              <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
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
                {l.hours && (
                  <div className="flex items-center gap-1 font-semibold text-slate-700 text-sm shrink-0 mr-4">
                    <Clock size={13} className="text-slate-400" /> {l.hours}ש'
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* פוטר */}
        <div className="text-center pt-4 pb-8">
          <p className="text-xs text-slate-300">Motiv · מערכת ניהול פרויקטים</p>
        </div>
      </div>
    </div>
  )
}
