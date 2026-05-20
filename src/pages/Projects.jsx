import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { VAT_RATE } from '../lib/config'
import {
 ChevronRight, ChevronDown, CheckCircle2, Circle, Clock, AlertCircle,
 Calendar, User, MessageSquare, Plus, X, Trash2, Send,
 LayoutList, BarChart2, Flag, Pencil,
 Users, FileText, MapPin, ExternalLink, Link2, ContactRound,
 Check, Download, CreditCard, Upload, Search,
} from 'lucide-react'
import * as XLSX from 'xlsx'

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
   if (isNaN(endDay) || endDay <= startDay) endDay = startDay + (task.estimated_days || 7)
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
function TaskPanel({ task, onClose, onUpdate, client, teamMembers = [] }) {
 const [name, setName]    = useState(task.name)
 const [editing, setEditing] = useState(false)
 const [logs, setLogs]    = useState([])
 const [newNote, setNewNote] = useState('')
 const [saving, setSaving]  = useState(false)
 const [resources, setResources] = useState([])
 const [viewingResource, setViewingResource] = useState(null)
 const [sigUrl, setSigUrl] = useState(null)
 const [signatureInfo, setSignatureInfo] = useState(null)

 useEffect(() => { fetchLogs(); fetchResources(); fetchSignature() }, [task.id])

 // שליפת חתימה קיימת
 async function fetchSignature() {
  const { data } = await supabase.from('signatures')
   .select('signer_name, signed_at, signature_data, status')
   .eq('task_id', task.id)
   .eq('status', 'signed')
   .maybeSingle()
  setSignatureInfo(data)
 }

 // רענון אוטומטי — בודק כל 5 שניות אם הסטטוס השתנה (למשל אחרי חתימה)
 useEffect(() => {
  const interval = setInterval(async () => {
   const { data } = await supabase.from('tasks').select('status').eq('id', task.id).single()
   if (data && data.status !== task.status) {
    fetchSignature()
    onUpdate()
   }
  }, 5000)
  return () => clearInterval(interval)
 }, [task.id, task.status])

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

 const [sendingEmail, setSendingEmail] = useState(false)
 const [emailSent, setEmailSent] = useState(false)
 const [showEmailPreview, setShowEmailPreview] = useState(false)
 const [emailSubject, setEmailSubject] = useState('')
 const [emailBody, setEmailBody] = useState('')
 const [emailTo, setEmailTo] = useState('')
 const [pendingSigUrl, setPendingSigUrl] = useState('')
 const [attachedFiles, setAttachedFiles] = useState([])
 const [uploadingFile, setUploadingFile] = useState(false)

 // שלב 1 — הכנת תצוגה מקדימה
 async function prepareSignature() {
  let token, exists = true
  while (exists) {
   token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 16)
   const { data } = await supabase.from('signatures').select('id').eq('token', token).maybeSingle()
   exists = !!data
  }
  const url = window.location.origin + '/sign/' + token
  setPendingSigUrl(url)
  setEmailTo(client?.email || '')
  setEmailSubject('Document for Your Approval — Yael Siso Interior Design')
  setEmailBody(`Dear ${client?.name || 'Client'},

Please review and sign the following document:

Task: ${task.name}${task.phase_name ? '\nPhase: ' + task.phase_name : ''}

If you have any questions, please don't hesitate to reach out.

Best regards,
Yael Siso | Interior Design`)
  setAttachedFiles([])
  setShowEmailPreview(true)
 }

 // העלאת קובץ — שמירה כ-base64 data URL לצירוף במייל
 async function handleFileUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return }
  setUploadingFile(true)
  const reader = new FileReader()
  reader.onload = () => {
   setAttachedFiles(prev => [...prev, { name: file.name, dataUrl: reader.result }])
   setUploadingFile(false)
  }
  reader.readAsDataURL(file)
  e.target.value = ''
 }

 // שלב 2 — שליחה בפועל
 async function confirmAndSend() {
  if (!emailTo) return

  // שמירת בקשת חתימה ב-DB
  const token = pendingSigUrl.split('/sign/')[1]
  const { error } = await supabase.from('signatures').insert({
   task_id: task.id,
   token: token,
   status: 'pending',
  })

  if (error) {
   await supabase.from('task_logs').insert({ task_id: task.id, note: '✍️ Signature link: ' + pendingSigUrl })
  } else {
   await supabase.from('task_logs').insert({ task_id: task.id, note: '✍️ Signature request created — waiting for client' })
  }

  setSigUrl(pendingSigUrl)
  fetchLogs()
  onUpdate()
  navigator.clipboard?.writeText(pendingSigUrl)

  // בניית גוף המייל כ-HTML
  const htmlBody = `
   <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
    <img src="https://yaelsiso.vercel.app/yael-logo.jpeg" alt="Yael Siso" style="height: 40px; margin-bottom: 16px;">
    <h2 style="color: #091426; font-size: 18px; margin-bottom: 16px;">Document Approval</h2>
    <div style="color: #333; font-size: 14px; white-space: pre-line; margin-bottom: 24px;">${emailBody}</div>
    <a href="${pendingSigUrl}" style="background: #091426; color: #fff; padding: 12px 32px; border-radius: 10px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">Review & Sign</a>
    ${attachedFiles.length > 0 ? '<p style="color: #6B7A90; font-size: 12px; margin-top: 16px;">📎 ' + attachedFiles.length + ' file(s) attached</p>' : ''}
    <p style="color: #B8960B; font-size: 11px; margin-top: 32px; letter-spacing: 2px; text-transform: uppercase;">Yael Siso — Interior Design</p>
   </div>
  `

  // הכנת קבצים מצורפים לשליחה
  const apiAttachments = attachedFiles.map(f => ({ name: f.name, dataUrl: f.dataUrl }))

  setSendingEmail(true)
  try {
   const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: emailTo, subject: emailSubject, body: htmlBody, attachments: apiAttachments }),
   })
   if (res.ok) {
    setEmailSent(true)
    const filesNote = attachedFiles.length > 0 ? ` (+ ${attachedFiles.length} files)` : ''
    await supabase.from('task_logs').insert({ task_id: task.id, note: `📧 Signature email sent to ${emailTo}${filesNote}` })
    fetchLogs()
   }
  } catch (e) { /* שגיאה — הלינק כבר הועתק */ }
  setSendingEmail(false)
  setShowEmailPreview(false)
 }

 async function updateField(field, value) {
  await supabase.from('tasks').update({ [field]: value }).eq('id', task.id)
  onUpdate()
 }

 async function saveName() {
  if (!name.trim()) { setName(task.name); setEditing(false); return }
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
       <select value={task.status} onChange={async e => {
        const newStatus = e.target.value
        if (newStatus === 'blocked') {
         const reason = window.prompt('Please enter the reason for blocking this task:')
         if (!reason || !reason.trim()) { e.target.value = task.status; return }
         await supabase.from('task_logs').insert({ task_id: task.id, note: `Blocked: ${reason.trim()}` })
         await updateField('status', newStatus)
        } else {
         await updateField('status', newStatus)
        }
       }}
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
       <select value={task.assigned_to || ''} onChange={e => updateField('assigned_to', e.target.value || null)}
        className="text-xs bg-[#F3F3F3] rounded-xl px-3 py-1.5 border-0 cursor-pointer outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-[#091426] flex-1">
        <option value="">Unassigned</option>
        {teamMembers.map(name => <option key={name} value={name}>{name}</option>)}
       </select>
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

     {/* Signature — זמין לכל משימה */}
     {(
      <div className="px-5 py-4 border-b border-[#F3F3F3]">
       <h4 className="text-[10px] font-semibold tracking-widest uppercase text-[#7B5800] mb-2 flex items-center gap-1.5">
        ✍️ Digital Signature
       </h4>
       {task.status === 'done' ? (
        <div className="space-y-2">
         <div className="bg-emerald-50 rounded-xl px-3 py-2 text-xs text-emerald-700 font-medium">✓ Signed & Completed</div>
         {signatureInfo && (
          <div className="bg-[#F9F9F9] rounded-xl p-3 border border-[#F3F3F3]">
           <p className="text-[10px] text-[#6B7A90] mb-1">Signed by: <span className="font-semibold text-[#091426]">{signatureInfo.signer_name}</span></p>
           {signatureInfo.signed_at && <p className="text-[10px] text-[#6B7A90] mb-2">Date: {new Date(signatureInfo.signed_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
           {signatureInfo.signature_data && (
            <div className="bg-white rounded-lg border border-[#F3F3F3] p-2">
             <img src={signatureInfo.signature_data} alt="Client signature" className="max-h-20 mx-auto" />
            </div>
           )}
          </div>
         )}
        </div>
       ) : (
        <button onClick={prepareSignature}
         className="bg-gradient-to-r from-[#7B5800] to-[#B8960B] text-white px-4 py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-all w-full">
         Send for Signature
        </button>
       )}
       {emailSent && (
        <p className="text-[10px] text-emerald-600 mt-2 font-medium">📧 Email sent to {client?.email}</p>
       )}
       {sigUrl && (
        <p className="text-[10px] text-[#6B7A90] mt-2 break-all">Link: {sigUrl}</p>
       )}

       {/* מודאל תצוגה מקדימה */}
       {showEmailPreview && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowEmailPreview(false)}>
         <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-[#F3F3F3] flex items-center justify-between">
           <h3 className="text-sm font-bold text-[#091426] font-[Manrope]">Email Preview</h3>
           <button onClick={() => setShowEmailPreview(false)} className="text-[#6B7A90] hover:text-[#091426] transition">✕</button>
          </div>
          <div className="px-6 py-4 space-y-3">
           <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1">To</label>
            <input value={emailTo} onChange={e => setEmailTo(e.target.value)}
             className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
           </div>
           <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1">Subject</label>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
             className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
           </div>
           <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1">Message</label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={6}
             className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 resize-none" />
           </div>

           {/* קבצים מצורפים */}
           <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1">Attachments</label>
            {attachedFiles.map((f, i) => (
             <div key={i} className="flex items-center gap-2 bg-[#F3F3F3] rounded-lg px-3 py-1.5 mb-1.5 text-xs">
              <span className="flex-1 truncate">📎 {f.name}</span>
              <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
               className="text-red-400 hover:text-red-600 text-xs">✕</button>
             </div>
            ))}
            <label className={`inline-flex items-center gap-1.5 text-xs text-[#7B5800] font-medium cursor-pointer hover:underline ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
             {uploadingFile ? 'Uploading...' : '+ Add File'}
             <input type="file" className="hidden" onChange={handleFileUpload} />
            </label>
           </div>

           {/* תצוגה מקדימה של הלינק */}
           <div className="bg-[#F9F9F9] rounded-xl p-3 border border-[#F3F3F3]">
            <p className="text-[10px] text-[#6B7A90] mb-1">The email will include a signing button:</p>
            <div className="bg-[#091426] text-white text-xs text-center py-2 px-4 rounded-lg inline-block font-medium">Review & Sign</div>
           </div>
          </div>
          <div className="px-6 py-4 border-t border-[#F3F3F3] flex gap-2">
           <button onClick={() => setShowEmailPreview(false)}
            className="flex-1 bg-[#F3F3F3] text-[#091426] py-2.5 rounded-xl text-sm font-medium hover:bg-[#E8E8E8] transition">
            Cancel
           </button>
           <button onClick={confirmAndSend} disabled={sendingEmail || !emailTo}
            className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition disabled:opacity-50">
            {sendingEmail ? 'Sending...' : 'Send Email'}
           </button>
          </div>
         </div>
        </div>
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
    <select value={task.status} onChange={e => {
     e.stopPropagation()
     const newStatus = e.target.value
     if (newStatus === 'blocked') {
      const reason = window.prompt('Please enter the reason for blocking this task:')
      if (!reason || !reason.trim()) { e.target.value = task.status; return }
      onStatusChange(task.id, newStatus, reason.trim())
     } else {
      onStatusChange(task.id, newStatus)
     }
    }}
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
 const pStart = project?.start_date ? new Date(project.start_date) : new Date()
 const grouped = groupByPhase(tasks)
 const todayPct = Math.max(0, Math.min(100, (todayDay / totalDays) * 100))

 // דדליין — קו אדום בגאנט
 let deadlineDay = null, deadlinePct = null
 if (project?.end_date) {
  const dEnd = new Date(project.end_date); dEnd.setHours(0, 0, 0, 0)
  deadlineDay = Math.round((dEnd - pStart) / 86400000)
  deadlinePct = Math.max(0, Math.min(100, (deadlineDay / totalDays) * 100))
 }

 // חישוב חודשים לציר זמן — קריא יותר משבועות
 const months = []
 const mStart = new Date(pStart)
 mStart.setDate(1)
 while (true) {
  const dayOffset = Math.round((mStart - pStart) / 86400000)
  if (dayOffset > totalDays + 30) break
  months.push({ label: mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }), offset: dayOffset })
  mStart.setMonth(mStart.getMonth() + 1)
 }

 const rowMap = {}
 rows.forEach(r => { rowMap[r.id] = r })

 // רוחב מינימלי לפי מספר ימים — כל יום לפחות 4px
 const chartMinWidth = Math.max(800, totalDays * 4)

 return (
  <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-x-auto -mx-4 md:-mx-8">
   <div style={{ minWidth: chartMinWidth }}>
    {/* כותרת ציר זמן — חודשים */}
    <div className="flex border-b border-[#F3F3F3] sticky top-0 bg-white z-10">
     <div className="w-56 shrink-0 px-4 py-2.5 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] bg-[#F9F9F9] border-r border-[#F3F3F3]">
      Task
     </div>
     <div className="flex-1 relative h-9 bg-[#F9F9F9]">
      {months.map((m, i) => {
       const leftPct = Math.max(0, (m.offset / totalDays) * 100)
       if (leftPct > 100) return null
       return (
        <div key={i} className="absolute top-0 bottom-0 flex items-center border-l border-[#6B7A90]/20"
         style={{ left: `${leftPct}%` }}>
         <span className="text-[11px] font-semibold text-[#091426] whitespace-nowrap ml-2">{m.label}</span>
        </div>
       )
      })}
      {todayDay >= 0 && todayDay <= totalDays && (
       <div className="absolute top-0 bottom-0 flex flex-col items-center z-10" style={{ left: `${todayPct}%` }}>
        <span className="text-[10px] text-red-500 font-bold whitespace-nowrap bg-red-50 px-1.5 py-0.5 rounded-b-md">Today</span>
       </div>
      )}
      {deadlinePct != null && deadlineDay <= totalDays + 10 && (
       <div className="absolute top-0 bottom-0 flex flex-col items-center z-10" style={{ left: `${deadlinePct}%` }}>
        <span className="text-[10px] text-orange-600 font-bold whitespace-nowrap bg-orange-50 px-1.5 py-0.5 rounded-b-md">Deadline</span>
       </div>
      )}
     </div>
    </div>

    {/* שורות לפי שלב */}
    {Array.from(grouped.entries()).map(([phase, phaseTasks]) => {
     // חישוב התקדמות שלב
     const phaseDone = phaseTasks.filter(t => t.status === 'done').length
     const phaseProgress = phaseTasks.length ? Math.round(phaseDone / phaseTasks.length * 100) : 0
     return (
      <div key={phase}>
       <div className="flex border-b border-[#F3F3F3] bg-[#091426]/[0.03]">
        <div className="w-56 shrink-0 px-4 py-2 border-r border-[#F3F3F3] flex items-center gap-2">
         <span className="text-xs font-bold text-[#091426]">{phase}</span>
         <span className="text-[10px] text-[#6B7A90]">{phaseProgress}%</span>
        </div>
        <div className="flex-1 relative" style={{ height: 28 }}>
         {/* בלוק שלב — מתחילת המשימה הראשונה עד סוף האחרונה */}
         {(() => {
          const phaseRows = phaseTasks.map(t => rowMap[t.id]).filter(Boolean)
          if (!phaseRows.length) return null
          const phaseStart = Math.min(...phaseRows.map(r => r.startDay))
          const phaseEnd = Math.max(...phaseRows.map(r => r.endDay))
          return (
           <div className="absolute top-1.5 bottom-1.5 rounded-md bg-[#091426]/10"
            style={{ left: `${(phaseStart / totalDays) * 100}%`, width: `${((phaseEnd - phaseStart) / totalDays) * 100}%` }} />
          )
         })()}
        </div>
       </div>
       {phaseTasks.map((task, idx) => {
        const row = rowMap[task.id]
        if (!row) return null
        const barLeft = (row.startDay / totalDays) * 100
        const barWidth = Math.max(0.5, ((row.endDay - row.startDay) / totalDays) * 100)
        const statusColor = STATUS[task.status]?.bar || '#94a3b8'
        return (
         <div key={task.id} className={`flex border-b border-[#F3F3F3] hover:bg-[#F9F9F9]/80 transition cursor-pointer ${idx % 2 === 1 ? 'bg-[#F9F9F9]/30' : ''}`}
          onClick={() => onSelectTask(task)}>
          <div className="w-56 shrink-0 px-3 py-2 border-r border-[#F3F3F3]">
           <p className="text-xs text-[#091426] truncate">{task.name}</p>
           <p className="text-[10px] text-[#6B7A90] mt-0.5">
            {task.start_date ? fmtDate(task.start_date) : ''}
            {task.start_date && task.due_date ? ' – ' : ''}
            {task.due_date ? fmtDate(task.due_date) : ''}
           </p>
          </div>
          <div className="flex-1 relative" style={{ height: 38 }}>
           {/* קווי חודשים */}
           {months.map((m, i) => {
            const leftPct = Math.max(0, (m.offset / totalDays) * 100)
            if (leftPct > 100) return null
            return <div key={i} className="absolute top-0 bottom-0 border-l border-[#F3F3F3]" style={{ left: `${leftPct}%` }} />
           })}
           {/* קו היום */}
           {todayDay >= 0 && todayDay <= totalDays && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/40 z-10" style={{ left: `${todayPct}%` }} />
           )}
           {/* קו דדליין */}
           {deadlinePct != null && (
            <div className="absolute top-0 bottom-0 w-0.5 bg-orange-400/60 z-10" style={{ left: `${deadlinePct}%` }} />
           )}
           {/* בלוק המשימה */}
           <div className="absolute top-2 bottom-2 rounded-md flex items-center justify-end pr-1 overflow-hidden"
            style={{
             left: `${barLeft}%`,
             width: `${barWidth}%`,
             backgroundColor: statusColor,
             opacity: task.status === 'done' ? 0.5 : 0.85,
             minWidth: 4,
            }}>
            {barWidth > 3 && (
             <span className="text-[9px] text-white font-medium truncate px-1">
              {task.status === 'done' ? '✓' : ''}
             </span>
            )}
           </div>
          </div>
         </div>
        )
       })}
      </div>
     )
    })}

    {/* מקרא */}
    <div className="flex items-center gap-5 px-4 py-2.5 border-t border-[#F3F3F3] bg-[#F9F9F9] flex-wrap">
     {Object.entries(STATUS).map(([k, v]) => (
      <div key={k} className="flex items-center gap-1.5">
       <div className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: v.bar }} />
       <span className="text-[11px] text-[#6B7A90]">{v.label}</span>
      </div>
     ))}
     <div className="flex items-center gap-1.5">
      <div className="w-0.5 h-3.5 bg-red-400" />
      <span className="text-[11px] text-[#6B7A90]">Today</span>
     </div>
     <div className="flex items-center gap-1.5">
      <div className="w-0.5 h-3.5 bg-orange-400" />
      <span className="text-[11px] text-[#6B7A90]">Deadline</span>
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
// ── תבנית ברירת מחדל לגבייה ──
const DEFAULT_BILLING_MILESTONES = [
 { name: 'Advance Payment', pct: 30 },
 { name: 'Layout Approval', pct: 20 },
 { name: 'Working Drawings', pct: 30 },
 { name: 'Project Completion', pct: 20 },
]

