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
 pending:   { label: 'Pending', color: 'bg-[#F3F3F3] text-[#6B7A90]',   dot: 'bg-[#6B7A90]',  bar: '#94a3b8' },
 in_progress: { label: 'In Progress', color: 'bg-[#F3F3F3] text-[#091426]',    dot: 'bg-[#091426]',   bar: '#374151' },
 done:    { label: 'Completed', color: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', bar: '#10b981' },
 blocked:   { label: 'Blocked',  color: 'bg-red-50 text-red-600',     dot: 'bg-red-500',   bar: '#ef4444' },
}
const PRIORITY = {
 low:  { label: 'Low', color: 'text-[#6B7A90]',  icon: '↓' },
 normal: { label: 'Normal', color: 'text-[#6B7A90]',  icon: '→' },
 high:  { label: 'High', color: 'text-orange-500', icon: '↑' },
 urgent: { label: 'Urgent!', color: 'text-red-600',   icon: '⚡' },
}
const PROJECT_STATUS = {
 active:  { label: 'Active', chip: 'bg-emerald-50 text-emerald-700' },
 completed: { label: 'Completed', chip: 'bg-[#F3F3F3] text-[#6B7A90]' },
 on_hold:  { label: 'On Hold', chip: 'bg-amber-50 text-amber-700' },
}

function fmtDate(d) {
 if (!d) return ''
 return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

// קיבוץ משימות לפי שלב
function groupByPhase(tasks) {
 const map = new Map()
 tasks
  .filter(t => t.level !== 'subtask')
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  .forEach(t => {
   const phase = t.phase_name || 'General'
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
   const ed = new Date(task.due_date);  ed.setHours(0, 0, 0, 0)
   startDay = Math.round((sd - pStart) / 86400000)
   endDay  = Math.round((ed - pStart) / 86400000)
  } else {
   startDay = Math.max(0, cursor)
   endDay  = startDay + (task.estimated_days || 7)
   cursor  = endDay
  }
  return { ...task, startDay, endDay }
 })
 const totalDays = Math.max(...rows.map(r => r.endDay), 30)
 const todayDay = Math.round((new Date() - pStart) / 86400000)
 return { rows, totalDays, todayDay }
}

