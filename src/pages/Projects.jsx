import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  ChevronRight, ChevronDown, CheckCircle2, Circle, Clock, AlertCircle,
  Calendar, User, MessageSquare, Plus, X, Trash2, Send,
  LayoutList, BarChart2, Flag, Pencil,
  Users, FileText, MapPin, ExternalLink, Link2, ContactRound,
} from 'lucide-react'

// ── קבועים ──
const STATUS = {
  pending:     { label: 'ממתין',  color: 'bg-slate-100 text-slate-500',      dot: 'bg-slate-400',    bar: '#94a3b8' },
  in_progress: { label: 'בביצוע', color: 'bg-blue-100 text-blue-700',        dot: 'bg-blue-500',     bar: '#6366f1' },
  done:        { label: 'הושלם',  color: 'bg-emerald-100 text-emerald-700',  dot: 'bg-emerald-500',  bar: '#10b981' },
  blocked:     { label: 'חסום',   color: 'bg-red-100 text-red-600',          dot: 'bg-red-500',      bar: '#ef4444' },
}
const PRIORITY = {
  low:    { label: 'נמוכה', color: 'text-slate-400',   icon: '↓' },
  normal: { label: 'רגילה', color: 'text-slate-500',   icon: '→' },
  high:   { label: 'גבוהה', color: 'text-orange-500',  icon: '↑' },
  urgent: { label: 'דחוף!', color: 'text-red-600',     icon: '⚡' },
}
const PROJECT_STATUS = {
  active:    { label: 'פעיל',  chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'הושלם', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  on_hold:   { label: 'מושהה', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
}

// קיבוץ משימות לפי שלב — שומר על סדר
function groupByPhase(tasks) {
  const map = new Map()
  tasks
    .filter(t => t.level !== 'subtask')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach(t => {
      const phase = t.phase_name || 'כללי'
      if (!map.has(phase)) map.set(phase, [])
      map.get(phase).push(t)
    })
  return map
}

// ── גאנט ──
function buildGantt(tasks, projectStartDate) {
  const pStart = projectStartDate ? new Date(projectStartDate) : new Date()
  pStart.setHours(0, 0, 0, 0)
  const mainTasks = tasks
    .filter(t => t.level !== 'subtask')
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  let cursor = 0
  const rows = mainTasks.map(task => {
    let startDay, endDay
    if (task.start_date && task.due_date) {
      const sd = new Date(task.start_date); sd.setHours(0, 0, 0, 0)
      const ed = new Date(task.due_date);   ed.setHours(0, 0, 0, 0)
      startDay = Math.round((sd - pStart) / 86400000)
      endDay   = Math.round((ed - pStart) / 86400000)
    } else {
      startDay = Math.max(0, cursor)
      endDay   = startDay + (task.estimated_days || 7)
      cursor   = endDay
    }
    return { ...task, startDay, endDay }
  })
  const totalDays = Math.max(...rows.map(r => r.endDay), 30)
  const todayDay  = Math.round((new Date() - pStart) / 86400000)
  return { rows, totalDays, todayDay }
}

// ── פאנל פרטי משימה ──
function TaskPanel({ task, onClose, onUpdate }) {
  const [name, setName]       = useState(task.name)
  const [editing, setEditing] = useState(false)
  const [logs, setLogs]       = useState([])
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => { fetchLogs() }, [task.id])

  async function fetchLogs() {
    const { data } = await supabase
      .from('task_logs').select('*').eq('task_id', task.id)
      .order('created_at', { ascending: false })
    setLogs(data || [])
  }

  async function updateField(field, value) {
    await supabase.from('tasks').update({ [field]: value }).eq('id', task.id)
    onUpdate()
  }

  async function saveName() {
    if (!name.trim()) return
    await updateField('name', name.trim())
    setEditing(false)
  }

  async function addLog() {
    if (!newNote.trim()) return
    setSaving(true)
    await supabase.from('task_logs').insert({ task_id: task.id, note: newNote.trim() })
    setNewNote('')
    fetchLogs()
    setSaving(false)
  }

  const statMeta = STATUS[task.status] || STATUS.pending
  const priMeta  = PRIORITY[task.priority] || PRIORITY.normal

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl border-l border-slate-100 flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* כותרת */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 gap-3">
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={name} onChange={e => setName(e.target.value)}
                onBlur={saveName}
                onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(task.name); setEditing(false) } }}
                className="text-base font-semibold text-slate-800 border-b-2 border-indigo-400 outline-none w-full bg-transparent"
                autoFocus />
            ) : (
              <h3 className="text-base font-semibold text-slate-800 cursor-pointer hover:text-indigo-600 leading-snug"
                onClick={() => setEditing(true)}>{task.name}</h3>
            )}
            {task.phase_name && (
              <p className="text-xs text-indigo-400 mt-1 font-medium">{task.phase_name}</p>
            )}
          </div>
          <button onClick={onClose} className="shrink-0 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* שדות */}
          <div className="px-5 py-4 space-y-3 border-b border-slate-50">
            {/* סטטוס */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">סטטוס</span>
              <select value={task.status} onChange={e => updateField('status', e.target.value)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer outline-none ${statMeta.color}`}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {/* עדיפות */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">עדיפות</span>
              <select value={task.priority || 'normal'} onChange={e => updateField('priority', e.target.value)}
                className={`text-xs px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer font-medium outline-none ${priMeta.color}`}>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
            {/* תאריך התחלה */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">התחלה</span>
              <input type="date" defaultValue={task.start_date || ''}
                onBlur={e => updateField('start_date', e.target.value || null)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 text-slate-700" />
            </div>
            {/* תאריך יעד */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">יעד</span>
              <input type="date" defaultValue={task.due_date || ''}
                onBlur={e => updateField('due_date', e.target.value || null)}
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 text-slate-700" />
            </div>
            {/* אחראי */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400 w-20 shrink-0">אחראי</span>
              <input defaultValue={task.assigned_to || ''}
                onBlur={e => updateField('assigned_to', e.target.value || null)}
                placeholder="שם..."
                className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 text-slate-700 flex-1" />
            </div>
            {/* תיאור */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1.5">תיאור / הנחיות</span>
              <textarea defaultValue={task.description || ''}
                onBlur={e => updateField('description', e.target.value || null)}
                placeholder="הוסיפי תיאור, הנחיות או מידע רלוונטי..."
                rows={3}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-400 text-slate-700 resize-none" />
            </div>
          </div>

          {/* יומן פעילות */}
          <div className="px-5 py-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MessageSquare size={12} /> יומן פעילות
            </h4>
            <div className="flex gap-2 mb-3">
              <input value={newNote} onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addLog()}
                placeholder="הוסיפי עדכון, הערה, פתרון..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20" />
              <button onClick={addLog} disabled={!newNote.trim() || saving}
                className="bg-indigo-600 text-white p-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-40">
                <Send size={13} />
              </button>
            </div>
            <div className="space-y-2">
              {logs.length === 0 && <p className="text-xs text-slate-400 italic">אין הערות עדיין</p>}
              {logs.map(log => (
                <div key={log.id} className="bg-slate-50 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-slate-700">{log.note}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {new Date(log.created_at).toLocaleDateString('he-IL')} · {new Date(log.created_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── כרטיס משימה ──
function TaskCard({ task, subtasks, onSelect, onStatusChange, onDelete }) {
  const [open, setOpen] = useState(false)
  const statMeta  = STATUS[task.status] || STATUS.pending
  const done      = subtasks.filter(s => s.status === 'done').length
  const total     = subtasks.length
  const progress  = total > 0 ? Math.round(done / total * 100) : (task.status === 'done' ? 100 : 0)
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'
  const priMeta   = PRIORITY[task.priority] || PRIORITY.normal

  return (
    <div className={`bg-white rounded-xl border mb-2 hover:shadow-sm transition-shadow overflow-hidden ${
      task.status === 'blocked' ? 'border-red-200' : 'border-slate-100'
    }`}>
      {/* שורה ראשית */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 group">
        {/* עיגול סטטוס */}
        <button onClick={() => onStatusChange(task.id, task.status === 'done' ? 'pending' : 'done')}
          className="shrink-0 transition">
          {task.status === 'done'
            ? <CheckCircle2 size={17} className="text-emerald-500" />
            : task.status === 'in_progress'
              ? <Clock size={17} className="text-blue-500" />
              : task.status === 'blocked'
                ? <AlertCircle size={17} className="text-red-500" />
                : <Circle size={17} className="text-slate-300 hover:text-indigo-400 transition" />
          }
        </button>

        {/* שם */}
        <button className="flex-1 text-right min-w-0" onClick={() => onSelect(task)}>
          <span className={`text-sm truncate block ${
            task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-700 hover:text-indigo-600'
          }`}>{task.name}</span>
        </button>

        {/* עדיפות */}
        {task.priority && task.priority !== 'normal' && (
          <span className={`text-xs shrink-0 font-bold ${priMeta.color}`}>{priMeta.icon}</span>
        )}

        {/* תאריכים */}
        {(task.start_date || task.due_date) && (
          <span className={`text-[11px] flex items-center gap-1 shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
            <Calendar size={10} />
            {task.start_date && fmtDate(task.start_date)}
            {task.start_date && task.due_date && ' – '}
            {task.due_date && fmtDate(task.due_date)}
          </span>
        )}

        {/* אחראי */}
        {task.assigned_to && (
          <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0 max-w-[70px] truncate">
            <User size={10} /> {task.assigned_to}
          </span>
        )}

        {/* סטטוס badge */}
        <select value={task.status} onChange={e => { e.stopPropagation(); onStatusChange(task.id, e.target.value) }}
          onClick={e => e.stopPropagation()}
          className={`text-[11px] px-2 py-1 rounded-full font-medium border-0 cursor-pointer outline-none shrink-0 ${statMeta.color}`}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* צ'קליסט toggle */}
        {total > 0 && (
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-600 transition shrink-0 bg-slate-50 px-2 py-0.5 rounded-full">
            <span className={`font-semibold tabular-nums ${done === total ? 'text-emerald-500' : ''}`}>{done}/{total}</span>
            <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}

        {/* מחיקה */}
        <button onClick={() => onDelete(task.id)}
          className="shrink-0 text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
          <Trash2 size={12} />
        </button>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-0.5 bg-slate-100 mx-3 rounded-full mb-0.5">
          <div className={`h-full rounded-full transition-all duration-300 ${done === total ? 'bg-emerald-400' : 'bg-indigo-400'}`}
            style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* צ'קליסט */}
      {open && total > 0 && (
        <div className="border-t border-slate-50 bg-slate-50/40 py-1 px-1">
          {subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-2.5 px-4 py-1.5 rounded-lg hover:bg-white/80 transition cursor-pointer"
              onClick={() => onStatusChange(sub.id, sub.status === 'done' ? 'pending' : 'done')}>
              {sub.status === 'done'
                ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                : <Circle size={13} className="text-slate-300 hover:text-indigo-400 shrink-0 transition" />
              }
              <span className={`text-xs flex-1 text-right ${sub.status === 'done' ? 'line-through text-slate-400' : 'text-slate-600'}`}>
                {sub.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── גאנט ──
function GanttView({ tasks, project, onSelectTask }) {
  const { rows, totalDays, todayDay } = buildGantt(tasks, project?.start_date)
  const weekCount = Math.ceil(totalDays / 7) + 1
  const pStart    = project?.start_date ? new Date(project.start_date) : new Date()
  const grouped   = groupByPhase(tasks)
  const todayPct  = Math.max(0, Math.min(100, (todayDay / totalDays) * 100))

  function weekLabel(i) {
    const d = new Date(pStart)
    d.setDate(d.getDate() + i * 7)
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })
  }

  const rowMap = {}
  rows.forEach(r => { rowMap[r.id] = r })

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
      <div style={{ minWidth: 640 }}>
        {/* כותרת ציר זמן */}
        <div className="flex border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="w-48 shrink-0 px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 border-r border-slate-200">
            משימה
          </div>
          <div className="flex-1 relative h-8 bg-slate-50 overflow-hidden">
            {Array.from({ length: weekCount }).map((_, i) => (
              <div key={i} className="absolute top-0 bottom-0 flex items-end pb-1 border-r border-slate-200"
                style={{ left: `${(i * 7 / totalDays) * 100}%` }}>
                <span className="text-[9px] text-slate-400 whitespace-nowrap mr-1">{weekLabel(i)}</span>
              </div>
            ))}
            {todayDay >= 0 && todayDay <= totalDays && (
              <div className="absolute top-0 bottom-0 flex flex-col items-center z-10" style={{ left: `${todayPct}%` }}>
                <span className="text-[9px] text-red-500 font-bold whitespace-nowrap mt-0.5">היום</span>
                <div className="flex-1 w-0.5 bg-red-400" />
              </div>
            )}
          </div>
        </div>

        {/* שורות לפי שלב */}
        {Array.from(grouped.entries()).map(([phase, phaseTasks]) => (
          <div key={phase}>
            <div className="flex border-b border-slate-100 bg-indigo-50/50">
              <div className="w-48 shrink-0 px-4 py-1.5 text-xs font-semibold text-indigo-700 border-r border-slate-100">{phase}</div>
              <div className="flex-1" />
            </div>
            {phaseTasks.map((task, idx) => {
              const row = rowMap[task.id]
              if (!row) return null
              const barLeft  = (row.startDay / totalDays) * 100
              const barWidth = Math.max(1, ((row.endDay - row.startDay) / totalDays) * 100)
              return (
                <div key={task.id} className={`flex border-b border-slate-50 hover:bg-indigo-50/20 transition ${idx % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                  <div className="w-48 shrink-0 px-3 py-2.5 border-r border-slate-100 cursor-pointer" onClick={() => onSelectTask(task)}>
                    <p className="text-xs text-slate-700 truncate">{task.name}</p>
                    {task.due_date && <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(task.start_date)} – {fmtDate(task.due_date)}</p>}
                  </div>
                  <div className="flex-1 relative" style={{ height: 40 }}>
                    {Array.from({ length: weekCount }).map((_, i) => (
                      <div key={i} className="absolute top-0 bottom-0 border-r border-slate-100"
                        style={{ left: `${(i * 7 / totalDays) * 100}%` }} />
                    ))}
                    {todayDay >= 0 && todayDay <= totalDays && (
                      <div className="absolute top-0 bottom-0 w-0.5 bg-red-400 opacity-30 z-10" style={{ left: `${todayPct}%` }} />
                    )}
                    <div className="absolute top-2.5 bottom-2.5 rounded-md"
                      style={{
                        left: `${barLeft}%`,
                        width: `${barWidth}%`,
                        backgroundColor: STATUS[task.status]?.bar || '#94a3b8',
                        opacity: task.status === 'done' ? 0.45 : 0.82,
                      }} />
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        {/* מקרא */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 bg-slate-50/50 flex-wrap">
          {Object.entries(STATUS).map(([k, v]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: v.bar }} />
              <span className="text-[11px] text-slate-500">{v.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 mr-2">
            <div className="w-0.5 h-3.5 bg-red-400" />
            <span className="text-[11px] text-slate-500">היום</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── כרטיס לקוח ──
function ClientCard({ project }) {
  const [card, setCard]         = useState(null)
  const [contacts, setContacts] = useState([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => { fetchCard() }, [project.id])

  async function fetchCard() {
    const [{ data: c }, { data: co }] = await Promise.all([
      supabase.from('project_client_cards').select('*').eq('project_id', project.id).maybeSingle(),
      supabase.from('project_contacts').select('*').eq('project_id', project.id).order('sort_order'),
    ])
    setCard(c || {})
    setContacts(co || [])
  }

  async function updateCard(field, value) {
    if (card?.id) {
      await supabase.from('project_client_cards')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', card.id)
      setCard(prev => ({ ...prev, [field]: value }))
    } else {
      const { data } = await supabase.from('project_client_cards')
        .insert({ project_id: project.id, [field]: value })
        .select().single()
      setCard(data || { [field]: value })
    }
  }

  async function addContact() {
    const { data } = await supabase.from('project_contacts')
      .insert({ project_id: project.id, name: 'איש קשר חדש', sort_order: contacts.length })
      .select().single()
    if (data) setContacts(prev => [...prev, data])
  }

  async function updateContact(id, field, value) {
    await supabase.from('project_contacts').update({ [field]: value }).eq('id', id)
    setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  async function deleteContact(id) {
    await supabase.from('project_contacts').delete().eq('id', id)
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  async function uploadIdPhoto(file) {
    if (!file) return
    setUploading(true)
    const ext  = file.name.split('.').pop()
    const path = `id-photos/${project.id}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      await updateCard('id_photo_url', publicUrl)
    }
    setUploading(false)
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
  const lbl = "text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5"

  if (card === null) return <div className="text-slate-400 text-sm p-8">טוען...</div>

  return (
    <div className="space-y-4 pb-6">

      {/* ── אנשי קשר ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users size={16} className="text-indigo-400" /> אנשי קשר
          </h3>
          <button onClick={addContact}
            className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition font-medium flex items-center gap-1">
            <Plus size={12} /> הוסף
          </button>
        </div>

        {contacts.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-4">לחצי "+ הוסף" להוספת איש קשר</p>
        )}
        <div className="space-y-3">
          {contacts.map(ct => (
            <div key={ct.id} className="bg-slate-50 rounded-xl p-4 relative group">
              <button onClick={() => deleteContact(ct.id)}
                className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition text-slate-300 hover:text-red-500 p-1 rounded">
                <Trash2 size={12} />
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>שם</label>
                  <input defaultValue={ct.name}
                    onBlur={e => updateContact(ct.id, 'name', e.target.value)}
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>תפקיד</label>
                  <input defaultValue={ct.role}
                    onBlur={e => updateContact(ct.id, 'role', e.target.value)}
                    placeholder="בעל הדירה, בן/בת זוג..."
                    className={inp} />
                </div>
                <div>
                  <label className={lbl}>טלפון</label>
                  <input defaultValue={ct.phone}
                    onBlur={e => updateContact(ct.id, 'phone', e.target.value)}
                    placeholder="050-0000000" className={inp} />
                </div>
                <div>
                  <label className={lbl}>מייל</label>
                  <input defaultValue={ct.email}
                    onBlur={e => updateContact(ct.id, 'email', e.target.value)}
                    placeholder="email@example.com" className={inp} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── פרטי זיהוי ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <FileText size={16} className="text-indigo-400" /> פרטי זיהוי
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>מספר ת"ז / דרכון</label>
            <input key={`id-${card.id}`} defaultValue={card.id_number || ''}
              onBlur={e => updateCard('id_number', e.target.value)}
              placeholder="000000000" className={inp} />
          </div>
          <div>
            <label className={lbl}>צילום ת"ז / דרכון</label>
            <div className="flex gap-2">
              <input type="file" accept="image/*,application/pdf"
                onChange={e => uploadIdPhoto(e.target.files?.[0])}
                className="hidden" id={`id-photo-${project.id}`} />
              <label htmlFor={`id-photo-${project.id}`}
                className="flex-1 border border-dashed border-slate-300 rounded-xl px-3 py-2.5 text-sm text-slate-400 cursor-pointer hover:border-indigo-400 hover:text-indigo-500 transition text-center">
                {uploading ? '⏳ מעלה...' : card.id_photo_url ? '✓ קיים — החלפה' : '+ העלה קובץ'}
              </label>
              {card.id_photo_url && (
                <a href={card.id_photo_url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition flex items-center">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── פרטי הנכס ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-indigo-400" /> פרטי הנכס
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>כתובת</label>
            <input key={`addr-${card.id}`} defaultValue={card.address || ''}
              onBlur={e => updateCard('address', e.target.value)}
              placeholder="רחוב, מספר, עיר" className={inp} />
          </div>
          <div>
            <label className={lbl}>מספר חנייה</label>
            <input key={`park-${card.id}`} defaultValue={card.parking_number || ''}
              onBlur={e => updateCard('parking_number', e.target.value)}
              placeholder="12" className={inp} />
          </div>
          <div>
            <label className={lbl}>קוד בניין</label>
            <input key={`bldg-${card.id}`} defaultValue={card.building_code || ''}
              onBlur={e => updateCard('building_code', e.target.value)}
              placeholder="#1234" className={inp} />
          </div>
          <div className="col-span-2">
            <label className={lbl}>דד ליין לפרויקט</label>
            <input type="date" key={`dl-${card.id}`} defaultValue={card.deadline || ''}
              onBlur={e => updateCard('deadline', e.target.value || null)}
              className={inp} />
          </div>
        </div>
      </div>

      {/* ── קישורים ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Link2 size={16} className="text-indigo-400" /> קישורים
        </h3>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Google Drive</label>
            <div className="flex gap-2">
              <input key={`drive-${card.id}`} defaultValue={card.drive_link || ''}
                onBlur={e => updateCard('drive_link', e.target.value)}
                placeholder="https://drive.google.com/..." className={`${inp} flex-1`} />
              {card.drive_link && (
                <a href={card.drive_link} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition flex items-center">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
          <div>
            <label className={lbl}>Pinterest</label>
            <div className="flex gap-2">
              <input key={`pin-${card.id}`} defaultValue={card.pinterest_link || ''}
                onBlur={e => updateCard('pinterest_link', e.target.value)}
                placeholder="https://pinterest.com/..." className={`${inp} flex-1`} />
              {card.pinterest_link && (
                <a href={card.pinterest_link} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-indigo-600 transition flex items-center">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── הערות ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <MessageSquare size={16} className="text-indigo-400" /> דברים חשובים מהצעת המחיר
        </h3>
        <textarea key={`notes-${card.id}`} defaultValue={card.important_notes || ''}
          onBlur={e => updateCard('important_notes', e.target.value)}
          rows={4}
          placeholder="הדגשים, העדפות, דברים קריטיים שחשוב לזכור..."
          className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-none" />
      </div>

    </div>
  )
}

// ── פרטי פרויקט ──
function ProjectDetail({ project, clients, onBack }) {
  const [tasks, setTasks]                 = useState([])
  const [loading, setLoading]             = useState(true)
  const [view, setView]                   = useState('tasks')
  const [phaseExpanded, setPhaseExpanded] = useState({})
  const [selectedTask, setSelectedTask]   = useState(null)
  const [showNewTask, setShowNewTask]     = useState(false)
  const [taskForm, setTaskForm]           = useState({ name: '', due_date: '', assigned_to: '', priority: 'normal', phase_name: '' })
  const [projectStatus, setProjectStatus] = useState(project.status)

  useEffect(() => { fetchTasks() }, [project.id])

  async function fetchTasks() {
    const { data } = await supabase
      .from('tasks').select('*').eq('project_id', project.id)
      .order('sort_order').order('created_at')
    setTasks(data || [])
    setLoading(false)
    // פתח את כל השלבים כברירת מחדל
    const phases = {}
    ;(data || []).filter(t => t.level !== 'subtask').forEach(t => {
      if (t.phase_name) phases[t.phase_name] = true
    })
    setPhaseExpanded(phases)
  }

  async function updateTaskStatus(taskId, status) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t))
    if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, status }))
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('parent_task_id', taskId)
    await supabase.from('tasks').delete().eq('id', taskId)
    if (selectedTask?.id === taskId) setSelectedTask(null)
    fetchTasks()
  }

  async function addTask() {
    if (!taskForm.name.trim()) return
    await supabase.from('tasks').insert({
      ...taskForm, project_id: project.id, status: 'pending', level: 'task',
      sort_order: 9999,
    })
    setShowNewTask(false)
    setTaskForm({ name: '', due_date: '', assigned_to: '', priority: 'normal', phase_name: '' })
    fetchTasks()
  }

  async function updateProjectStatus(status) {
    await supabase.from('projects').update({ status }).eq('id', project.id)
    setProjectStatus(status)
  }

  const mainTasks  = tasks.filter(t => t.level !== 'subtask')
  const doneTasks  = mainTasks.filter(t => t.status === 'done').length
  const progress   = mainTasks.length ? Math.round(doneTasks / mainTasks.length * 100) : 0
  const grouped    = groupByPhase(tasks)
  const client     = clients.find(c => c.id === project.client_id)

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  return (
    <div className="relative">
      {/* breadcrumb */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 transition text-sm">פרויקטים</button>
        <ChevronRight size={14} className="text-slate-300" />
        <span className="text-slate-800 font-semibold text-sm">{project.name}</span>

        <select value={projectStatus} onChange={e => updateProjectStatus(e.target.value)}
          className={`text-xs border px-2.5 py-1 rounded-full font-medium cursor-pointer focus:outline-none mr-1 ${PROJECT_STATUS[projectStatus]?.chip}`}>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        <div className="mr-auto flex items-center gap-2 flex-wrap">
          {client && <span className="text-xs text-slate-400 flex items-center gap-1"><User size={11} /> {client.name}</span>}
          {project.start_date && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar size={11} /> {fmtDate(project.start_date)}
            </span>
          )}

          {/* toggle תצוגה */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView('tasks')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                view === 'tasks' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <LayoutList size={13} /> משימות
            </button>
            <button onClick={() => setView('gantt')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                view === 'gantt' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <BarChart2 size={13} /> גאנט
            </button>
            <button onClick={() => setView('client')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                view === 'client' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <ContactRound size={13} /> כרטיס לקוח
            </button>
          </div>

          <button onClick={() => setShowNewTask(true)}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition flex items-center gap-1">
            <Plus size={13} /> משימה
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'משימות',  value: mainTasks.length,                                         color: 'text-slate-700' },
          { label: 'הושלמו',  value: doneTasks,                                                 color: 'text-emerald-600' },
          { label: 'בביצוע',  value: mainTasks.filter(t => t.status === 'in_progress').length,  color: 'text-blue-600' },
          { label: 'חסומות',  value: mainTasks.filter(t => t.status === 'blocked').length,      color: 'text-red-500' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 text-center">
            <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {mainTasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 mb-4 flex items-center gap-4">
          <span className="text-sm font-medium text-slate-700 shrink-0">התקדמות</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-bold text-indigo-600 shrink-0 w-10 text-left">{progress}%</span>
        </div>
      )}

      {/* Empty state */}
      {mainTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">📋</div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">אין משימות עדיין</h3>
          <p className="text-sm text-slate-400 mb-5">אשרי הצעת מחיר ללקוח — משימות ייווצרו אוטומטית</p>
          <button onClick={() => setShowNewTask(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
            + משימה ידנית
          </button>
        </div>
      )}

      {/* ── תצוגת משימות ── */}
      {view === 'tasks' && mainTasks.length > 0 && (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([phase, phaseTasks]) => {
            const phaseDone = phaseTasks.filter(t => t.status === 'done').length
            const phaseProgress = phaseTasks.length ? Math.round(phaseDone / phaseTasks.length * 100) : 0
            const isOpen = phaseExpanded[phase] !== false

            return (
              <div key={phase} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* כותרת שלב */}
                <button onClick={() => setPhaseExpanded(p => ({ ...p, [phase]: !isOpen }))}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition border-b border-slate-100">
                  {isOpen
                    ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
                    : <ChevronRight size={14} className="text-slate-400 shrink-0" />
                  }
                  <span className="font-semibold text-slate-700 text-sm flex-1 text-right">{phase}</span>
                  <span className="text-xs text-slate-400 tabular-nums">{phaseDone}/{phaseTasks.length}</span>
                  <div className="w-20 bg-slate-200 rounded-full h-1.5 shrink-0">
                    <div className={`h-1.5 rounded-full transition-all ${phaseProgress === 100 ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                      style={{ width: `${phaseProgress}%` }} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3 pt-2 pb-1">
                    {phaseTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        subtasks={tasks.filter(t => t.parent_task_id === task.id && t.level === 'subtask')}
                        onSelect={setSelectedTask}
                        onStatusChange={updateTaskStatus}
                        onDelete={deleteTask}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── גאנט ── */}
      {view === 'gantt' && mainTasks.length > 0 && (
        <GanttView tasks={tasks} project={project} onSelectTask={setSelectedTask} />
      )}

      {/* ── כרטיס לקוח ── */}
      {view === 'client' && (
        <ClientCard project={project} />
      )}

      {/* Modal משימה חדשה */}
      {showNewTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">משימה חדשה</h2>
              <button onClick={() => setShowNewTask(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">שם המשימה *</label>
                <input value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })}
                  autoFocus onKeyDown={e => e.key === 'Enter' && addTask()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">שלב</label>
                <input value={taskForm.phase_name} onChange={e => setTaskForm({ ...taskForm, phase_name: e.target.value })}
                  placeholder="לדוגמה: תכנון ראשוני"
                  list="phase-list"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                <datalist id="phase-list">
                  {Array.from(grouped.keys()).map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">תאריך יעד</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">עדיפות</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                    {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={addTask} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">הוסף</button>
              <button onClick={() => setShowNewTask(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}

      {/* פאנל פרטי משימה */}
      {selectedTask && (
        <TaskPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => {
            fetchTasks()
            // עדכון המשימה הנבחרת עם הנתונים החדשים
            supabase.from('tasks').select('*').eq('id', selectedTask.id).single()
              .then(({ data }) => { if (data) setSelectedTask(data) })
          }}
        />
      )}
    </div>
  )
}

// ── עמוד ראשי ──
export default function Projects() {
  const [projects, setProjects] = useState([])
  const [clients, setClients]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [showNew, setShowNew]   = useState(false)
  const [form, setForm]         = useState({ name: '', client_id: '', start_date: '', end_date: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ])
    setProjects(p || [])
    setClients(c || [])
    setLoading(false)
  }

  async function create() {
    if (!form.name.trim() || !form.client_id) return
    const { data: p } = await supabase.from('projects').insert({ ...form, status: 'active' }).select().single()
    setShowNew(false)
    setForm({ name: '', client_id: '', start_date: '', end_date: '' })
    fetchAll()
  }

  async function deleteProject(id) {
    if (!confirm('למחוק פרויקט זה וכל משימותיו?')) return
    await supabase.from('tasks').delete().eq('project_id', id)
    await supabase.from('projects').delete().eq('id', id)
    fetchAll()
  }

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  if (selected) return (
    <ProjectDetail project={selected} clients={clients} onBack={() => { setSelected(null); fetchAll() }} />
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">פרויקטים</h1>
          <p className="text-sm text-slate-400 mt-0.5">{projects.length} פרויקטים</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2">
          <Plus size={15} /> פרויקט חדש
        </button>
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">📐</div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">אין פרויקטים עדיין</h3>
          <p className="text-sm text-slate-400">אשרי הצעת מחיר ללקוח — פרויקט ייפתח אוטומטית</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => {
          const meta = PROJECT_STATUS[p.status] || PROJECT_STATUS.active
          return (
            <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all group relative"
              onClick={() => setSelected(p)}>
              <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
                className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition text-slate-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50">
                <Trash2 size={13} />
              </button>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-lg shrink-0">📐</div>
                <span className={`inline-flex items-center text-xs border px-2.5 py-0.5 rounded-full font-medium ${meta.chip}`}>
                  {meta.label}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-0.5">{p.name}</h3>
              <p className="text-sm text-slate-400">{p.clients?.name}</p>
              {p.start_date && (
                <p className="text-xs text-slate-300 mt-2 flex items-center gap-1">
                  <Calendar size={10} /> {fmtDate(p.start_date)}
                  {p.end_date && <> – {fmtDate(p.end_date)}</>}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal פרויקט חדש */}
      {showNew && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">פרויקט חדש</h2>
              <button onClick={() => setShowNew(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">שם הפרויקט *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  autoFocus onKeyDown={e => e.key === 'Enter' && create()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">לקוח *</label>
                <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400">
                  <option value="">בחרי לקוח...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">תחילת פרויקט</label>
                  <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">סיום פרויקט</label>
                  <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={create} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">צור פרויקט</button>
              <button onClick={() => setShowNew(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