function fmtCurrency(n) {
 if (!n && n !== 0) return '—'
 return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

// ── רכיב תקציב פרויקט ──
function BudgetView({ project, client }) {
 const [items, setItems] = useState([])
 const [payments, setPayments] = useState([])
 const [suppliers, setSuppliers] = useState([])
 const [loading, setLoading] = useState(true)
 const [showAdd, setShowAdd] = useState(false)
 const [editItem, setEditItem] = useState(null)
 const [addForm, setAddForm] = useState({ category: '', supplier_id: '', planned_amount: '', payment_terms: '', notes: '', drive_link: '' })
 const [supplierSearch, setSupplierSearch] = useState('')
 const [showSupplierDropdown, setShowSupplierDropdown] = useState(false)
 const [showPayment, setShowPayment] = useState(null)
 const [payForm, setPayForm] = useState({ amount: '', percentage: '', mode: 'amount', payment_date: new Date().toISOString().split('T')[0], note: '' })
 const [showEmail, setShowEmail] = useState(null)
 const [emailTo, setEmailTo] = useState('')
 const [emailSubject, setEmailSubject] = useState('')
 const [emailBody, setEmailBody] = useState('')
 const [sendingEmail, setSendingEmail] = useState(false)
 const [budgetAttachedFiles, setBudgetAttachedFiles] = useState([])
 const [budgetUploadingFile, setBudgetUploadingFile] = useState(false)
 const [expandedRows, setExpandedRows] = useState(new Set())
 const [budgetDriveLink, setBudgetDriveLink] = useState(project.budget_drive_link || '')

 // מע"מ — מיובא מ-config.js

 useEffect(() => { fetchBudget() }, [project.id])

 async function fetchBudget() {
  const [{ data: bi }, { data: bp }, { data: sp }] = await Promise.all([
   supabase.from('budget_items').select('*').eq('project_id', project.id).order('sort_order'),
   supabase.from('budget_payments').select('*'),
   supabase.from('suppliers').select('id, name, bank_name, bank_branch, bank_account, account_holder'),
  ])
  setItems(bi || [])
  setPayments(bp || [])
  setSuppliers(sp || [])
  setLoading(false)
 }

 // חישוב סטטוס אוטומטי — רק תשלומים עם status=paid נספרים
 function calcStatus(item) {
  const paid = payments.filter(p => p.budget_item_id === item.id && (p.status || 'draft') === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const totalInclVat = Number(item.planned_amount) * (1 + VAT_RATE)
  if (paid >= totalInclVat) return 'paid'
  if (paid > 0) return 'partial'
  return 'pending'
 }

 // סכום ששולם — רק תשלומים עם status=paid
 function getItemPaid(item) {
  return payments.filter(p => p.budget_item_id === item.id && (p.status || 'draft') === 'paid').reduce((s, p) => s + Number(p.amount), 0)
 }

 function getItemPayments(item) {
  return payments.filter(p => p.budget_item_id === item.id).sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date))
 }

 // סיכומים — לפני מע"מ, כולל מע"מ, שולם, יתרה
 const totalBeforeVat = items.reduce((s, i) => s + Number(i.planned_amount), 0)
 const totalInclVat = totalBeforeVat * (1 + VAT_RATE)
 const totalPaid = items.reduce((s, i) => s + getItemPaid(i), 0)
 const remaining = totalInclVat - totalPaid
 const progressPct = totalInclVat > 0 ? Math.min(100, Math.round(totalPaid / totalInclVat * 100)) : 0

 // פתיחה/סגירה של שורה מורחבת
 function toggleRow(id) {
  setExpandedRows(prev => {
   const next = new Set(prev)
   next.has(id) ? next.delete(id) : next.add(id)
   return next
  })
 }

 // שינוי סטטוס ידני
 async function changeStatus(item, newStatus) {
  await supabase.from('budget_items').update({ status: newStatus }).eq('id', item.id)
  setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
 }

 // פתיחת מודאל הוספה/עריכה
 function openAddModal(item = null) {
  if (item) {
   setEditItem(item)
   setAddForm({
    category: item.category || '',
    supplier_id: item.supplier_id || '',
    planned_amount: item.planned_amount || '',
    payment_terms: item.payment_terms || '',
    notes: item.notes || '',
    drive_link: item.drive_link || '',
   })
   const sup = suppliers.find(s => s.id === item.supplier_id)
   setSupplierSearch(sup?.name || '')
  } else {
   setEditItem(null)
   setAddForm({ category: '', supplier_id: '', planned_amount: '', payment_terms: '', notes: '', drive_link: '' })
   setSupplierSearch('')
  }
  setShowAdd(true)
 }

 // שמירת פריט תקציב (הוספה או עריכה)
 async function saveItem() {
  if (!addForm.category || !addForm.planned_amount) return
  if (editItem) {
   // עריכה
   const { data, error } = await supabase.from('budget_items').update({
    category: addForm.category,
    supplier_id: addForm.supplier_id || null,
    planned_amount: Number(addForm.planned_amount),
    vat_rate: Math.round(VAT_RATE * 100),
    payment_terms: addForm.payment_terms,
    notes: addForm.notes,
    drive_link: addForm.drive_link,
   }).eq('id', editItem.id).select().single()
   if (error) { alert('Error: ' + error.message); return }
   setItems(prev => prev.map(i => i.id === editItem.id ? data : i))
  } else {
   // הוספה
   const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0
   const { data, error } = await supabase.from('budget_items').insert({
    project_id: project.id,
    category: addForm.category,
    supplier_id: addForm.supplier_id || null,
    planned_amount: Number(addForm.planned_amount),
    vat_rate: Math.round(VAT_RATE * 100),
    payment_terms: addForm.payment_terms,
    notes: addForm.notes,
    drive_link: addForm.drive_link,
    sort_order: maxSort + 1,
   }).select().single()
   if (error) { alert('Error: ' + error.message); return }
   setItems(prev => [...prev, data])
   // יצירת רשומת תשלום ספק אוטומטית אם יש ספק
   if (addForm.supplier_id) {
    try {
     const { data: supData } = await supabase.from('suppliers').select('commission_pct').eq('id', addForm.supplier_id).single()
     await supabase.from('supplier_payments').insert({
      supplier_id: addForm.supplier_id,
      project_id: project.id,
      description: addForm.category,
      amount: Number(addForm.planned_amount),
      commission_pct: supData?.commission_pct || null,
      status: 'pending',
      payment_date: null,
     })
    } catch (e) { /* שגיאה ביצירת תשלום ספק — לא חוסמת */ }
   }
  }
  setShowAdd(false)
  setEditItem(null)
  setAddForm({ category: '', supplier_id: '', planned_amount: '', payment_terms: '', notes: '', drive_link: '' })
  setSupplierSearch('')
 }

 // יצירת ספק חדש מתוך חיפוש
 async function createSupplierFromSearch() {
  if (!supplierSearch.trim()) return
  const { data, error } = await supabase.from('suppliers').insert({
   name: supplierSearch.trim(),
   updated_at: new Date().toISOString(),
  }).select().single()
  if (error) { alert('Error creating supplier: ' + error.message); return }
  setSuppliers(prev => [...prev, data])
  setAddForm(f => ({ ...f, supplier_id: data.id }))
  setShowSupplierDropdown(false)
 }

 // רישום תשלום — נשמר כ-draft (לא נספר כשולם עד שמעדכנים ל-paid)
 async function recordPayment() {
  if (!payForm.amount) return
  const { data, error } = await supabase.from('budget_payments').insert({
   budget_item_id: showPayment.id,
   amount: Number(payForm.amount),
   payment_date: payForm.payment_date,
   note: payForm.note,
   status: 'draft',
  }).select().single()
  if (error) { alert('Error: ' + error.message); return }
  setPayments(prev => [...prev, data])
  setShowPayment(null)
  setPayForm({ amount: '', percentage: '', mode: 'amount', payment_date: new Date().toISOString().split('T')[0], note: '' })
 }

 // עדכון סטטוס תשלום בודד
 async function changePaymentStatus(paymentId, itemId, newStatus) {
  await supabase.from('budget_payments').update({ status: newStatus }).eq('id', paymentId)
  setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: newStatus } : p))
  // עדכון סטטוס הפריט בהתאם
  const item = items.find(i => i.id === itemId)
  if (item) {
   const updatedPayments = payments.map(p => p.id === paymentId ? { ...p, status: newStatus } : p)
   const paidSum = updatedPayments.filter(p => p.budget_item_id === itemId && (p.status || 'draft') === 'paid').reduce((s, p) => s + Number(p.amount), 0)
   const totalWithVat = Number(item.planned_amount) * (1 + VAT_RATE)
   const itemStatus = paidSum >= totalWithVat ? 'paid' : paidSum > 0 ? 'partial' : 'pending'
   await supabase.from('budget_items').update({ status: itemStatus }).eq('id', itemId)
   setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: itemStatus } : i))
  }
 }

 // שליחת בקשת תשלום לתשלום בודד
 function openPaymentEmailModal(payment, item) {
  const supplier = suppliers.find(s => s.id === item.supplier_id)
  const totalWithVat = Number(item.planned_amount) * (1 + VAT_RATE)
  const paidSoFar = getItemPaid(item)
  const bankInfo = supplier?.bank_name ? `\n\nBank details:\nName: ${supplier.account_holder || supplier.name || '—'}\nBank: ${supplier.bank_name || '—'}\nAccount No.: ${supplier.bank_account || '—'}\nBranch No.: ${supplier.bank_branch || '—'}` : ''
  setEmailTo(client?.email || '')
  setEmailSubject(`Payment Request: ${item.category} — ${project.name}`)
  setEmailBody(`Hi ${client?.name || ''},\n\nHope that you are doing well.\n\nThis email concerns the payment for the ${item.category.toLowerCase()}.\n\nDetails of ${item.category.toLowerCase()} payment:\n• Total amount (including tax): ${fmtCurrency(Math.round(totalWithVat))}\n• Deposit already paid: ${fmtCurrency(Math.round(paidSoFar))}\n• Remaining balance: ${fmtCurrency(Number(payment.amount))}${bankInfo}\n\nTHANKS!`)
  setShowEmail({ ...item, _paymentId: payment.id })
 }

 // מחיקת תשלום בודד
 async function deletePayment(paymentId, itemId) {
  if (!confirm('Delete this payment?')) return
  await supabase.from('budget_payments').delete().eq('id', paymentId)
  setPayments(prev => prev.filter(p => p.id !== paymentId))
  // עדכון סטטוס
  const item = items.find(i => i.id === itemId)
  if (item) {
   const remainingPayments = payments.filter(p => p.budget_item_id === itemId && p.id !== paymentId && (p.status || 'draft') === 'paid')
   const newPaid = remainingPayments.reduce((s, p) => s + Number(p.amount), 0)
   const totalWithVat = Number(item.planned_amount) * (1 + VAT_RATE)
   const newStatus = newPaid >= totalWithVat ? 'paid' : newPaid > 0 ? 'partial' : 'pending'
   await supabase.from('budget_items').update({ status: newStatus }).eq('id', itemId)
   setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i))
  }
 }

 // מחיקת פריט
 async function deleteItem(item) {
  if (!confirm('Delete this budget item?')) return
  await supabase.from('budget_payments').delete().eq('budget_item_id', item.id)
  await supabase.from('budget_items').delete().eq('id', item.id)
  setItems(prev => prev.filter(i => i.id !== item.id))
  setPayments(prev => prev.filter(p => p.budget_item_id !== item.id))
 }

 // ייבוא מאקסל
 const [importing, setImporting] = useState(false)
 async function importFromExcel(e) {
  const file = e.target.files?.[0]
  if (!file) return
  setImporting(true)
  try {
   const data = await file.arrayBuffer()
   const wb = XLSX.read(data)
   const ws = wb.Sheets[wb.SheetNames[0]]
   const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
   // דילוג על שורת כותרת ושורת סיכום
   const dataRows = rows.slice(1).filter(row => {
    const subject = row[0]
    const amount = row[8]
    if (!subject || String(subject).trim() === '') return false
    if (String(subject).toLowerCase().includes('total') || String(subject).includes('סה"כ')) return false
    return typeof amount === 'number' || (amount && !isNaN(Number(amount)))
   })
   let count = 0
   let skippedNeg = 0
   let skippedDup = 0
   const seenCategories = new Set(items.map(i => i.category?.toLowerCase()))
   const maxSort = items.length > 0 ? Math.max(...items.map(i => i.sort_order || 0)) : 0
   for (let idx = 0; idx < dataRows.length; idx++) {
    const row = dataRows[idx]
    const category = String(row[0]).trim()
    const supplierName = row[1] ? String(row[1]).trim() : ''
    const planned_amount = Number(row[8])
    // דילוג על סכומים שליליים
    if (planned_amount < 0) { skippedNeg++; continue }
    // אזהרה על קטגוריות כפולות
    if (seenCategories.has(category.toLowerCase())) { skippedDup++; continue }
    seenCategories.add(category.toLowerCase())
    const notes = row[10] ? String(row[10]).trim() : ''
    // התאמת ספק קיים
    const matchedSupplier = supplierName ? suppliers.find(s => s.name.toLowerCase() === supplierName.toLowerCase()) : null
    const { data: inserted, error } = await supabase.from('budget_items').insert({
     project_id: project.id,
     category,
     supplier_id: matchedSupplier?.id || null,
     planned_amount,
     vat_rate: Math.round(VAT_RATE * 100),
     payment_terms: notes,
     notes,
     drive_link: '',
     sort_order: maxSort + idx + 1,
    }).select().single()
    if (!error && inserted) {
     setItems(prev => [...prev, inserted])
     count++
    }
   }
   const warnings = [skippedNeg > 0 && `${skippedNeg} negative`, skippedDup > 0 && `${skippedDup} duplicate`].filter(Boolean).join(', ')
   alert(`Imported ${count} budget items successfully${warnings ? ` (skipped: ${warnings})` : ''}`)
  } catch (err) {
   alert('Error importing Excel: ' + err.message)
  } finally {
   setImporting(false)
   e.target.value = ''
  }
 }

 // שליחת בקשת תשלום — הסכום הנשלח הוא היתרה לתשלום (שליחה ברמת פריט)
 function openEmailModal(item) {
  const supplier = suppliers.find(s => s.id === item.supplier_id)
  const totalWithVat = Number(item.planned_amount) * (1 + VAT_RATE)
  const paid = getItemPaid(item)
  const itemRemaining = totalWithVat - paid
  const bankInfo = supplier?.bank_name ? `\n\nBank details:\nName: ${supplier.account_holder || supplier.name || '—'}\nBank: ${supplier.bank_name || '—'}\nAccount No.: ${supplier.bank_account || '—'}\nBranch No.: ${supplier.bank_branch || '—'}` : ''
  setEmailTo(client?.email || '')
  setEmailSubject(`Payment Request: ${item.category} — ${project.name}`)
  setEmailBody(`Hi ${client?.name || ''},\n\nHope that you are doing well.\n\nThis email concerns the payment for the ${item.category.toLowerCase()}.\n\nDetails of ${item.category.toLowerCase()} payment:\n• Total amount (including tax): ${fmtCurrency(Math.round(totalWithVat))}\n• Deposit already paid: ${fmtCurrency(Math.round(paid))}\n• Remaining balance: ${fmtCurrency(Math.round(itemRemaining))}${bankInfo}\n\nTHANKS!`)
  setShowEmail(item) // ללא _paymentId — שליחה כללית
 }

 async function sendPaymentEmail() {
  if (!emailTo) return
  setSendingEmail(true)
  const htmlBody = `
   <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
    <img src="https://yaelsiso.vercel.app/yael-logo.jpeg" alt="Yael Siso" style="height: 40px; margin-bottom: 16px;">
    <h2 style="color: #091426; font-size: 18px; margin-bottom: 16px;">Payment Request</h2>
    <div style="color: #333; font-size: 14px; white-space: pre-line; margin-bottom: 24px;">${emailBody}</div>
    <p style="color: #B8960B; font-size: 11px; margin-top: 32px; letter-spacing: 2px; text-transform: uppercase;">Yael Siso — Interior Design</p>
   </div>
  `
  try {
   const apiAttachments = budgetAttachedFiles.map(f => ({ name: f.name, dataUrl: f.dataUrl }))
   const res = await fetch('/api/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: emailTo, subject: emailSubject, body: htmlBody, ...(apiAttachments.length > 0 ? { attachments: apiAttachments } : {}) }),
   })
   if (res.ok) {
    // עדכון סטטוס התשלום ל-sent
    if (showEmail._paymentId) {
     await supabase.from('budget_payments').update({ status: 'sent' }).eq('id', showEmail._paymentId)
     setPayments(prev => prev.map(p => p.id === showEmail._paymentId ? { ...p, status: 'sent' } : p))
    }
    alert('Email sent successfully!')
   } else alert('Failed to send email')
  } catch (e) { alert('Error sending email') }
  setSendingEmail(false)
  setShowEmail(null)
  setBudgetAttachedFiles([])
 }

 const statusChip = { pending: 'bg-[#F3F3F3] text-[#6B7A90]', partial: 'bg-amber-50 text-amber-700', paid: 'bg-emerald-50 text-emerald-700' }
 const statusLabel = { pending: 'Pending', partial: 'Partial', paid: 'Paid' }
 const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
 const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

 if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

 // סינון ספקים לפי חיפוש
 const filteredSuppliers = supplierSearch.trim()
  ? suppliers.filter(s => s.name.toLowerCase().includes(supplierSearch.toLowerCase()))
  : suppliers

 return (
  <div className="space-y-4">
   {/* סרגל סיכום */}
   <div className="bg-white rounded-2xl p-5 shadow-[0_2px_20px_rgba(9,20,38,0.04)]">
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-3">
     <div>
      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Total (excl. VAT)</p>
      <p className="text-lg font-bold text-[#091426] font-[Manrope]">{fmtCurrency(Math.round(totalBeforeVat))}</p>
     </div>
     <div>
      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Total (incl. VAT {Math.round(VAT_RATE * 100)}%)</p>
      <p className="text-lg font-bold text-[#091426] font-[Manrope]">{fmtCurrency(Math.round(totalInclVat))}</p>
     </div>
     <div>
      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Total Paid</p>
      <p className="text-lg font-bold text-emerald-600 font-[Manrope]">{fmtCurrency(Math.round(totalPaid))}</p>
     </div>
     <div>
      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Remaining</p>
      <p className="text-lg font-bold text-[#091426] font-[Manrope]">{fmtCurrency(Math.round(remaining))}</p>
     </div>
    </div>
    <div className="flex items-center gap-3">
     <div className="flex-1 h-2 bg-[#F3F3F3] rounded-full overflow-hidden">
      <div className="h-full bg-[#B8960B] rounded-full transition-all" style={{ width: `${progressPct}%` }} />
     </div>
     <span className="text-xs font-bold text-[#091426] font-[Manrope]">{progressPct}%</span>
    </div>
    {/* לינק כללי לתיקיית תקציב */}
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F3F3F3]">
     <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] shrink-0">Budget Folder</span>
     <input
      value={budgetDriveLink}
      onChange={e => setBudgetDriveLink(e.target.value)}
      onBlur={async () => {
       await supabase.from('projects').update({ budget_drive_link: budgetDriveLink || null }).eq('id', project.id)
      }}
      placeholder="https://drive.google.com/..."
      className="flex-1 bg-[#F3F3F3] rounded-lg px-3 py-1.5 text-xs border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-[#091426]"
     />
     {budgetDriveLink && (
      <a href={budgetDriveLink} target="_blank" rel="noopener noreferrer"
       className="text-xs text-[#7B5800] hover:text-[#B8960B] font-medium shrink-0">
       Open ↗
      </a>
     )}
    </div>
   </div>

   {/* טבלת פריטי תקציב */}
   <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
    <div className="overflow-x-auto">
     <table className="w-full text-sm">
      <thead>
       <tr className="border-b border-[#F3F3F3] text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">
        <th className="w-8 px-2 py-3"></th>
        <th className="text-left px-4 py-3">Category</th>
        <th className="text-left px-4 py-3">Supplier</th>
        <th className="text-right px-4 py-3">Before VAT</th>
        <th className="text-right px-4 py-3">Incl. VAT</th>
        <th className="text-right px-4 py-3">Paid</th>
        <th className="text-right px-4 py-3">Remaining</th>
        <th className="text-center px-4 py-3">Status</th>
        <th className="text-center px-4 py-3">Link</th>
        <th className="text-center px-4 py-3">Actions</th>
       </tr>
      </thead>
      <tbody>
       {items.map(item => {
        const supplier = suppliers.find(s => s.id === item.supplier_id)
        const status = calcStatus(item)
        const itemTotalVat = Number(item.planned_amount) * (1 + VAT_RATE)
        const itemPaid = getItemPaid(item)
        const itemRemaining = itemTotalVat - itemPaid
        const isExpanded = expandedRows.has(item.id)
        const itemPayments = getItemPayments(item)

        return (
         <>
          <tr key={item.id} className="border-b border-[#F3F3F3] hover:bg-[#F9F9F9] transition">
           <td className="px-2 py-3 text-center">
            <button onClick={() => toggleRow(item.id)} className="text-[#6B7A90] hover:text-[#091426] transition p-0.5">
             {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
           </td>
           <td className="px-4 py-3 font-medium text-[#091426]">{item.category}</td>
           <td className="px-4 py-3 text-[#6B7A90]">{supplier?.name || '—'}</td>
           <td className="px-4 py-3 text-right text-[#091426]">{fmtCurrency(Number(item.planned_amount))}</td>
           <td className="px-4 py-3 text-right font-medium text-[#091426]">{fmtCurrency(Math.round(itemTotalVat))}</td>
           <td className="px-4 py-3 text-right text-emerald-600">{fmtCurrency(Math.round(itemPaid))}</td>
           <td className="px-4 py-3 text-right text-[#091426]">{fmtCurrency(Math.round(itemRemaining))}</td>
           <td className="px-4 py-3 text-center">
            <span className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full ${statusChip[status]}`}>
             {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending'}
            </span>
           </td>
           <td className="px-4 py-3 text-center">
            {item.drive_link ? (
             <a href={item.drive_link} target="_blank" rel="noopener noreferrer" className="text-[#6B7A90] hover:text-[#091426] transition">
              <ExternalLink size={14} strokeWidth={1.8} />
             </a>
            ) : <span className="text-[#6B7A90]">—</span>}
           </td>
           <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-1">
             <button onClick={() => openAddModal(item)}
              className="p-1.5 rounded-lg text-[#6B7A90] hover:text-[#091426] hover:bg-[#F3F3F3] transition" title="Edit">
              <Pencil size={13} strokeWidth={1.8} />
             </button>
             <button onClick={() => { setShowPayment(item); setPayForm({ amount: '', percentage: '', mode: 'amount', payment_date: new Date().toISOString().split('T')[0], note: '' }) }}
              className="p-1.5 rounded-lg text-[#6B7A90] hover:text-emerald-600 hover:bg-emerald-50 transition" title="Add Payment">
              <CreditCard size={13} strokeWidth={1.8} />
             </button>
             <button onClick={() => openEmailModal(item)}
              className="p-1.5 rounded-lg text-[#6B7A90] hover:text-[#B8960B] hover:bg-amber-50 transition" title="Send to Client">
              <Send size={13} strokeWidth={1.8} />
             </button>
             <button onClick={() => deleteItem(item)}
              className="p-1.5 rounded-lg text-[#6B7A90] hover:text-red-500 hover:bg-red-50 transition" title="Delete">
              <Trash2 size={13} strokeWidth={1.8} />
             </button>
            </div>
           </td>
          </tr>
          {/* שורה מורחבת — היסטוריית תשלומים */}
          {isExpanded && (
           <tr key={`${item.id}-expanded`} className="bg-[#F9F9F9]">
            <td colSpan={10} className="px-6 py-3">
             {itemPayments.length > 0 ? (
              <div className="space-y-2">
               <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-2">Payment History</p>
               {itemPayments.filter(p => Number(p.amount) > 0 || p.note).map(p => {
               const pStatus = p.status || 'draft'
               const pStatusChip = { draft: 'bg-[#F3F3F3] text-[#6B7A90]', sent: 'bg-amber-50 text-amber-700', paid: 'bg-emerald-50 text-emerald-700' }
               const pStatusLabel = { draft: 'Draft', sent: 'Sent', paid: 'Paid' }
               return (
                <div key={p.id} className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 shadow-sm">
                 <div className="flex items-center gap-4">
                  <span className="text-xs text-[#6B7A90]">{fmtDate(p.payment_date)}</span>
                  <span className="text-sm font-medium text-[#091426]">{Number(p.amount) > 0 ? fmtCurrency(Number(p.amount)) : ''}</span>
                  {p.note && <span className="text-xs text-[#6B7A90]">{p.note}</span>}
                  <select value={pStatus} onChange={e => changePaymentStatus(p.id, item.id, e.target.value)}
                   className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border-0 cursor-pointer ${pStatusChip[pStatus]}`}>
                   <option value="draft">Draft</option>
                   <option value="sent">Sent</option>
                   <option value="paid">Paid</option>
                  </select>
                 </div>
                 <div className="flex items-center gap-1">
                  {pStatus !== 'paid' && (
                   <button onClick={() => openPaymentEmailModal(p, item)}
                    className="p-1 rounded-lg text-[#6B7A90] hover:text-[#B8960B] hover:bg-amber-50 transition" title="Send to Client">
                    <Send size={12} strokeWidth={1.8} />
                   </button>
                  )}
                  <button onClick={() => deletePayment(p.id, item.id)}
                   className="p-1 rounded-lg text-[#6B7A90] hover:text-red-500 hover:bg-red-50 transition">
                   <Trash2 size={12} strokeWidth={1.8} />
                  </button>
                 </div>
                </div>
               )
              })}
              </div>
             ) : (
              <p className="text-xs text-[#6B7A90]">No payments recorded yet</p>
             )}
             <button onClick={() => { setShowPayment(item); setPayForm({ amount: '', percentage: '', mode: 'amount', payment_date: new Date().toISOString().split('T')[0], note: '' }) }}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-[#091426] hover:text-[#B8960B] transition">
              <Plus size={12} strokeWidth={2} /> Add Payment
             </button>
            </td>
           </tr>
          )}
         </>
        )
       })}
      </tbody>
     </table>
    </div>
    {items.length === 0 && (
     <div className="text-center py-12 text-[#6B7A90] text-sm">No budget items yet</div>
    )}
    <div className="p-4 border-t border-[#F3F3F3] flex items-center gap-4">
     <button onClick={() => openAddModal()}
      className="flex items-center gap-2 text-sm font-medium text-[#091426] hover:text-[#B8960B] transition">
      <Plus size={14} strokeWidth={1.8} /> Add Budget Item
     </button>
     <label className={`flex items-center gap-2 text-sm font-medium text-[#091426] hover:text-[#B8960B] transition cursor-pointer ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
      <Upload size={14} strokeWidth={1.8} /> {importing ? 'Importing...' : 'Import from Excel'}
      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={importFromExcel} />
     </label>
    </div>
   </div>

   {/* מודאל הוספה / עריכה של פריט תקציב */}
   {showAdd && (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={() => { setShowAdd(false); setEditItem(null) }}>
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-[#F3F3F3]">
       <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">{editItem ? 'Edit Budget Item' : 'Add Budget Item'}</h2>
       <button onClick={() => { setShowAdd(false); setEditItem(null) }} className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-xl hover:bg-[#F3F3F3] transition"><X size={18} strokeWidth={1.8} /></button>
      </div>
      <div className="p-5 space-y-4">
       {/* ספק — חיפוש אוטוקומפליט */}
       <div className="relative">
        <label className={lbl}>Supplier</label>
        <div className="relative">
         <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A90]" />
         <input value={supplierSearch}
          onChange={e => { setSupplierSearch(e.target.value); setShowSupplierDropdown(true); setAddForm(f => ({ ...f, supplier_id: '' })) }}
          onFocus={() => setShowSupplierDropdown(true)}
          placeholder="Search supplier..."
          className={`${inp} pl-8`} />
        </div>
        {showSupplierDropdown && (
         <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg border border-[#F3F3F3] max-h-40 overflow-y-auto">
          {filteredSuppliers.map(s => (
           <button key={s.id} onClick={() => { setAddForm(f => ({ ...f, supplier_id: s.id })); setSupplierSearch(s.name); setShowSupplierDropdown(false) }}
            className="w-full text-left px-3 py-2 text-sm hover:bg-[#F9F9F9] transition">
            {s.name}
           </button>
          ))}
          {filteredSuppliers.length === 0 && supplierSearch.trim() && (
           <button onClick={createSupplierFromSearch}
            className="w-full text-left px-3 py-2 text-sm text-[#B8960B] font-medium hover:bg-amber-50 transition">
            + Create "{supplierSearch.trim()}"
           </button>
          )}
         </div>
        )}
        {addForm.supplier_id && (
         <p className="text-[10px] text-emerald-600 mt-1">Linked to supplier</p>
        )}
       </div>
       <div>
        <label className={lbl}>Category *</label>
        <input value={addForm.category} onChange={e => setAddForm(f => ({ ...f, category: e.target.value }))}
         placeholder="e.g. Flooring, Electrical, Kitchen..."
         className={inp} autoFocus />
       </div>
       <div>
        <label className={lbl}>Amount (before VAT) *</label>
        <input type="number" value={addForm.planned_amount} onChange={e => setAddForm(f => ({ ...f, planned_amount: e.target.value }))}
         placeholder="0" className={inp} />
        {addForm.planned_amount && (
         <p className="text-[10px] text-[#6B7A90] mt-1">Incl. VAT ({Math.round(VAT_RATE * 100)}%): {fmtCurrency(Math.round(Number(addForm.planned_amount) * (1 + VAT_RATE)))}</p>
        )}
       </div>
       <div>
        <label className={lbl}>Payment Terms</label>
        <input value={addForm.payment_terms} onChange={e => setAddForm(f => ({ ...f, payment_terms: e.target.value }))}
         placeholder="e.g. Net 30, 50% advance..."
         className={inp} />
       </div>
       <div>
        <label className={lbl}>Notes</label>
        <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
         rows={2} className={`${inp} resize-none`} />
       </div>
       <div>
        <label className={lbl}>Drive Link</label>
        <input value={addForm.drive_link} onChange={e => setAddForm(f => ({ ...f, drive_link: e.target.value }))}
         placeholder="https://drive.google.com/..."
         className={inp} />
       </div>
      </div>
      <div className="flex gap-3 p-5 border-t border-[#F3F3F3]">
       <button onClick={saveItem} className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all">
        {editItem ? 'Save Changes' : 'Add Item'}
       </button>
       <button onClick={() => { setShowAdd(false); setEditItem(null) }} className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F9F9F9] bg-[#F3F3F3] transition-all">Cancel</button>
      </div>
     </div>
    </div>
   )}

   {/* מודאל רישום תשלום */}
   {showPayment && (() => {
    const paySupplier = suppliers.find(s => s.id === showPayment.supplier_id)
    const payTotalVat = Number(showPayment.planned_amount) * (1 + VAT_RATE)
    const payAlreadyPaid = getItemPaid(showPayment)
    const payRemaining = payTotalVat - payAlreadyPaid
    return (
     <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={() => setShowPayment(null)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
       <div className="flex items-center justify-between p-5 border-b border-[#F3F3F3]">
        <div>
         <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">Add Payment</h2>
         <p className="text-xs text-[#6B7A90] mt-0.5">{showPayment.category}{paySupplier ? ` — ${paySupplier.name}` : ''}</p>
        </div>
        <button onClick={() => setShowPayment(null)} className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-xl hover:bg-[#F3F3F3] transition"><X size={18} strokeWidth={1.8} /></button>
       </div>
       <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-center bg-[#F3F3F3] rounded-xl p-3">
         <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Total (VAT)</p>
          <p className="text-sm font-bold text-[#091426]">{fmtCurrency(Math.round(payTotalVat))}</p>
         </div>
         <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Paid</p>
          <p className="text-sm font-bold text-emerald-600">{fmtCurrency(Math.round(payAlreadyPaid))}</p>
         </div>
         <div>
          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Remaining</p>
          <p className="text-sm font-bold text-[#091426]">{fmtCurrency(Math.round(payRemaining))}</p>
         </div>
        </div>
        {/* מצב הזנה: סכום או אחוז */}
        <div className="flex items-center gap-2 bg-[#F3F3F3] rounded-xl p-1">
         <button onClick={() => setPayForm(f => ({ ...f, mode: 'amount' }))}
          className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition ${payForm.mode === 'amount' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90]'}`}>
          Amount
         </button>
         <button onClick={() => setPayForm(f => ({ ...f, mode: 'percentage' }))}
          className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition ${payForm.mode === 'percentage' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90]'}`}>
          Percentage
         </button>
        </div>
        {payForm.mode === 'amount' ? (
         <div>
          <label className={lbl}>Amount *</label>
          <input type="number" value={payForm.amount}
           onChange={e => {
            const amt = e.target.value
            setPayForm(f => ({ ...f, amount: amt, percentage: payTotalVat > 0 ? (Number(amt) / payTotalVat * 100).toFixed(1) : '' }))
           }}
           placeholder="0" className={inp} autoFocus />
          {payForm.amount && <p className="text-[10px] text-[#6B7A90] mt-1">= {payTotalVat > 0 ? (Number(payForm.amount) / payTotalVat * 100).toFixed(1) : 0}% of total</p>}
         </div>
        ) : (
         <div>
          <label className={lbl}>Percentage *</label>
          <input type="number" value={payForm.percentage}
           onChange={e => {
            const pct = e.target.value
            setPayForm(f => ({ ...f, percentage: pct, amount: (Number(pct) / 100 * payTotalVat).toFixed(0) }))
           }}
           placeholder="0" className={inp} autoFocus />
          {payForm.percentage && <p className="text-[10px] text-[#6B7A90] mt-1">= {fmtCurrency(Math.round(Number(payForm.percentage) / 100 * payTotalVat))}</p>}
         </div>
        )}
        <div>
         <label className={lbl}>Date</label>
         <input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))}
          className={inp} />
        </div>
        <div>
         <label className={lbl}>Note</label>
         <input value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))}
          placeholder="Optional note..."
          className={inp} />
        </div>
       </div>
       <div className="flex gap-3 p-5 border-t border-[#F3F3F3]">
        <button onClick={recordPayment} disabled={!payForm.amount}
         className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">Record Payment</button>
        <button onClick={() => setShowPayment(null)} className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F9F9F9] bg-[#F3F3F3] transition-all">Cancel</button>
       </div>
      </div>
     </div>
    )
   })()}

   {/* מודאל שליחת בקשת תשלום */}
   {showEmail && (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={() => setShowEmail(null)}>
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between p-5 border-b border-[#F3F3F3]">
       <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">Send Payment Request</h2>
       <button onClick={() => setShowEmail(null)} className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-xl hover:bg-[#F3F3F3] transition"><X size={18} strokeWidth={1.8} /></button>
      </div>
      <div className="p-5 space-y-4">
       <div>
        <label className={lbl}>To</label>
        <input value={emailTo} onChange={e => setEmailTo(e.target.value)} className={inp} />
       </div>
       <div>
        <label className={lbl}>Subject</label>
        <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className={inp} />
       </div>
       <div>
        <label className={lbl}>Body</label>
        <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
         rows={8} className={`${inp} resize-none`} />
       </div>
       {/* קבצים מצורפים */}
       <div>
        <label className={lbl}>Attachments</label>
        {budgetAttachedFiles.map((f, i) => (
         <div key={i} className="flex items-center gap-2 bg-[#F3F3F3] rounded-lg px-3 py-1.5 mb-1.5 text-xs">
          <span className="flex-1 truncate">{f.name}</span>
          <button onClick={() => setBudgetAttachedFiles(prev => prev.filter((_, j) => j !== i))}
           className="text-red-400 hover:text-red-600 text-xs">✕</button>
         </div>
        ))}
        <label className={`inline-flex items-center gap-1.5 text-xs text-[#7B5800] font-medium cursor-pointer hover:underline ${budgetUploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
         {budgetUploadingFile ? 'Uploading...' : '+ Add File'}
         <input type="file" className="hidden" onChange={e => {
          const file = e.target.files?.[0]
          if (!file) return
          if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return }
          setBudgetUploadingFile(true)
          const reader = new FileReader()
          reader.onload = () => { setBudgetAttachedFiles(prev => [...prev, { name: file.name, dataUrl: reader.result }]); setBudgetUploadingFile(false) }
          reader.readAsDataURL(file)
          e.target.value = ''
         }} />
        </label>
       </div>
      </div>
      <div className="flex gap-3 p-5 border-t border-[#F3F3F3]">
       <button onClick={sendPaymentEmail} disabled={!emailTo || sendingEmail}
        className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
        <Send size={14} strokeWidth={1.8} /> {sendingEmail ? 'Sending...' : 'Send Email'}
       </button>
       <button onClick={() => setShowEmail(null)} className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F9F9F9] bg-[#F3F3F3] transition-all">Cancel</button>
      </div>
     </div>
    </div>
   )}
  </div>
 )
}

// בניית עץ תכולות לבחירה
function buildScopeTree(items) {
 const phases = items.filter(i => i.level === 'phase').sort((a, b) => a.sort_order - b.sort_order)
 return phases.map(phase => ({
  ...phase,
  tasks: items
   .filter(i => i.level === 'task' && i.parent_id === phase.id)
   .sort((a, b) => a.sort_order - b.sort_order)
   .map(task => ({
    ...task,
    subtasks: items
     .filter(i => i.level === 'subtask' && i.parent_id === task.id)
     .sort((a, b) => a.sort_order - b.sort_order)
   }))
 }))
}

// ── בורר תכולות (עץ צ'קבוקסים) ──
function ScopeSelectorModal({ tree, selected, onChange }) {
 const [expanded, setExpanded] = useState({})
 function toggle(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }
 function isSelected(id) { return selected.has(id) }

 function togglePhase(phase) {
  const allIds = [phase.id, ...phase.tasks.map(t => t.id), ...phase.tasks.flatMap(t => t.subtasks.map(s => s.id))]
  const allSelected = allIds.every(id => selected.has(id))
  const next = new Set(selected)
  allIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
  onChange(next)
 }

 function toggleTask(task) {
  const allIds = [task.id, ...task.subtasks.map(s => s.id)]
  const allSelected = allIds.every(id => selected.has(id))
  const next = new Set(selected)
  allIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
  onChange(next)
 }

 function toggleSub(subId) {
  const next = new Set(selected)
  next.has(subId) ? next.delete(subId) : next.add(subId)
  onChange(next)
 }

 if (tree.length === 0) return (
  <div className="text-center py-8 text-[#6B7A90] text-sm">No scope items — add some in "Scope Templates" first</div>
 )

 return (
  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
   {tree.map(phase => {
    const phaseTaskIds = phase.tasks.map(t => t.id)
    const phaseSubIds = phase.tasks.flatMap(t => t.subtasks.map(s => s.id))
    const allPhaseIds = [phase.id, ...phaseTaskIds, ...phaseSubIds]
    const phaseAll = allPhaseIds.every(id => selected.has(id))
    const phaseSome = allPhaseIds.some(id => selected.has(id)) && !phaseAll

    return (
     <div key={phase.id} className="rounded-xl overflow-hidden shadow-[0_2px_20px_rgba(9,20,38,0.04)]">
      <div className={`flex items-center gap-3 px-3 py-2.5 ${phaseAll ? 'bg-[#091426]' : 'bg-[#F3F3F3]'} cursor-pointer`}
       onClick={() => togglePhase(phase)}>
       <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
        phaseAll ? 'bg-white border-white' : phaseSome ? 'border-[#6B7A90] bg-white' : 'border-[#6B7A90]/40 bg-white'
       }`}>
        {phaseAll && <Check size={10} className="text-[#091426]" />}
        {phaseSome && <div className="w-2 h-0.5 bg-[#6B7A90] rounded" />}
       </div>
       <span className={`font-semibold text-sm flex-1 ${phaseAll ? 'text-white' : 'text-[#091426]'}`}>{phase.name}</span>
       <button onClick={e => { e.stopPropagation(); toggle(phase.id) }}
        className={`${phaseAll ? 'text-gray-300' : 'text-[#6B7A90]'}`}>
        {expanded[phase.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
       </button>
      </div>
      {expanded[phase.id] && (
       <div>
        {phase.tasks.map(task => {
         const taskIds = [task.id, ...task.subtasks.map(s => s.id)]
         const taskAll = taskIds.every(id => selected.has(id))
         const taskSome = taskIds.some(id => selected.has(id)) && !taskAll
         return (
          <div key={task.id}>
           <div className="flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-[#F9F9F9] transition"
            onClick={() => toggleTask(task)}>
            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
             taskAll ? 'bg-[#091426] border-[#091426]' : taskSome ? 'border-[#6B7A90] bg-white' : 'border-[#6B7A90]/40 bg-white'
            }`}>
             {taskAll && <Check size={10} className="text-white" />}
             {taskSome && <div className="w-2 h-0.5 bg-[#6B7A90] rounded" />}
            </div>
            <span className="text-sm text-[#091426] flex-1">{task.name}</span>
            {task.subtasks.length > 0 && (
             <>
              <span className="text-xs text-[#6B7A90]">{task.subtasks.length}</span>
              <button onClick={e => { e.stopPropagation(); toggle(task.id) }} className="text-[#6B7A90]">
               {expanded[task.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
             </>
            )}
           </div>
           {expanded[task.id] && task.subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-3 px-9 py-1.5 cursor-pointer hover:bg-[#F9F9F9] transition"
             onClick={() => toggleSub(sub.id)}>
             <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
              isSelected(sub.id) ? 'bg-[#091426] border-[#091426]' : 'border-[#6B7A90]/40 bg-white'
             }`}>
              {isSelected(sub.id) && <Check size={9} className="text-white" />}
             </div>
             <span className="text-xs text-[#6B7A90]">{sub.name}</span>
            </div>
           ))}
          </div>
         )
        })}
       </div>
      )}
     </div>
    )
   })}
  </div>
 )
}