// ── פאנל פרטי משימה ──
function TaskPanel({ task, onClose, onUpdate }) {
 const [name, setName]    = useState(task.name)
 const [editing, setEditing] = useState(false)
 const [logs, setLogs]    = useState([])
 const [newNote, setNewNote] = useState('')
 const [saving, setSaving]  = useState(false)
 const [resources, setResources] = useState([])
 const [viewingResource, setViewingResource] = useState(null)
 const [sigUrl, setSigUrl] = useState(null)

 useEffect(() => { fetchLogs(); fetchResources() }, [task.id])

 async function fetchLogs() {
  const { data } = await supabase
   .from('task_logs').select('*').eq('task_id', task.id)
   .order('created_at', { ascending: false })
  setLogs(data || [])
 }

 async function fetchResources() {
  // Search by task name AND by subtask names under this task
  const searchTerms = [task.name.split(' ').slice(0, 3).join(' ')]

  // Get subtasks of this task to also match their names
  const { data: subs } = await supabase
   .from('tasks').select('name').eq('parent_task_id', task.id).eq('level', 'subtask')
  if (subs) subs.forEach(s => searchTerms.push(s.name.split(' ').slice(0, 3).join(' ')))

  // Build OR query
  const orFilter = searchTerms.map(t => `related_task.ilike.%${t}%`).join(',')
  const { data } = await supabase
   .from('knowledge').select('*')
   .or(orFilter)
  setResources(data || [])
 }

 // Check if this task needs a signature
 const needsSignature = /sign|approv|חתימ|אישור/i.test(task.name)

 async function sendForSignature() {
  const token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16)
  const url = window.location.origin + '/sign/' + token

  // Save signature request in DB
  const { error } = await supabase.from('signatures').insert({
   task_id: task.id,
   token: token,
   status: 'pending',
  })

  if (error) {
   // If signatures table doesn't exist yet, fallback to log only
   await supabase.from('task_logs').insert({ task_id: task.id, note: '✍️ Signature link: ' + url })
  } else {
   await supabase.from('task_logs').insert({ task_id: task.id, note: '✍️ Signature request created — waiting for client' })
  }

  setSigUrl(url)
  fetchLogs()
  onUpdate()

  navigator.clipboard?.writeText(url)

  // Open email with signature link
  const subject = encodeURIComponent('Document for Your Approval — Yael Siso Interior Design')
  const body = encodeURIComponent(
`Dear Client,

Please review and sign the following document:

Task: ${task.name}
${task.phase_name ? 'Phase: ' + task.phase_name : ''}

Click the link below to sign:
${url}

If you have any questions, please don't hesitate to reach out.

Best regards,
Yael Siso | Interior Design`
  )
  window.open('mailto:?subject=' + subject + '&body=' + body)
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
 const priMeta = PRIORITY[task.priority] || PRIORITY.normal

 return (
  <div className="fixed inset-0 z-40" onClick={onClose}>
   <div className="absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl border-l border-[#F3F3F3] flex flex-col"
    onClick={e => e.stopPropagation()}>

    {/* כותרת */}
    <div className="flex items-start justify-between px-5 py-4 border-b border-[#F3F3F3] gap-3">
     <div className="flex-1 min-w-0">
      {editing ? (
       <input value={name} onChange={e => setName(e.target.value)}
        onBlur={saveName}
        onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setName(task.name); setEditing(false) } }}
        className="text-base font-semibold text-[#091426] border-b-2 border-[#091426] outline-none w-full bg-transparent"
        autoFocus />
      ) : (
       <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight cursor-pointer hover:text-[#091426] leading-snug"
        onClick={() => setEditing(true)}>{task.name}</h3>
      )}
      {task.phase_name && (
       <p className="text-xs text-[#6B7A90] mt-1 font-medium">{task.phase_name}</p>
      )}
     </div>
     <button onClick={onClose} className="shrink-0 text-[#6B7A90] hover:text-[#091426] p-1.5 rounded-lg hover:bg-[#F3F3F3] transition">
      <X size={16} />
     </button>
    </div>

    <div className="flex-1 overflow-y-auto">
     {/* שדות */}
     <div className="px-5 py-4 space-y-3 border-b border-[#F3F3F3]">
      {/* סטטוס */}
      <div className="flex items-center gap-3">
       <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] w-20 shrink-0">Status</span>
       <select value={task.status} onChange={e => updateField('status', e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-full font-medium border-0 cursor-pointer outline-none ${statMeta.color}`}>
        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
       </select>
      </div>
      {/* עדיפות */}
      <div className="flex items-center gap-3">
       <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] w-20 shrink-0">Priority</span>
       <select value={task.priority || 'normal'} onChange={e => updateField('priority', e.target.value)}
        className={`text-xs px-3 py-1.5 rounded-xl bg-[#F3F3F3] border-0 cursor-pointer font-medium outline-none ${priMeta.color}`}>
        {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
       </select>
      </div>
      {/* תאריך התחלה */}
      <div className="flex items-center gap-3">
       <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] w-20 shrink-0">Start</span>
       <input type="date" defaultValue={task.start_date || ''}
        onBlur={e => updateField('start_date', e.target.value || null)}
        className="text-xs bg-[#F3F3F3] rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-[#091426]" />
      </div>
      {/* תאריך יעד */}
      <div className="flex items-center gap-3">
       <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] w-20 shrink-0">Due</span>
       <input type="date" defaultValue={task.due_date || ''}
        onBlur={e => updateField('due_date', e.target.value || null)}
        className="text-xs bg-[#F3F3F3] rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-[#091426]" />
      </div>
      {/* אחראי */}
      <div className="flex items-center gap-3">
       <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] w-20 shrink-0">Assignee</span>
       <input defaultValue={task.assigned_to || ''}
        onBlur={e => updateField('assigned_to', e.target.value || null)}
        placeholder="Name..."
        className="text-xs bg-[#F3F3F3] rounded-xl px-3 py-1.5 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-[#091426] flex-1" />
      </div>
      {/* תיאור */}
      <div>
       <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Description / Instructions</span>
       <textarea defaultValue={task.description || ''}
        onBlur={e => updateField('description', e.target.value || null)}
        placeholder="Add a description, instructions or relevant info..."
        rows={3}
        className="w-full text-xs bg-[#F3F3F3] rounded-xl px-3 py-2.5 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-[#091426] resize-none" />
      </div>
     </div>

     {/* Signature */}
     {needsSignature && (
      <div className="px-5 py-4 border-b border-[#F3F3F3]">
       <h4 className="text-[10px] font-semibold tracking-widest uppercase text-[#7B5800] mb-2 flex items-center gap-1.5">
        ✍️ Digital Signature
       </h4>
       {task.status === 'done' ? (
        <div className="bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700 font-medium">✓ Signed & Completed</div>
       ) : (
        <button onClick={sendForSignature}
         className="bg-gradient-to-r from-[#7B5800] to-[#B8960B] text-white px-4 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-all w-full">
         Send for Signature
        </button>
       )}
       {sigUrl && (
        <p className="text-[10px] text-[#6B7A90] mt-2 break-all">Link: {sigUrl}</p>
       )}
      </div>
     )}

     {/* Related Resources from Knowledge Base */}
     {resources.length > 0 && (
      <div className="px-5 py-4 border-b border-[#F3F3F3]">
       <h4 className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-2 flex items-center gap-1.5">
        <FileText size={12} strokeWidth={1.8} /> Related Resources
       </h4>
       <div className="space-y-1.5">
        {resources.map(r => (
         <button key={r.id} onClick={() => setViewingResource(r)}
          className="w-full flex items-center gap-2 bg-[#F9F9F9] rounded-xl px-3 py-2.5 text-xs hover:bg-[#F3F3F3] transition-all text-left">
          <span className="text-[10px]">📎</span>
          <span className="text-[#091426] font-medium flex-1">{r.title}</span>
          <span className="text-[#7B5800] font-medium shrink-0">View →</span>
         </button>
        ))}
       </div>

       {/* Resource detail inline */}
       {viewingResource && (
        <div className="mt-3 bg-white border border-[#F3F3F3] rounded-xl p-4">
         <div className="flex items-start justify-between mb-2">
          <h5 className="text-sm font-semibold text-[#091426] font-[Manrope]">{viewingResource.title}</h5>
          <button onClick={() => setViewingResource(null)} className="text-[#6B7A90] hover:text-[#091426] p-0.5">
           <X size={14} />
          </button>
         </div>
         {viewingResource.file_type && (
          <span className="text-[10px] font-bold tracking-wider bg-[#F3F3F3] text-[#6B7A90] px-2 py-0.5 rounded-full">
           {viewingResource.file_type.toUpperCase()}
          </span>
         )}
         {viewingResource.content && (
          <p className="text-xs text-[#091426] whitespace-pre-wrap leading-relaxed mt-3">{viewingResource.content}</p>
         )}
         {viewingResource.drive_link && (
          <a href={viewingResource.drive_link} target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7B5800] hover:text-[#B8960B] mt-3 bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
           📂 Open in Google Drive
          </a>
         )}
        </div>
       )}
      </div>
     )}

     {/* יומן פעילות */}
     <div className="px-5 py-4">
      <h4 className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-3 flex items-center gap-1.5">
       <MessageSquare size={12} strokeWidth={1.8} /> Activity Log
      </h4>
      <div className="flex gap-2 mb-3">
       <input value={newNote} onChange={e => setNewNote(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && addLog()}
        placeholder="Add an update, note, solution..."
        className="flex-1 text-xs bg-[#F3F3F3] rounded-xl px-3 py-2 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
       <button onClick={addLog} disabled={!newNote.trim() || saving}
        className="bg-[#091426] text-white p-2 rounded-xl hover:bg-[#1E293B] transition-all disabled:opacity-40">
        <Send size={13} strokeWidth={1.8} />
       </button>
      </div>
      <div className="space-y-2">
       {logs.length === 0 && <p className="text-xs text-[#6B7A90] italic">No notes yet</p>}
       {logs.map(log => (
        <div key={log.id} className="bg-[#F3F3F3] rounded-xl px-3 py-2.5">
         <p className="text-xs text-[#091426]">{log.note}</p>
         <p className="text-[10px] text-[#6B7A90] mt-1">
          {new Date(log.created_at).toLocaleDateString('en-US')} · {new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
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
function TaskCard({ task, subtasks, hasResource, onSelect, onStatusChange, onDelete }) {
 const [open, setOpen] = useState(false)
 const statMeta = STATUS[task.status] || STATUS.pending
 const done   = subtasks.filter(s => s.status === 'done').length
 const total   = subtasks.length
 const progress = total > 0 ? Math.round(done / total * 100) : (task.status === 'done' ? 100 : 0)
 // Only show overdue for tasks that are actually in progress, not pending/upcoming ones
 const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status === 'in_progress'
 const priMeta  = PRIORITY[task.priority] || PRIORITY.normal

 return (
  <div className={`bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] mb-2 transition-shadow overflow-hidden ${
   task.status === 'blocked' ? 'ring-1 ring-red-200' : ''
  }`}>
   {/* שורה ראשית */}
   <div className="flex items-center gap-2.5 px-3 py-2.5 group flex-wrap">
    {/* עיגול סטטוס */}
    <button onClick={() => onStatusChange(task.id, task.status === 'done' ? 'pending' : 'done')}
     className="shrink-0 transition">
     {task.status === 'done'
      ? <CheckCircle2 size={17} className="text-emerald-500" strokeWidth={1.8} />
      : task.status === 'in_progress'
       ? <Clock size={17} className="text-[#091426]" strokeWidth={1.8} />
       : task.status === 'blocked'
        ? <AlertCircle size={17} className="text-red-500" strokeWidth={1.8} />
        : <Circle size={17} className="text-[#6B7A90] hover:text-[#091426] transition" strokeWidth={1.8} />
     }
    </button>

    {/* שם */}
    <button className="flex-1 text-left min-w-0" onClick={() => onSelect(task)}>
     <span className={`text-sm truncate block ${
      task.status === 'done' ? 'line-through text-[#6B7A90]' : 'text-[#091426] hover:text-[#091426]'
     }`}>{task.name}</span>
    </button>

    {/* Resource indicator */}
    {hasResource && (
     <span className="text-[10px] font-bold text-[#091426] bg-[#F3F3F3] px-1.5 py-0.5 rounded-full shrink-0" title="Has template/resource">📎</span>
    )}

    {/* Signature indicator */}
    {/sign|approv|חתימ|אישור/i.test(task.name) && task.status !== 'done' && (
     <span className="text-[10px] font-bold text-[#7B5800] bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">✍️</span>
    )}

    {/* עדיפות */}
    {task.priority && task.priority !== 'normal' && (
     <span className={`text-xs shrink-0 font-bold ${priMeta.color}`}>{priMeta.icon}</span>
    )}

    {/* תאריכים */}
    {(task.start_date || task.due_date) && (
     <span className={`text-[11px] flex items-center gap-1 shrink-0 ${isOverdue ? 'text-red-500 font-medium' : 'text-[#6B7A90]'}`}>
      <Calendar size={10} strokeWidth={1.8} />
      {task.start_date && fmtDate(task.start_date)}
      {task.start_date && task.due_date && ' – '}
      {task.due_date && fmtDate(task.due_date)}
     </span>
    )}

    {/* אחראי */}
    {task.assigned_to && (
     <span className="text-[11px] text-[#6B7A90] flex items-center gap-1 shrink-0 max-w-[70px] truncate">
      <User size={10} strokeWidth={1.8} /> {task.assigned_to}
     </span>
    )}

    {/* סטטוס badge */}
    <select value={task.status} onChange={e => { e.stopPropagation(); onStatusChange(task.id, e.target.value) }}
     onClick={e => e.stopPropagation()}
     className={`text-[10px] px-2 py-1 rounded-full font-bold tracking-wider border-0 cursor-pointer outline-none shrink-0 ${statMeta.color}`}>
     {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>

    {/* צ'קליסט toggle */}
    {total > 0 && (
     <button onClick={() => setOpen(!open)}
      className="flex items-center gap-1 text-[11px] text-[#6B7A90] hover:text-[#091426] transition shrink-0 bg-[#F3F3F3] px-2 py-0.5 rounded-full">
      <span className={`font-semibold tabular-nums ${done === total ? 'text-emerald-500' : ''}`}>{done}/{total}</span>
      <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
     </button>
    )}

    {/* מחיקה */}
    <button onClick={() => onDelete(task.id)}
     className="shrink-0 text-[#6B7A90] hover:text-red-500 p-1 rounded hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
     <Trash2 size={12} strokeWidth={1.8} />
    </button>
   </div>

   {/* Progress bar */}
   {total > 0 && (
    <div className="h-0.5 bg-[#F3F3F3] mx-3 rounded-full mb-0.5">
     <div className={`h-full rounded-full transition-all duration-300 ${done === total ? 'bg-emerald-400' : 'bg-[#091426]'}`}
      style={{ width: `${progress}%` }} />
    </div>
   )}

   {/* צ'קליסט */}
   {open && total > 0 && (
    <div className="border-t border-[#F3F3F3] bg-[#F9F9F9] py-1 px-1">
     {subtasks.map(sub => (
      <div key={sub.id} className="flex items-center gap-2.5 px-4 py-1.5 rounded-lg hover:bg-white/80 transition cursor-pointer"
       onClick={() => onStatusChange(sub.id, sub.status === 'done' ? 'pending' : 'done')}>
       {sub.status === 'done'
        ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" strokeWidth={1.8} />
        : <Circle size={13} className="text-[#6B7A90] hover:text-[#091426] shrink-0 transition" strokeWidth={1.8} />
       }
       <span className={`text-xs flex-1 text-left ${sub.status === 'done' ? 'line-through text-[#6B7A90]' : 'text-[#091426]'}`}>
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
 const pStart  = project?.start_date ? new Date(project.start_date) : new Date()
 const grouped  = groupByPhase(tasks)
 const todayPct = Math.max(0, Math.min(100, (todayDay / totalDays) * 100))

 function weekLabel(i) {
  const d = new Date(pStart)
  d.setDate(d.getDate() + i * 7)
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
 }

 const rowMap = {}
 rows.forEach(r => { rowMap[r.id] = r })

 return (
  <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-x-auto">
   <div style={{ minWidth: 640 }}>
    {/* כותרת ציר זמן */}
    <div className="flex border-b border-[#F3F3F3] sticky top-0 bg-white z-10">
     <div className="w-48 shrink-0 px-4 py-2 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] bg-[#F9F9F9] border-r border-[#F3F3F3]">
      Task
     </div>
     <div className="flex-1 relative h-8 bg-[#F9F9F9] overflow-hidden">
      {Array.from({ length: weekCount }).map((_, i) => (
       <div key={i} className="absolute top-0 bottom-0 flex items-end pb-1 border-l border-[#F3F3F3]"
        style={{ left: `${(i * 7 / totalDays) * 100}%` }}>
        <span className="text-[9px] text-[#6B7A90] whitespace-nowrap ml-1">{weekLabel(i)}</span>
       </div>
      ))}
      {todayDay >= 0 && todayDay <= totalDays && (
       <div className="absolute top-0 bottom-0 flex flex-col items-center z-10" style={{ left: `${todayPct}%` }}>
        <span className="text-[9px] text-red-500 font-bold whitespace-nowrap mt-0.5">Today</span>
        <div className="flex-1 w-0.5 bg-red-400" />
       </div>
      )}
     </div>
    </div>

    {/* שורות לפי שלב */}
    {Array.from(grouped.entries()).map(([phase, phaseTasks]) => (
     <div key={phase}>
      <div className="flex border-b border-[#F3F3F3] bg-[#F9F9F9]">
       <div className="w-48 shrink-0 px-4 py-1.5 text-xs font-semibold text-[#091426] border-r border-[#F3F3F3]">{phase}</div>
       <div className="flex-1" />
      </div>
      {phaseTasks.map((task, idx) => {
       const row = rowMap[task.id]
       if (!row) return null
       const barLeft = (row.startDay / totalDays) * 100
       const barWidth = Math.max(1, ((row.endDay - row.startDay) / totalDays) * 100)
       return (
        <div key={task.id} className={`flex border-b border-[#F3F3F3] hover:bg-[#F9F9F9] transition ${idx % 2 === 1 ? 'bg-[#F9F9F9]/30' : ''}`}>
         <div className="w-48 shrink-0 px-3 py-2.5 border-r border-[#F3F3F3] cursor-pointer" onClick={() => onSelectTask(task)}>
          <p className="text-xs text-[#091426] truncate">{task.name}</p>
          {task.due_date && <p className="text-[10px] text-[#6B7A90] mt-0.5">{fmtDate(task.start_date)} – {fmtDate(task.due_date)}</p>}
         </div>
         <div className="flex-1 relative" style={{ height: 40 }}>
          {Array.from({ length: weekCount }).map((_, i) => (
           <div key={i} className="absolute top-0 bottom-0 border-l border-[#F3F3F3]"
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
    <div className="flex items-center gap-4 px-4 py-2 border-t border-[#F3F3F3] bg-[#F9F9F9] flex-wrap">
     {Object.entries(STATUS).map(([k, v]) => (
      <div key={k} className="flex items-center gap-1.5">
       <div className="w-3 h-2.5 rounded-sm" style={{ backgroundColor: v.bar }} />
       <span className="text-[11px] text-[#6B7A90]">{v.label}</span>
      </div>
     ))}
     <div className="flex items-center gap-1.5 ml-2">
      <div className="w-0.5 h-3.5 bg-red-400" />
      <span className="text-[11px] text-[#6B7A90]">Today</span>
     </div>
    </div>
   </div>
  </div>
 )
}

// ── כרטיס לקוח ──
function ClientCard({ project }) {
 const [card, setCard]      = useState(null)
 const [contacts, setContacts]  = useState([])
 const [uploading, setUploading] = useState({})
 const [saved, setSaved]     = useState(false)

 useEffect(() => { fetchCard() }, [project.id])

 async function fetchCard() {
  try {
   const [{ data: c, error: e1 }, { data: co, error: e2 }] = await Promise.all([
    supabase.from('project_client_cards').select('*').eq('project_id', project.id).maybeSingle(),
    supabase.from('project_contacts').select('*').eq('project_id', project.id).order('sort_order'),
   ])
   // אם הטבלאות לא קיימות, נציג כרטיס ריק
   if (e1?.code === '42P01' || e2?.code === '42P01') {
    setCard({})
    setContacts([])
    return
   }
   setCard(c || {})
   setContacts(co || [])
  } catch {
   setCard({})
   setContacts([])
  }
 }

 async function updateCard(field, value) {
  const updated = { ...card, [field]: value, project_id: project.id, updated_at: new Date().toISOString() }
  setCard(updated)
  const { data } = await supabase
   .from('project_client_cards')
   .upsert(updated, { onConflict: 'project_id' })
   .select().single()
  if (data) setCard(data)
 }

 async function saveAll() {
  const updated = { ...card, project_id: project.id, updated_at: new Date().toISOString() }
  const { data } = await supabase
   .from('project_client_cards')
   .upsert(updated, { onConflict: 'project_id' })
   .select().single()
  if (data) setCard(data)
  setSaved(true)
  setTimeout(() => setSaved(false), 2500)
 }

 async function addContact() {
  const { data, error } = await supabase.from('project_contacts')
   .insert({ project_id: project.id, name: 'New Contact', sort_order: contacts.length })
   .select().single()
  if (data) setContacts(prev => [...prev, data])
  if (error) alert('Error — make sure you ran the Migration in Supabase')
 }

 async function updateContact(id, field, value) {
  await supabase.from('project_contacts').update({ [field]: value }).eq('id', id)
  setContacts(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
 }

 async function deleteContact(id) {
  await supabase.from('project_contacts').delete().eq('id', id)
  setContacts(prev => prev.filter(c => c.id !== id))
 }

 async function uploadContactPhoto(contactId, file) {
  if (!file) return
  setUploading(prev => ({ ...prev, [contactId]: true }))
  const ext = file.name.split('.').pop()
  const path = `id-photos/${project.id}-${contactId}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
  if (!error) {
   const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
   await updateContact(contactId, 'id_photo_url', publicUrl)
  }
  setUploading(prev => ({ ...prev, [contactId]: false }))
 }

 const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
 const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

 if (card === null) return <div className="text-[#6B7A90] text-sm p-8">Loading...</div>

 return (
  <div className="space-y-4 pb-6">

   {/* ── סרגל שמירה ── */}
   <div className="flex items-center justify-between bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] px-5 py-3 sticky top-0 z-10">
    <span className="text-sm text-[#6B7A90]">Client Card — {project.name}</span>
    <button onClick={saveAll}
     className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
      saved
       ? 'bg-emerald-50 text-emerald-600'
       : 'bg-[#091426] text-white hover:bg-[#1E293B]'
     }`}>
     {saved ? '✓ Saved' : 'Save'}
    </button>
   </div>

   {/* ── אנשי קשר ── */}
   <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
    <div className="flex items-center justify-between mb-4">
     <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight flex items-center gap-2">
      <Users size={16} className="text-[#6B7A90]" strokeWidth={1.8} /> Contacts
     </h3>
     <button onClick={addContact}
      className="text-xs bg-[#F3F3F3] text-[#091426] px-3 py-1.5 rounded-xl hover:bg-[#F9F9F9] transition-all font-medium flex items-center gap-1">
      <Plus size={12} strokeWidth={1.8} /> Add
     </button>
    </div>

    {contacts.length === 0 && (
     <p className="text-sm text-[#6B7A90] text-center py-4">Click "+ Add" to add a contact</p>
    )}
    <div className="space-y-3">
     {contacts.map(ct => (
      <div key={ct.id} className="bg-[#F3F3F3] rounded-2xl p-4 relative group">
       <button onClick={() => deleteContact(ct.id)}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-red-500 p-1 rounded">
        <Trash2 size={12} strokeWidth={1.8} />
       </button>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* שם */}
        <div>
         <label className={lbl}>Name</label>
         <input defaultValue={ct.name}
          onBlur={e => updateContact(ct.id, 'name', e.target.value)}
          className={inp} />
        </div>
        {/* תפקיד */}
        <div>
         <label className={lbl}>Role</label>
         <input defaultValue={ct.role}
          onBlur={e => updateContact(ct.id, 'role', e.target.value)}
          placeholder="Homeowner, Spouse..."
          className={inp} />
        </div>
        {/* טלפון */}
        <div>
         <label className={lbl}>Phone</label>
         <input defaultValue={ct.phone}
          onBlur={e => updateContact(ct.id, 'phone', e.target.value)}
          placeholder="050-0000000" className={inp} />
        </div>
        {/* מייל */}
        <div>
         <label className={lbl}>Email</label>
         <input defaultValue={ct.email}
          onBlur={e => updateContact(ct.id, 'email', e.target.value)}
          placeholder="email@example.com" className={inp} />
        </div>
        {/* ת"ז / דרכון */}
        <div>
         <label className={lbl}>ID / Passport</label>
         <input defaultValue={ct.id_number || ''}
          onBlur={e => updateContact(ct.id, 'id_number', e.target.value)}
          placeholder="000000000" className={inp} />
        </div>
        {/* צילום ת"ז */}
        <div>
         <label className={lbl}>ID / Passport Photo</label>
         <div className="flex gap-2">
          <input type="file" accept="image/*,application/pdf"
           onChange={e => uploadContactPhoto(ct.id, e.target.files?.[0])}
           className="hidden" id={`id-photo-ct-${ct.id}`} />
          <label htmlFor={`id-photo-ct-${ct.id}`}
           className="flex-1 border border-dashed border-[#6B7A90] rounded-xl px-3 py-2 text-xs text-[#6B7A90] cursor-pointer hover:border-[#091426] hover:text-[#091426] transition text-center">
           {uploading[ct.id] ? 'Uploading...' : ct.id_photo_url ? '✓ Exists — Replace' : '+ Upload'}
          </label>
          {ct.id_photo_url && (
           <a href={ct.id_photo_url} target="_blank" rel="noopener noreferrer"
            className="px-2.5 bg-[#F3F3F3] rounded-xl text-[#6B7A90] hover:text-[#091426] transition flex items-center">
            <ExternalLink size={13} strokeWidth={1.8} />
           </a>
          )}
         </div>
        </div>
       </div>
      </div>
     ))}
    </div>
   </div>

   {/* ── פרטי הנכס ── */}
   <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
    <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight mb-4 flex items-center gap-2">
     <MapPin size={16} className="text-[#6B7A90]" strokeWidth={1.8} /> Property Details
    </h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
     <div className="col-span-1 sm:col-span-2">
      <label className={lbl}>Address</label>
      <input key={`addr-${card.id}`} defaultValue={card.address || ''}
       onBlur={e => updateCard('address', e.target.value)}
       placeholder="Street, Number, City" className={inp} />
     </div>
     <div>
      <label className={lbl}>Parking Number</label>
      <input key={`park-${card.id}`} defaultValue={card.parking_number || ''}
       onBlur={e => updateCard('parking_number', e.target.value)}
       placeholder="12" className={inp} />
     </div>
     <div>
      <label className={lbl}>Building Code</label>
      <input key={`bldg-${card.id}`} defaultValue={card.building_code || ''}
       onBlur={e => updateCard('building_code', e.target.value)}
       placeholder="#1234" className={inp} />
     </div>
     <div className="col-span-1 sm:col-span-2">
      <label className={lbl}>Project Deadline</label>
      <input type="date" key={`dl-${card.id}`} defaultValue={card.deadline || ''}
       onBlur={e => updateCard('deadline', e.target.value || null)}
       className={inp} />
     </div>
    </div>
   </div>

   {/* ── קישורים ── */}
   <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
    <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight mb-4 flex items-center gap-2">
     <Link2 size={16} className="text-[#6B7A90]" strokeWidth={1.8} /> Links
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
         className="px-3 py-2.5 bg-[#F3F3F3] rounded-xl text-[#6B7A90] hover:text-[#091426] transition flex items-center">
         <ExternalLink size={14} strokeWidth={1.8} />
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
         className="px-3 py-2.5 bg-[#F3F3F3] rounded-xl text-[#6B7A90] hover:text-[#091426] transition flex items-center">
         <ExternalLink size={14} strokeWidth={1.8} />
        </a>
       )}
      </div>
     </div>
    </div>
   </div>

   {/* ── הערות ── */}
   <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
    <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight mb-4 flex items-center gap-2">
     <MessageSquare size={16} className="text-[#6B7A90]" strokeWidth={1.8} /> Important Notes from Proposal
    </h3>
    <textarea key={`notes-${card.id}`} defaultValue={card.important_notes || ''}
     onBlur={e => updateCard('important_notes', e.target.value)}
     rows={4}
     placeholder="Highlights, preferences, critical things to remember..."
     className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 resize-none" />
   </div>

  </div>
 )
}

// ── פרטי פרויקט ──
function ProjectDetail({ project, clients, onBack }) {
 const [tasks, setTasks]         = useState([])
 const [loading, setLoading]       = useState(true)
 const [view, setView]          = useState('tasks')
 const [phaseExpanded, setPhaseExpanded] = useState({})
 const [selectedTask, setSelectedTask]  = useState(null)
 const [showNewTask, setShowNewTask]   = useState(false)
 const [taskForm, setTaskForm]      = useState({ name: '', due_date: '', assigned_to: '', priority: 'normal', phase_name: '' })
 const [projectStatus, setProjectStatus] = useState(project.status)
 const [knowledgeItems, setKnowledgeItems] = useState([])

 useEffect(() => { fetchTasks(); fetchKnowledge() }, [project.id])

 async function fetchKnowledge() {
  const { data } = await supabase.from('knowledge').select('related_task').not('related_task', 'is', null)
  setKnowledgeItems((data || []).map(k => k.related_task).filter(Boolean))
 }

 function taskHasResource(taskName) {
  // Direct match — task name matches related_task
  const directMatch = knowledgeItems.some(rt =>
   taskName.toLowerCase().includes(rt.toLowerCase().split(' ').slice(0, 3).join(' ')) ||
   rt.toLowerCase().includes(taskName.toLowerCase().split(' ').slice(0, 3).join(' '))
  )
  if (directMatch) return true
  // Check if any subtask of this task matches a knowledge item
  const subs = tasks.filter(t => t.parent_task_id && tasks.find(p => p.id === t.parent_task_id)?.name === taskName)
  return subs.some(sub => knowledgeItems.some(rt =>
   sub.name.toLowerCase().includes(rt.toLowerCase().split(' ').slice(0, 3).join(' ')) ||
   rt.toLowerCase().includes(sub.name.toLowerCase().split(' ').slice(0, 3).join(' '))
  ))
 }

 async function fetchTasks() {
  const { data } = await supabase
   .from('tasks').select('*').eq('project_id', project.id)
   .order('sort_order').order('created_at')
  setTasks(data || [])
  setLoading(false)
  const phases = {}
  ;(data || []).filter(t => t.level !== 'subtask').forEach(t => {
   if (t.phase_name) phases[t.phase_name] = true
  })
  setPhaseExpanded(phases)
 }

 async function updateTaskStatus(taskId, newStatus) {
  await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
  setTasks(updatedTasks)
  if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, status: newStatus }))

  // בדיקה אם כל המשימות בשלב הושלמו
  if (newStatus === 'done') {
   const task = updatedTasks.find(t => t.id === taskId)
   if (task?.phase_name) {
    const phaseTasks = updatedTasks.filter(t => t.phase_name === task.phase_name && t.level !== 'subtask')
    const allDone = phaseTasks.every(t => t.status === 'done')
    if (allDone && phaseTasks.length > 0) {
     console.log(`[Phase Complete] All ${phaseTasks.length} tasks in "${task.phase_name}" are done.`)
     await supabase.from('task_logs').insert({
      task_id: taskId,
      note: `Phase "${task.phase_name}" completed — all ${phaseTasks.length} tasks done`,
     })
     // העברת אבן דרך גבייה מ-future ל-current
     const { data: matchingPayments } = await supabase
      .from('payments')
      .select('id, name, status')
      .eq('project_id', project.id)
      .eq('status', 'pending')
     if (matchingPayments) {
      const match = matchingPayments.find(p =>
       p.name.toLowerCase().includes(task.phase_name.toLowerCase()) ||
       task.phase_name.toLowerCase().includes(p.name.toLowerCase())
      )
      if (match) {
       await supabase.from('payments').update({ status: 'sent', due_date: new Date().toISOString().split('T')[0] }).eq('id', match.id)
       console.log(`[Billing] Milestone "${match.name}" moved to current`)
      }
     }
    }
   }
  }
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

 const mainTasks = tasks.filter(t => t.level !== 'subtask')
 const doneTasks = mainTasks.filter(t => t.status === 'done').length
 const progress  = mainTasks.length ? Math.round(doneTasks / mainTasks.length * 100) : 0
 const grouped  = groupByPhase(tasks)
 const client   = clients.find(c => c.id === project.client_id)

 if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

 return (
  <div className="relative">
   {/* breadcrumb */}
   <div className="flex items-center gap-2 mb-5 flex-wrap gap-y-2">
    <button onClick={onBack} className="text-[#6B7A90] hover:text-[#091426] transition text-sm">Projects</button>
    <ChevronRight size={14} className="text-[#6B7A90]" />
    <span className="text-[#091426] font-semibold text-sm">{project.name}</span>

    <select value={projectStatus} onChange={e => updateProjectStatus(e.target.value)}
     className={`text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer focus:outline-none ml-1 ${PROJECT_STATUS[projectStatus]?.chip}`}>
     {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
    </select>

    <div className="ml-auto flex items-center gap-2 flex-wrap gap-y-2">
     {client && <span className="text-xs text-[#6B7A90] flex items-center gap-1"><User size={11} strokeWidth={1.8} /> {client.name}</span>}
     {project.start_date && (
      <span className="text-xs text-[#6B7A90] flex items-center gap-1">
       <Calendar size={11} strokeWidth={1.8} /> {fmtDate(project.start_date)}
      </span>
     )}

     {/* toggle תצוגה */}
     <div className="flex bg-[#F3F3F3] rounded-xl p-0.5 flex-wrap">
      <button onClick={() => setView('tasks')}
       className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
        view === 'tasks' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90] hover:text-[#091426]'}`}>
       <LayoutList size={13} strokeWidth={1.8} /> Tasks
      </button>
      <button onClick={() => setView('gantt')}
       className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
        view === 'gantt' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90] hover:text-[#091426]'}`}>
       <BarChart2 size={13} strokeWidth={1.8} /> Gantt
      </button>
      <button onClick={() => setView('client')}
       className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
        view === 'client' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90] hover:text-[#091426]'}`}>
       <ContactRound size={13} strokeWidth={1.8} /> Client Card
      </button>
     </div>

     <button onClick={() => setShowNewTask(true)}
      className="bg-[#091426] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#1E293B] transition-all flex items-center gap-1">
      <Plus size={13} strokeWidth={1.8} /> Task
     </button>
    </div>
   </div>

   {/* KPI strip */}
   <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
    {[
     { label: 'Tasks', value: mainTasks.length,                     color: 'text-[#091426]' },
     { label: 'Completed', value: doneTasks,                         color: 'text-emerald-600' },
     { label: 'In Progress', value: mainTasks.filter(t => t.status === 'in_progress').length, color: 'text-[#091426]' },
     { label: 'Blocked', value: mainTasks.filter(t => t.status === 'blocked').length,   color: 'text-red-500' },
    ].map(kpi => (
     <div key={kpi.label} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-3 text-center">
      <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
      <div className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">{kpi.label}</div>
     </div>
    ))}
   </div>

   {/* Progress bar */}
   {mainTasks.length > 0 && (
    <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] px-5 py-3 mb-4 flex items-center gap-4">
     <span className="text-sm font-medium text-[#091426] shrink-0">Progress</span>
     <div className="flex-1 bg-[#F3F3F3] rounded-full h-2">
      <div className="bg-[#091426] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
     </div>
     <span className="text-sm font-bold text-[#091426] shrink-0 w-10 text-right">{progress}%</span>
    </div>
   )}

   {/* Empty state */}
   {mainTasks.length === 0 && (
    <div className="flex flex-col items-center justify-center py-20 text-center">
     <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center text-3xl mb-4">📋</div>
     <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">No tasks yet</h3>
     <p className="text-sm text-[#6B7A90] mb-5">Approve a client proposal — tasks will be created automatically</p>
     <button onClick={() => setShowNewTask(true)} className="bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
      + Manual Task
     </button>
    </div>
   )}

   {/* ── תצוגת משימות ── */}
   {view === 'tasks' && mainTasks.length > 0 && (
    <div className="space-y-3">
     {(() => {
      const phaseEntries = Array.from(grouped.entries())
      // Determine phase statuses
      const phaseStatuses = phaseEntries.map(([phase, phaseTasks]) => {
       const done = phaseTasks.filter(t => t.status === 'done').length
       const total = phaseTasks.length
       if (done === total && total > 0) return 'completed'
       if (phaseTasks.some(t => t.status === 'in_progress' || t.status === 'done')) return 'active'
       return 'locked'
      })
      // Find first active phase
      const firstActiveIdx = phaseStatuses.indexOf('active')

      return phaseEntries.map(([phase, phaseTasks], idx) => {
       const phaseDone = phaseTasks.filter(t => t.status === 'done').length
       const phaseProgress = phaseTasks.length ? Math.round(phaseDone / phaseTasks.length * 100) : 0
       const phaseStatus = phaseStatuses[idx]
       const isCurrentPhase = idx === firstActiveIdx
       // Auto-expand current phase, collapse completed, collapse locked
       const defaultOpen = isCurrentPhase || phaseStatus === 'active'
       const isOpen = phaseExpanded[phase] !== undefined ? phaseExpanded[phase] : defaultOpen

       return (
        <div key={phase} className={`bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden ${
         isCurrentPhase ? 'ring-2 ring-[#7B5800]/30' : ''
        }`}>
         {/* כותרת שלב */}
         <button onClick={() => setPhaseExpanded(p => ({ ...p, [phase]: !isOpen }))}
          className={`w-full flex items-center gap-3 px-4 py-3 transition border-b border-[#F3F3F3] ${
           phaseStatus === 'completed' ? 'bg-emerald-50/50' : isCurrentPhase ? 'bg-[#F9F9F9]' : 'bg-[#F9F9F9] hover:bg-[#F3F3F3]'
          }`}>
          {/* Phase status icon */}
          {phaseStatus === 'completed'
           ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" strokeWidth={1.8} />
           : phaseStatus === 'active'
            ? <Clock size={16} className="text-[#7B5800] shrink-0" strokeWidth={1.8} />
            : <Circle size={16} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
          }
          {isOpen
           ? <ChevronDown size={14} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
           : <ChevronRight size={14} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
          }
          <span className={`font-semibold text-sm flex-1 text-left ${
           phaseStatus === 'completed' ? 'text-emerald-700' : 'text-[#091426]'
          }`}>{phase}</span>
          {isCurrentPhase && (
           <span className="text-[10px] font-bold tracking-wider text-[#7B5800] bg-amber-50 px-2 py-0.5 rounded-full">CURRENT</span>
          )}
          {phaseStatus === 'locked' && (
           <span className="text-[10px] font-bold tracking-wider text-[#6B7A90] bg-[#F3F3F3] px-2 py-0.5 rounded-full">UPCOMING</span>
          )}
          <span className="text-xs text-[#6B7A90] tabular-nums">{phaseDone}/{phaseTasks.length}</span>
          <div className="w-20 bg-[#F3F3F3] rounded-full h-1.5 shrink-0">
           <div className={`h-1.5 rounded-full transition-all ${phaseProgress === 100 ? 'bg-emerald-400' : isCurrentPhase ? 'bg-[#7B5800]' : 'bg-[#091426]'}`}
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
             hasResource={taskHasResource(task.name)}
             onSelect={setSelectedTask}
             onStatusChange={updateTaskStatus}
             onDelete={deleteTask}
            />
           ))}
          </div>
         )}
        </div>
       )
      })
     })()}
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
    <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
       <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">New Task</h2>
       <button onClick={() => setShowNewTask(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]"><X size={16} strokeWidth={1.8} /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
       <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Task Name *</label>
        <input value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })}
         autoFocus onKeyDown={e => e.key === 'Enter' && addTask()}
         className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
       </div>
       <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Phase</label>
        <input value={taskForm.phase_name} onChange={e => setTaskForm({ ...taskForm, phase_name: e.target.value })}
         placeholder="e.g.: Initial Planning"
         list="phase-list"
         className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
        <datalist id="phase-list">
         {Array.from(grouped.keys()).map(p => <option key={p} value={p} />)}
        </datalist>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
         <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Due Date</label>
         <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })}
          className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
        </div>
        <div>
         <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Priority</label>
         <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
          className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
         </select>
        </div>
       </div>
      </div>
      <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
       <button onClick={addTask} className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">Add</button>
       <button onClick={() => setShowNewTask(false)} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
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
 const [clients, setClients]  = useState([])
 const [loading, setLoading]  = useState(true)
 const [selected, setSelected] = useState(null)
 const [showNew, setShowNew]  = useState(false)
 const [form, setForm]     = useState({ name: '', client_id: '', start_date: '', end_date: '' })

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
  if (!confirm('Delete this project and all its tasks?')) return
  await supabase.from('tasks').delete().eq('project_id', id)
  await supabase.from('projects').delete().eq('id', id)
  fetchAll()
 }

 if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

 if (selected) return (
  <ProjectDetail project={selected} clients={clients} onBack={() => { setSelected(null); fetchAll() }} />
 )

 return (
  <div>
   <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
    <div>
     <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Projects</h1>
     <p className="text-sm text-[#6B7A90] mt-0.5">{projects.length} projects</p>
    </div>
    <button onClick={() => setShowNew(true)}
     className="bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-2">
     <Plus size={15} strokeWidth={1.8} /> New Project
    </button>
   </div>

   {projects.length === 0 && (
    <div className="flex flex-col items-center justify-center py-20 text-center">
     <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center text-3xl mb-4">📐</div>
     <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">No projects yet</h3>
     <p className="text-sm text-[#6B7A90]">Approve a client proposal — a project will be created automatically</p>
    </div>
   )}

   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {projects.map(p => {
     const meta = PROJECT_STATUS[p.status] || PROJECT_STATUS.active
     return (
      <div key={p.id} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5 cursor-pointer hover:shadow-[0_4px_30px_rgba(9,20,38,0.08)] transition-all group relative"
       onClick={() => setSelected(p)}>
       <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-red-500 p-1 rounded-lg hover:bg-red-50">
        <Trash2 size={13} strokeWidth={1.8} />
       </button>
       <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-[#F3F3F3] flex items-center justify-center text-lg shrink-0">📐</div>
        <span className={`inline-flex items-center text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full ${meta.chip}`}>
         {meta.label}
        </span>
       </div>
       <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight mb-0.5">{p.name}</h3>
       <p className="text-sm text-[#6B7A90]">{p.clients?.name}</p>
       {p.start_date && (
        <p className="text-xs text-[#6B7A90] mt-2 flex items-center gap-1">
         <Calendar size={10} strokeWidth={1.8} /> {fmtDate(p.start_date)}
         {p.end_date && <> – {fmtDate(p.end_date)}</>}
        </p>
       )}
      </div>
     )
    })}
   </div>

   {/* Modal פרויקט חדש */}
   {showNew && (
    <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
       <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">New Project</h2>
       <button onClick={() => setShowNew(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]"><X size={16} strokeWidth={1.8} /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
       <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Project Name *</label>
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
         autoFocus onKeyDown={e => e.key === 'Enter' && create()}
         className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
       </div>
       <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Client *</label>
        <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}
         className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
         <option value="">Select client...</option>
         {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
       </div>
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
         <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Start Date</label>
         <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })}
          className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
        </div>
        <div>
         <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">End Date</label>
         <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })}
          className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
        </div>
       </div>
      </div>
      <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
       <button onClick={create} className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">Create Project</button>
       <button onClick={() => setShowNew(false)} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
      </div>
     </div>
    </div>
   )}
  </div>
 )
}