function ProjectDetail({ project, clients, onBack }) {
 const [tasks, setTasks]         = useState([])
 const [loading, setLoading]       = useState(true)
 const [view, setView]          = useState('tasks')
 const [phaseExpanded, setPhaseExpanded] = useState({})
 const [selectedTask, setSelectedTask]  = useState(null)
 const [showNewTask, setShowNewTask]   = useState(false)
 const [taskForm, setTaskForm]      = useState({ name: '', due_date: '', assigned_to: '', priority: 'normal', phase_name: '' })
 const [projectStatus, setProjectStatus] = useState(project.status)
 const [projectName, setProjectName] = useState(project.name)
 const [editingName, setEditingName] = useState(false)
 const [projectEndDate, setProjectEndDate] = useState(project.end_date || '')
 const [defaultAssignee, setDefaultAssignee] = useState(project.default_assignee || '')
 const [knowledgeItems, setKnowledgeItems] = useState([])

 // ── Import Scope ──
 const [showImportScope, setShowImportScope] = useState(false)
 const [scopeTree, setScopeTree] = useState([])
 const [selectedScope, setSelectedScope] = useState(new Set())
 const [importingScope, setImportingScope] = useState(false)

 // ── Team Members (for assignee dropdown) ──
 const [teamMembers, setTeamMembers] = useState([])

 // ── Setup Billing ──
 const [showBilling, setShowBilling] = useState(false)
 const [billingPrice, setBillingPrice] = useState('')
 const [billingRows, setBillingRows] = useState([])
 const [hasPayments, setHasPayments] = useState(null)
 const [creatingBilling, setCreatingBilling] = useState(false)

 useEffect(() => { fetchTasks(); fetchKnowledge(); checkPayments(); fetchTeamMembers() }, [project.id])

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

 async function fetchTeamMembers() {
  const { data } = await supabase.from('user_roles').select('name').order('name')
  setTeamMembers((data || []).map(d => d.name).filter(Boolean))
 }

 async function updateTaskStatus(taskId, newStatus, blockReason) {
  await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  if (newStatus === 'blocked' && blockReason) {
   await supabase.from('task_logs').insert({ task_id: taskId, note: `Blocked: ${blockReason}` })
  }
  let updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
  if (selectedTask?.id === taskId) setSelectedTask(p => ({ ...p, status: newStatus }))

  const task = updatedTasks.find(t => t.id === taskId)

  // אם תת-משימה הושלמה — בדיקה אם כל תת-המשימות של ההורה הושלמו
  if (newStatus === 'done' && task?.level === 'subtask' && task?.parent_task_id) {
   const siblings = updatedTasks.filter(t => t.parent_task_id === task.parent_task_id && t.level === 'subtask')
   if (siblings.length > 0 && siblings.every(t => t.status === 'done')) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', task.parent_task_id)
    updatedTasks = updatedTasks.map(t => t.id === task.parent_task_id ? { ...t, status: 'done' } : t)
    if (selectedTask?.id === task.parent_task_id) setSelectedTask(p => ({ ...p, status: 'done' }))
   }
  }

  setTasks(updatedTasks)

  // טריגר גבייה — התחלת שלב (משימה ראשונה עוברת ל-in_progress)
  if (newStatus === 'in_progress' && task?.phase_name) {
   const phaseTasks = updatedTasks.filter(t => t.phase_name === task.phase_name && t.level !== 'subtask')
   const othersStarted = phaseTasks.some(t => t.id !== taskId && (t.status === 'in_progress' || t.status === 'done'))
   if (!othersStarted) {
    // זו המשימה הראשונה שמתחילה בשלב — בדיקת אבני דרך עם phase_trigger='start'
    const { data: startPayments } = await supabase
     .from('payments')
     .select('id, name, status, phase_name, phase_trigger')
     .eq('project_id', project.id)
     .eq('status', 'pending')
     .eq('phase_trigger', 'start')
    if (startPayments) {
     const match = startPayments.find(p => p.phase_name === task.phase_name)
     if (match) {
      const today = new Date().toISOString().split('T')[0]
      await supabase.from('payments').update({ phase_completed_at: today, status: 'pending_approval' }).eq('id', match.id)
      await supabase.from('payment_logs').insert({ payment_id: match.id, note: `Phase started: "${task.phase_name}"` })
      console.log(`[Billing] Milestone "${match.name}" — triggered on phase start`)
     }
    }
   }
  }

  // טריגר גבייה — סיום שלב (כל המשימות done)
  if (newStatus === 'done' && task?.phase_name) {
    const phaseTasks = updatedTasks.filter(t => t.phase_name === task.phase_name && t.level !== 'subtask')
    const allDone = phaseTasks.every(t => t.status === 'done')
    if (allDone && phaseTasks.length > 0) {
     console.log(`[Phase Complete] All ${phaseTasks.length} tasks in "${task.phase_name}" are done.`)
     await supabase.from('task_logs').insert({
      task_id: taskId,
      note: `Phase "${task.phase_name}" completed — all ${phaseTasks.length} tasks done`,
     })
     // העברת אבן דרך גבייה — סיום שלב (phase_trigger != 'start' או ללא trigger)
     const { data: matchingPayments } = await supabase
      .from('payments')
      .select('id, name, status, phase_name, phase_trigger')
      .eq('project_id', project.id)
      .eq('status', 'pending')
     if (matchingPayments) {
      const match = matchingPayments.find(p => p.phase_name === task.phase_name && p.phase_trigger !== 'start')
      if (match) {
       const today = new Date().toISOString().split('T')[0]
       await supabase.from('payments').update({ phase_completed_at: today, status: 'pending_approval' }).eq('id', match.id)
       await supabase.from('payment_logs').insert({ payment_id: match.id, note: `Phase completed: "${task.phase_name}"` })
       console.log(`[Billing] Milestone "${match.name}" — phase_completed_at set`)
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
  const assignee = taskForm.assigned_to || defaultAssignee || null
  await supabase.from('tasks').insert({
   ...taskForm, assigned_to: assignee, project_id: project.id, status: 'pending', level: 'task',
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

 async function saveProjectName() {
  if (!projectName.trim()) return
  await supabase.from('projects').update({ name: projectName.trim() }).eq('id', project.id)
  project.name = projectName.trim()
  setEditingName(false)
 }

 async function saveProjectEndDate(val) {
  setProjectEndDate(val)
  await supabase.from('projects').update({ end_date: val || null }).eq('id', project.id)
 }

 async function saveDefaultAssignee(val) {
  setDefaultAssignee(val)
  await supabase.from('projects').update({ default_assignee: val || null }).eq('id', project.id)
  // שיוך כל המשימות בפרויקט למנהלת החדשה
  if (val) {
   await supabase.from('tasks').update({ assigned_to: val }).eq('project_id', project.id)
   setTasks(prev => prev.map(t => ({ ...t, assigned_to: val })))
  }
 }

 // ── בדיקה אם יש תשלומים לפרויקט ──
 async function checkPayments() {
  const { data } = await supabase.from('payments').select('id').eq('project_id', project.id).limit(1)
  setHasPayments(data && data.length > 0)
 }

 // ── פתיחת מודאל ייבוא תכולות ──
 async function openImportScope() {
  const { data } = await supabase.from('contents').select('*').order('sort_order')
  setScopeTree(buildScopeTree(data || []))
  setSelectedScope(new Set())
  setShowImportScope(true)
 }

 // ── ייבוא תכולות לפרויקט (מוסיף משימות, לא מוחק קיימות) ──
 async function importScope() {
  if (selectedScope.size === 0) return
  setImportingScope(true)
  try {
   const { data: allContents } = await supabase.from('contents').select('*')
   const getContent = id => allContents?.find(c => c.id === id)

   // סינון רק פריטים שנבחרו ושהם tasks
   const selectedTaskContents = allContents.filter(c =>
    c.level === 'task' && selectedScope.has(c.id)
   )

   // קיבוץ לפי שלבים
   const phaseMap = {}
   selectedTaskContents.forEach(c => {
    const phase = getContent(c.parent_id)
    const phaseKey = phase?.id || 'general'
    if (!phaseMap[phaseKey]) phaseMap[phaseKey] = { phase, tasks: [] }
    phaseMap[phaseKey].tasks.push(c)
   })
   const byPhase = Object.values(phaseMap).sort((a, b) =>
    (a.phase?.sort_order || 0) - (b.phase?.sort_order || 0)
   )
   byPhase.forEach(p => p.tasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))

   const pStart = project.start_date ? new Date(project.start_date) : new Date()
   // מציאת הנקודה האחרונה של משימות קיימות
   const existingTasks = tasks.filter(t => t.level !== 'subtask' && t.due_date)
   let cursor = new Date(pStart)
   if (existingTasks.length > 0) {
    const maxDate = existingTasks.reduce((max, t) => {
     const d = new Date(t.due_date)
     return d > max ? d : max
    }, new Date(pStart))
    cursor = new Date(maxDate)
   }

   const taskMap = {}

   for (const { phase, tasks: phTasks } of byPhase) {
    const phaseName = phase?.name || 'General'
    let taskCursor = new Date(cursor)

    for (const c of phTasks) {
     const days = c.estimated_days || 7
     const startDate = taskCursor.toISOString().split('T')[0]
     const endDate = new Date(taskCursor)
     endDate.setDate(endDate.getDate() + days)
     const dueDate = endDate.toISOString().split('T')[0]

     const { data: t } = await supabase
      .from('tasks')
      .insert({
       project_id: project.id,
       name: c.name,
       status: 'pending',
       level: 'task',
       phase_name: phaseName,
       content_ref_id: c.id,
       sort_order: (phase?.sort_order || 0) * 100 + (c.sort_order || 0),
       estimated_days: days,
       start_date: startDate,
       due_date: dueDate,
      })
      .select()
      .single()
     if (t) taskMap[c.id] = t.id
     taskCursor = new Date(endDate)
    }
    cursor = new Date(taskCursor)
   }

   // יצירת תת-משימות
   const allSubContents = allContents.filter(c => c.level === 'subtask') || []
   const subBatch = []
   for (const [contentId, taskId] of Object.entries(taskMap)) {
    const taskSubs = allSubContents.filter(s => s.parent_id === contentId && selectedScope.has(s.id))
    taskSubs.forEach(s => {
     const phase = getContent(getContent(s.parent_id)?.parent_id)
     subBatch.push({
      project_id: project.id,
      name: s.name,
      status: 'pending',
      level: 'subtask',
      parent_task_id: taskId,
      phase_name: phase?.name || '',
      content_ref_id: s.id,
      sort_order: s.sort_order || 0,
     })
    })
   }
   for (let i = 0; i < subBatch.length; i += 50) {
    await supabase.from('tasks').insert(subBatch.slice(i, i + 50))
   }

   setShowImportScope(false)
   fetchTasks()
  } finally {
   setImportingScope(false)
  }
 }

 // ── פתיחת מודאל הגדרת גבייה — שליפת שלבים אמיתיים מהמשימות ──
 async function openBillingSetup() {
  setBillingPrice(project.project_price?.toString() || '')
  // שליפת שמות שלבים ייחודיים מהמשימות
  const { data: phases } = await supabase
   .from('tasks')
   .select('phase_name')
   .eq('project_id', project.id)
   .not('phase_name', 'is', null)
  const uniquePhases = [...new Set((phases || []).map(p => p.phase_name).filter(Boolean))]
  if (uniquePhases.length > 0) {
   const pctPerPhase = Math.floor(70 / uniquePhases.length) // 30% מקדמה, השאר מחולק שווה
   const rows = [
    { name: 'Advance Payment', pct: 30, phase_name: null },
    ...uniquePhases.map((ph, i) => ({
     name: ph,
     pct: i === uniquePhases.length - 1 ? 70 - pctPerPhase * (uniquePhases.length - 1) : pctPerPhase,
     phase_name: ph,
    }))
   ]
   setBillingRows(rows)
  } else {
   setBillingRows(DEFAULT_BILLING_MILESTONES.map(m => ({ ...m })))
  }
  setShowBilling(true)
 }

 // ── יצירת תשלומים ──
 async function createBillingPayments() {
  const price = parseFloat(billingPrice) || 0
  if (price <= 0) return
  setCreatingBilling(true)
  try {
   // יצירת תשלומים עם phase_name לחיבור לשלבים
   const items = billingRows
    .filter(r => Number(r.pct || 0) > 0)
    .map(r => ({
     project_id: project.id,
     name: r.name,
     pct: Number(r.pct),
     amount: Math.round(price * Number(r.pct) / 100),
     status: 'pending',
     phase_name: r.phase_name || null,
     phase_trigger: r.phase_trigger || 'end',
    }))
   if (items.length > 0) {
    await supabase.from('payments').insert(items)
    // בדיקת שלבים שכבר הושלמו — עדכון אוטומטי של גבייה
    const { data: allTasks } = await supabase.from('tasks').select('phase_name, status, level').eq('project_id', project.id)
    if (allTasks) {
     const phases = [...new Set(allTasks.filter(t => t.phase_name).map(t => t.phase_name))]
     for (const phase of phases) {
      const phaseMains = allTasks.filter(t => t.phase_name === phase && t.level !== 'subtask')
      const allDone = phaseMains.length > 0 && phaseMains.every(t => t.status === 'done')
      if (allDone) {
       const matchItem = items.find(i => i.phase_name === phase)
       if (matchItem) {
        await supabase.from('payments').update({ status: 'sent', due_date: new Date().toISOString().split('T')[0] })
         .eq('project_id', project.id).eq('phase_name', phase).eq('status', 'pending')
       }
      }
     }
    }
   }
   // עדכון מחיר הפרויקט
   if (price !== project.project_price) {
    await supabase.from('projects').update({ project_price: price }).eq('id', project.id)
   }
   setShowBilling(false)
   setHasPayments(true)
  } finally {
   setCreatingBilling(false)
  }
 }

 const billingTotalPct = billingRows.reduce((s, r) => s + Number(r.pct || 0), 0)

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
    {editingName ? (
     <input value={projectName} onChange={e => setProjectName(e.target.value)}
      onBlur={saveProjectName} onKeyDown={e => e.key === 'Enter' && saveProjectName()}
      autoFocus className="text-[#091426] font-semibold text-sm bg-[#F3F3F3] rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 w-48" />
    ) : (
     <button onClick={() => setEditingName(true)} className="text-[#091426] font-semibold text-sm hover:bg-[#F3F3F3] px-2 py-1 rounded-lg transition flex items-center gap-1" title="Click to rename">
      {projectName} <Pencil size={10} className="text-[#6B7A90]" />
     </button>
    )}

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
     <div className="flex items-center gap-1">
      <span className="text-[10px] text-[#6B7A90] font-medium">Deadline:</span>
      <input type="date" value={projectEndDate} onChange={e => saveProjectEndDate(e.target.value)}
       className="text-xs text-[#6B7A90] bg-[#F3F3F3] rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 cursor-pointer" />
     </div>
     <div className="flex items-center gap-1">
      <span className="text-[10px] text-[#6B7A90] font-medium">Manager:</span>
      <select value={defaultAssignee} onChange={e => saveDefaultAssignee(e.target.value)}
       className="text-xs text-[#6B7A90] bg-[#F3F3F3] rounded-lg px-2 py-1 border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 cursor-pointer">
       <option value="">Unassigned</option>
       {teamMembers.map(name => <option key={name} value={name}>{name}</option>)}
      </select>
     </div>

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
      <button onClick={() => setView('budget')}
       className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
        view === 'budget' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90] hover:text-[#091426]'}`}>
       <CreditCard size={13} strokeWidth={1.8} /> Budget
      </button>
     </div>

     <button onClick={openImportScope}
      className="bg-white text-[#091426] border border-[#091426]/20 px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#F3F3F3] transition-all flex items-center gap-1">
      <Download size={13} strokeWidth={1.8} /> Import Scope
     </button>
     {hasPayments === false && (
      <button onClick={openBillingSetup}
       className="bg-[#B8960B] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#9A7D09] transition-all flex items-center gap-1">
       <CreditCard size={13} strokeWidth={1.8} /> Setup Billing
      </button>
     )}
     <button onClick={() => setShowNewTask(true)}
      className="bg-[#091426] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#1E293B] transition-all flex items-center gap-1">
      <Plus size={13} strokeWidth={1.8} /> Task
     </button>
    </div>
   </div>

   {/* KPI strip — רק בטאב Tasks */}
   {view === 'tasks' && (
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
   )}

   {/* Progress bar — רק בטאב Tasks */}
   {view === 'tasks' && mainTasks.length > 0 && (
    <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] px-5 py-3 mb-4 flex items-center gap-4">
     <span className="text-sm font-medium text-[#091426] shrink-0">Progress</span>
     <div className="flex-1 bg-[#F3F3F3] rounded-full h-2">
      <div className="bg-[#091426] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
     </div>
     <span className="text-sm font-bold text-[#091426] shrink-0 w-10 text-right">{progress}%</span>
    </div>
   )}

   {/* Empty state */}
   {view === 'tasks' && mainTasks.length === 0 && (
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

   {/* ── תקציב ── */}
   {view === 'budget' && (
    <BudgetView project={project} client={client} />
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
     client={client}
     teamMembers={teamMembers}
     onClose={() => setSelectedTask(null)}
     onUpdate={() => {
      fetchTasks()
      supabase.from('tasks').select('*').eq('id', selectedTask.id).single()
       .then(({ data }) => { if (data) setSelectedTask(data) })
     }}
    />
   )}

   {/* ── מודאל ייבוא תכולות ── */}
   {showImportScope && (
    <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
       <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">Import Scope</h2>
       <button onClick={() => setShowImportScope(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]"><X size={16} strokeWidth={1.8} /></button>
      </div>
      <div className="px-6 py-5">
       <p className="text-xs text-[#6B7A90] mb-3">Select scope items to import as tasks. Existing tasks will not be affected.</p>
       <ScopeSelectorModal tree={scopeTree} selected={selectedScope} onChange={setSelectedScope} />
      </div>
      <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
       <button onClick={importScope}
        disabled={selectedScope.size === 0 || importingScope}
        className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
        {importingScope ? 'Importing...' : `Import ${selectedScope.size} Items`}
       </button>
       <button onClick={() => setShowImportScope(false)} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
      </div>
     </div>
    </div>
   )}

   {/* ── מודאל הגדרת גבייה ── */}
   {showBilling && (
    <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
     <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
       <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">Setup Billing</h2>
       <button onClick={() => setShowBilling(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]"><X size={16} strokeWidth={1.8} /></button>
      </div>
      <div className="px-6 py-5 space-y-4">
       <div>
        <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Project Price (₪) *</label>
        <input type="number" value={billingPrice} onChange={e => setBillingPrice(e.target.value)}
         placeholder="100000"
         className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
       </div>
       <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] px-1">
         <span className="col-span-5">Milestone</span>
         <span className="col-span-2 text-center">%</span>
         <span className="col-span-2 text-right">Amount</span>
         <span className="col-span-2 text-center">Trigger</span>
        </div>
        {billingRows.map((r, i) => (
         <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <input value={r.name} onChange={e => setBillingRows(prev => prev.map((row, idx) => idx === i ? { ...row, name: e.target.value } : row))}
           className="col-span-5 bg-[#F3F3F3] rounded-xl px-2.5 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
          <div className="col-span-2 flex items-center gap-1">
           <input type="number" value={r.pct} onChange={e => setBillingRows(prev => prev.map((row, idx) => idx === i ? { ...row, pct: e.target.value } : row))}
            className="w-full bg-[#F3F3F3] rounded-xl px-2 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-center" />
          </div>
          <div className="col-span-2 text-sm text-[#6B7A90] font-medium text-right">
           {billingPrice ? fmtCurrency(Math.round(Number(billingPrice) * Number(r.pct || 0) / 100)) : '—'}
          </div>
          <select value={r.phase_trigger || 'end'}
           onChange={e => setBillingRows(prev => prev.map((row, idx) => idx === i ? { ...row, phase_trigger: e.target.value } : row))}
           className="col-span-2 bg-[#F3F3F3] rounded-xl px-1 py-2 text-[11px] text-[#6B7A90] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
           <option value="end">End</option>
           <option value="start">Start</option>
          </select>
          <button onClick={() => setBillingRows(prev => prev.filter((_, idx) => idx !== i))}
           className="col-span-1 text-[#6B7A90] hover:text-red-500 transition flex justify-center">
           <X size={14} strokeWidth={1.8} />
          </button>
         </div>
        ))}
       </div>
       <div className="flex items-center justify-between">
        <button onClick={() => setBillingRows(prev => [...prev, { name: 'Additional Payment', pct: 0 }])}
         className="text-xs text-[#091426] hover:text-[#091426] font-medium flex items-center gap-1">
         <Plus size={12} strokeWidth={1.8} /> Add Row
        </button>
        <span className={`text-xs font-semibold ${billingTotalPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
         Total: {billingTotalPct}% {billingTotalPct !== 100 ? '⚠ Should be 100%' : '✓'}
        </span>
       </div>
      </div>
      <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
       <button onClick={createBillingPayments}
        disabled={!billingPrice || billingTotalPct !== 100 || creatingBilling}
        className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
        {creatingBilling ? 'Creating...' : `Create ${billingRows.length} Payments`}
       </button>
       <button onClick={() => setShowBilling(false)} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
      </div>
     </div>
    </div>
   )}
  </div>
 )
}

// ── עמוד ראשי ──
export default function Projects({ openProjectId, onProjectOpened }) {
 const [projects, setProjects] = useState([])
 const [clients, setClients]  = useState([])
 const [loading, setLoading]  = useState(true)
 const [selected, setSelected] = useState(null)
 const [showNew, setShowNew]  = useState(false)
 const [search, setSearch]   = useState('')
 const [form, setForm]     = useState({ name: '', client_id: '', start_date: '', end_date: '' })

 useEffect(() => { fetchAll() }, [])

 // פתיחת פרויקט ספציפי מ-MyDay
 useEffect(() => {
  if (openProjectId && projects.length > 0) {
   const proj = projects.find(p => p.id === openProjectId)
   if (proj) { setSelected(proj); onProjectOpened?.() }
  }
 }, [openProjectId, projects])

 async function fetchAll() {
  const [{ data: p }, { data: c }] = await Promise.all([
   supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
   supabase.from('clients').select('id, name, email').order('name'),
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

   {/* חיפוש */}
   {projects.length > 0 && (
    <input value={search} onChange={e => setSearch(e.target.value)}
     placeholder="Search by project name or client..."
     className="w-full bg-white rounded-xl px-4 py-2.5 text-sm border-0 shadow-[0_2px_20px_rgba(9,20,38,0.04)] focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 mb-4" />
   )}

   {projects.length === 0 && (
    <div className="flex flex-col items-center justify-center py-20 text-center">
     <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center text-3xl mb-4">📐</div>
     <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">No projects yet</h3>
     <p className="text-sm text-[#6B7A90]">Approve a client proposal — a project will be created automatically</p>
    </div>
   )}

   {(() => {
    const filtered = projects.filter(p => {
     if (!search.trim()) return true
     const q = search.toLowerCase()
     return p.name.toLowerCase().includes(q) || (p.clients?.name || '').toLowerCase().includes(q)
    })
    // קיבוץ לפי לקוח
    const byClient = {}
    filtered.forEach(p => {
     const clientName = p.clients?.name || 'No Client'
     const clientId = p.client_id || 'none'
     if (!byClient[clientId]) byClient[clientId] = { name: clientName, projects: [] }
     byClient[clientId].projects.push(p)
    })

    return (
     <div className="space-y-4">
      {Object.entries(byClient).map(([clientId, group]) => (
       <div key={clientId} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
        {/* כותרת לקוח */}
        <div className="flex items-center gap-3 px-5 py-3 bg-[#F9F9F9] border-b border-[#F3F3F3]">
         <div className="w-8 h-8 rounded-full bg-[#091426] flex items-center justify-center text-white text-xs font-bold shrink-0">
          {group.name.charAt(0)}
         </div>
         <div className="flex-1">
          <span className="font-semibold text-[#091426] text-sm">{group.name}</span>
          <span className="text-xs text-[#6B7A90] ml-2">{group.projects.length} {group.projects.length === 1 ? 'project' : 'projects'}</span>
         </div>
        </div>
        {/* פרויקטים */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
         {group.projects.map(p => {
          const meta = PROJECT_STATUS[p.status] || PROJECT_STATUS.active
          return (
           <div key={p.id} className="bg-[#F9F9F9] rounded-xl p-4 cursor-pointer hover:bg-[#F3F3F3] transition-all group relative"
            onClick={() => setSelected(p)}>
            <button onClick={e => { e.stopPropagation(); deleteProject(p.id) }}
             className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-red-500 p-1 rounded-lg hover:bg-red-50">
             <Trash2 size={13} strokeWidth={1.8} />
            </button>
            <div className="flex items-center justify-between mb-2">
             <span className="text-lg">📐</span>
             <span className={`inline-flex items-center text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full ${meta.chip}`}>
              {meta.label}
             </span>
            </div>
            <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight text-sm mb-1">{p.name}</h3>
            {(p.start_date || p.end_date) && (
             <p className="text-xs text-[#6B7A90] flex items-center gap-1">
              <Calendar size={10} strokeWidth={1.8} />
              {p.start_date && fmtDate(p.start_date)}
              {p.end_date && <> – {fmtDate(p.end_date)}</>}
             </p>
            )}
           </div>
          )
         })}
        </div>
       </div>
      ))}
     </div>
    )
   })()}

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
