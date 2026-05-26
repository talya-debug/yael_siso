import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { VAT_RATE } from '../lib/config'
import { Plus, X, Send, CheckCircle2, Clock, AlertCircle, Circle, Download, ChevronDown, ChevronRight, FileText, MessageSquare } from 'lucide-react'

// תבנית ברירת מחדל — 4 תשלומים לפי אבני דרך
const DEFAULT_MILESTONES = [
  { name: 'Advance Payment',       pct: 30 },
  { name: 'Layout Approval',       pct: 20 },
  { name: 'Working Drawings',      pct: 30 },
  { name: 'Project Completion',    pct: 20 },
]

// תנאי תשלום
const TERMS_OPTIONS = [
  { label: 'Immediate', days: 0 },
  { label: 'Net 30',    days: 30 },
  { label: 'Net 60',    days: 60 },
  { label: 'Net 90',    days: 90 },
]

// פורמט מטבע
function fmt(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

// פורמט תאריך
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// חישוב תאריך תשלום = תאריך השלמת שלב + ימי תשלום
function calcDueDate(payment) {
  if (!payment.phase_completed_at) return null
  const d = new Date(payment.phase_completed_at)
  d.setDate(d.getDate() + (payment.payment_terms_days || 0))
  return d
}

// האם התשלום באיחור
function isOverdue(payment) {
  const due = calcDueDate(payment)
  if (!due || payment.status === 'paid') return false
  return due < new Date()
}

// סיווג תשלום: future / pending_approval / current / sent / paid
function classifyPayment(p) {
  if (p.status === 'paid') return 'paid'
  if (p.status === 'sent') return 'sent'
  if (!p.phase_completed_at) return 'future'
  if (p.status === 'pending_approval') return 'pending_approval'
  return 'current' // status === 'pending' — מאושר, מוכן לגבייה
}

// ── מודאל תשלום בודד ──
function PaymentModal({ onClose, onSave, projects, editItem }) {
  const [form, setForm] = useState(editItem || {
    project_id: '', name: '', amount: '', pct: '', status: 'pending', notes: '', payment_terms_days: 0
  })
  const [contractTotal, setContractTotal] = useState('')

  useEffect(() => {
    if (form.pct && contractTotal) {
      setForm(p => ({ ...p, amount: Math.round(Number(contractTotal) * Number(form.pct) / 100) }))
    }
  }, [form.pct, contractTotal])

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  return (
    <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">{editItem ? 'Edit Payment' : 'New Payment'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]"><X size={16} strokeWidth={1.8} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={lbl}>Project *</label>
            <select value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} className={inp}>
              <option value="">Select project...</option>
              {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Name / Milestone *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Advance / Layout Approval..." className={inp} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Contract Total (for % calc)</label>
              <input type="number" value={contractTotal} onChange={e => setContractTotal(e.target.value)}
                placeholder="100000" className={inp} />
            </div>
            <div>
              <label className={lbl}>Percentage of Contract</label>
              <input type="number" value={form.pct} onChange={e => setForm(p => ({ ...p, pct: e.target.value }))}
                placeholder="30" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>Payment Amount (₪) *</label>
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="30000" className={inp} />
          </div>
          <div>
            <label className={lbl}>Payment Terms</label>
            <select value={form.payment_terms_days || 0} onChange={e => setForm(p => ({ ...p, payment_terms_days: Number(e.target.value) }))} className={inp}>
              {TERMS_OPTIONS.map(t => <option key={t.days} value={t.days}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Billing Trigger</label>
            <select value={form.phase_trigger || 'end'} onChange={e => setForm(p => ({ ...p, phase_trigger: e.target.value }))} className={inp}>
              <option value="end">Phase End (all tasks completed)</option>
              <option value="start">Phase Start (first task begins)</option>
            </select>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Additional details..." className={inp + ' resize-none'} />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-[#E2E8F0]">
          <button onClick={() => {
            // לא לשלוח שדות מיותרים
            const { due_date, ...rest } = form
            onSave(rest)
          }}
            disabled={!form.project_id || !form.name || !form.amount}
            className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
            Save
          </button>
          <button onClick={onClose} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F8F9FC] transition-all">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── מודאל תבנית לפרויקט ──
function TemplateModal({ onClose, onSave, projects }) {
  const [projectId, setProjectId]     = useState('')
  const [contractTotal, setContractTotal] = useState('')
  const [rows, setRows]               = useState(DEFAULT_MILESTONES.map(m => ({ ...m })))

  function updateRow(i, field, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }

  const totalPct = rows.reduce((s, r) => s + Number(r.pct || 0), 0)

  return (
    <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">Create Billing Template for Project</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]"><X size={16} strokeWidth={1.8} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Project *</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
                <option value="">Select...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Contract Total (₪) *</label>
              <input type="number" value={contractTotal} onChange={e => setContractTotal(e.target.value)}
                placeholder="100000"
                className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] px-1">
              <span className="col-span-5">Milestone</span>
              <span className="col-span-2 text-center">%</span>
              <span className="col-span-2 text-right">Amount</span>
              <span className="col-span-2 text-center">Trigger</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.name} onChange={e => updateRow(i, 'name', e.target.value)}
                  className="col-span-5 bg-[#F3F3F3] rounded-xl px-2.5 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
                <div className="col-span-2 flex items-center gap-1">
                  <input type="number" value={r.pct} onChange={e => updateRow(i, 'pct', e.target.value)}
                    className="w-full bg-[#F3F3F3] rounded-xl px-2 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-center" />
                </div>
                <div className="col-span-2 text-sm text-[#6B7A90] font-medium text-right">
                  {contractTotal ? fmt(Math.round(Number(contractTotal) * Number(r.pct || 0) / 100)) : '—'}
                </div>
                <select value={r.phase_trigger || 'end'} onChange={e => updateRow(i, 'phase_trigger', e.target.value)}
                  className="col-span-2 bg-[#F3F3F3] rounded-xl px-1 py-2 text-[11px] text-[#6B7A90] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
                  <option value="end">End</option>
                  <option value="start">Start</option>
                </select>
                <button onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                  className="col-span-1 text-[#6B7A90] hover:text-red-500 transition flex justify-center">
                  <X size={14} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setRows(prev => [...prev, { name: 'Additional Payment', pct: 0 }])}
              className="text-xs text-[#091426] hover:text-[#091426] font-medium flex items-center gap-1">
              <Plus size={12} strokeWidth={1.8} /> Add Row
            </button>
            <span className={`text-xs font-semibold ${totalPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              Total: {totalPct}%
            </span>
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-[#E2E8F0]">
          <button onClick={() => onSave({ projectId, contractTotal, rows })}
            disabled={!projectId || !contractTotal}
            className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
            Create {rows.length} Payments
          </button>
          <button onClick={onClose} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F8F9FC] transition-all">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── שורת תשלום בודדת ──
function PaymentRow({ payment, project, clients, onEdit, onStatusChange, onTermsChange, onDelete, onSendEmail, logs, onAddLog, expandedLog, onToggleLog }) {
  const cls = classifyPayment(payment)
  const due = calcDueDate(payment)
  const overdue = isOverdue(payment)
  const [logText, setLogText] = useState('')

  // צ'יפ סטטוס
  const chipStyle = cls === 'paid'
    ? 'bg-emerald-50 text-emerald-700'
    : cls === 'future'
    ? 'bg-[#F3F3F3] text-[#6B7A90]'
    : cls === 'pending_approval'
    ? 'bg-violet-50 text-violet-700'
    : cls === 'sent'
    ? 'bg-blue-50 text-blue-600'
    : overdue
    ? 'bg-red-50 text-red-600'
    : 'bg-amber-50 text-amber-700'

  // שקיפות לשורות עתידיות
  const rowOpacity = cls === 'future' ? 'opacity-60' : ''

  return (
    <div className={`${rowOpacity} ${overdue ? 'bg-red-50/40' : ''}`}>
      <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3.5 border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8F9FC] transition-colors group flex-wrap`}>
        {/* שם השלב */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${cls === 'paid' ? 'line-through text-[#6B7A90]' : 'text-[#091426]'}`}>
            {payment.name}
          </p>
        </div>

        {/* סכום */}
        <span className={`text-sm font-bold shrink-0 min-w-[80px] text-right ${cls === 'paid' ? 'text-emerald-600' : 'text-[#091426]'}`}>
          {fmt(payment.amount)}
        </span>

        {/* תאריך השלמת שלב */}
        <span className="text-xs text-[#6B7A90] shrink-0 min-w-[80px] text-center">
          {payment.phase_completed_at ? fmtDate(payment.phase_completed_at) : '—'}
          {payment.phase_completed_at && new Date(payment.phase_completed_at) > new Date() && (
            <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-bold">Future date</span>
          )}
        </span>

        {/* תנאי תשלום — דרופדאון */}
        <select
          value={payment.payment_terms_days || 0}
          onChange={e => onTermsChange(payment.id, Number(e.target.value))}
          className="text-xs bg-[#F3F3F3] rounded-lg px-2 py-1.5 border-0 cursor-pointer outline-none shrink-0 focus:ring-2 focus:ring-[#7B5800]/20"
        >
          {TERMS_OPTIONS.map(t => <option key={t.days} value={t.days}>{t.label}</option>)}
        </select>

        {/* תאריך תשלום מחושב */}
        <span className={`text-xs shrink-0 min-w-[80px] text-center ${overdue ? 'text-red-500 font-bold' : 'text-[#6B7A90]'}`}>
          {due ? fmtDate(due) : '—'}
        </span>

        {/* סטטוס — תמיד ניתן לשינוי */}
        <select
          value={payment.status || 'pending'}
          onChange={e => onStatusChange(payment.id, e.target.value)}
          className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider border-0 cursor-pointer outline-none shrink-0 ${chipStyle}`}
        >
          <option value="pending_approval">Pending Approval</option>
          <option value="pending">Current</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="future">Future</option>
        </select>

        {/* פעולות */}
        <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
          {cls === 'pending_approval' && (
            <button onClick={() => onStatusChange(payment.id, 'pending')} title="Approve"
              className="px-2 py-1 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-bold tracking-wider transition">
              Approve
            </button>
          )}
          {cls !== 'future' && cls !== 'paid' && cls !== 'pending_approval' && (
            <button onClick={() => onSendEmail(payment, project)} title="Send email"
              className="p-1.5 rounded-xl hover:bg-[#F3F3F3] text-[#6B7A90] hover:text-[#091426] transition">
              <Send size={13} strokeWidth={1.8} />
            </button>
          )}
          <button onClick={() => onToggleLog(payment.id)} title="Activity log"
            className="p-1.5 rounded-xl hover:bg-[#F3F3F3] text-[#6B7A90] hover:text-[#091426] transition">
            <MessageSquare size={13} strokeWidth={1.8} />
          </button>
          <button onClick={() => onEdit(payment)}
            className="p-1.5 rounded-xl hover:bg-[#F3F3F3] text-[#6B7A90] hover:text-[#091426] transition text-xs font-medium">
            Edit
          </button>
          <button onClick={() => onDelete(payment.id)}
            className="p-1.5 rounded-xl hover:bg-red-50 text-[#6B7A90] hover:text-red-500 transition">
            <X size={13} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* יומן פעילות — מתרחב */}
      {expandedLog && (
        <div className="px-4 py-3 bg-[#FAFAFA] border-b border-[#E2E8F0]">
          <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
            {(!logs || logs.length === 0) && (
              <p className="text-xs text-[#6B7A90] italic">No activity yet</p>
            )}
            {(logs || []).map(log => (
              <div key={log.id} className="flex gap-2 text-xs">
                <span className="text-[#6B7A90] shrink-0">{fmtDate(log.created_at)}</span>
                <span className="text-[#091426]">{log.note}</span>
              </div>
            ))}
          </div>
          {/* הוספת הערה ידנית */}
          <div className="flex gap-2">
            <input
              value={logText}
              onChange={e => setLogText(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-white rounded-lg px-3 py-1.5 text-xs border border-[#E2E8F0] focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20"
              onKeyDown={e => { if (e.key === 'Enter' && logText.trim()) { onAddLog(payment.id, logText.trim()); setLogText('') } }}
            />
            <button
              onClick={() => { if (logText.trim()) { onAddLog(payment.id, logText.trim()); setLogText('') } }}
              className="bg-[#091426] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#1E293B] transition"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── עמוד ראשי ──
export default function Billing() {
  const [payments, setPayments]         = useState([])
  const [projects, setProjects]         = useState([])
  const [clients, setClients]           = useState({})
  const [paymentLogs, setPaymentLogs]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [showNew, setShowNew]           = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [searchQuery, setSearchQuery]     = useState('')
  const [collapsed, setCollapsed]       = useState({})
  const [expandedLogs, setExpandedLogs] = useState({})
  // מודאל מייל
  const [emailModal, setEmailModal]     = useState(null)
  const [emailTo, setEmailTo]           = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody]       = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  // קבצים מצורפים למייל
  const [attachedFiles, setAttachedFiles] = useState([])
  const [uploadingFile, setUploadingFile] = useState(false)
  // הודעת הצלחה
  const [toast, setToast] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: pay }, { data: proj }, { data: logs }] = await Promise.all([
      supabase.from('payments').select('*').order('due_date'),
      supabase.from('projects').select('id, name, client_id, clients(name, email)').order('name'),
      supabase.from('payment_logs').select('*').order('created_at', { ascending: false }),
    ])
    setPayments(pay || [])
    setProjects(proj || [])
    setPaymentLogs(logs || [])
    setClients((proj || []).reduce((map, p) => { if (p.clients) map[p.id] = p.clients; return map }, {}))
    setLoading(false)
  }

  async function savePayment(form) {
    if (editItem?.id) {
      await supabase.from('payments').update(form).eq('id', editItem.id)
    } else {
      await supabase.from('payments').insert(form)
    }
    setShowNew(false)
    setEditItem(null)
    fetchAll()
  }

  async function saveTemplate({ projectId, contractTotal, rows }) {
    const items = rows.map(r => ({
      project_id: projectId,
      name:       r.name,
      phase_name: r.name,
      pct:        Number(r.pct),
      amount:     Math.round(Number(contractTotal) * Number(r.pct) / 100),
      status:     'pending',
      payment_terms_days: 0,
      phase_trigger: r.phase_trigger || 'end',
    }))
    await supabase.from('payments').insert(items)
    setShowTemplate(false)
    fetchAll()
  }

  // שינוי סטטוס תשלום + רישום ביומן
  async function updateStatus(id, status) {
    const updates = { status }
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
    }
    await supabase.from('payments').update(updates).eq('id', id)

    // רישום ביומן
    const logNote = status === 'paid'
      ? 'Marked as paid'
      : status === 'sent'
      ? 'Payment request sent'
      : status === 'pending'
      ? 'Approved — ready to bill'
      : status === 'pending_approval'
      ? 'Phase completed — pending approval'
      : `Status changed to ${status}`
    await supabase.from('payment_logs').insert({ payment_id: id, note: logNote })

    fetchAll()
  }

  // עדכון תנאי תשלום
  async function updateTerms(id, days) {
    await supabase.from('payments').update({ payment_terms_days: days }).eq('id', id)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, payment_terms_days: days } : p))
  }

  // הוספת הערה ידנית ליומן
  async function addLogEntry(paymentId, note) {
    await supabase.from('payment_logs').insert({ payment_id: paymentId, note })
    fetchAll()
  }

  async function deletePayment(id) {
    if (!window.confirm('Are you sure? This cannot be undone.')) return
    await supabase.from('payments').delete().eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  function toggleLog(paymentId) {
    setExpandedLogs(prev => ({ ...prev, [paymentId]: !prev[paymentId] }))
  }

  function sendEmail(payment, project) {
    const client = clients[project?.id]
    const due = calcDueDate(payment)
    const amountBeforeVat = Number(payment.amount || 0)
    const vat = Math.round(amountBeforeVat * VAT_RATE)
    const totalWithVat = amountBeforeVat + vat
    setEmailTo(client?.email || '')
    setEmailSubject(`Payment Request: ${payment.name} — ${project?.name || ''}`)
    setEmailBody(`Hi ${client?.name || 'Client'},

Hope that you are doing well.

This email concerns the payment for ${payment.name}.

Details:
- Amount before VAT: ${fmt(amountBeforeVat)}
- VAT (${Math.round(VAT_RATE * 100)}%): ${fmt(vat)}
- Total including VAT: ${fmt(totalWithVat)}
- Due date: ${due ? fmtDate(due) : 'Upon receipt'}

THANKS!`)
    setEmailModal(payment)
  }

  async function confirmSendEmail() {
    if (!emailTo || !emailModal) return
    setSendingEmail(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
              <img src="https://yaelsiso.vercel.app/yael-logo.jpeg" alt="Yael Siso" style="height: 40px; margin-bottom: 16px;">
              <h2 style="color: #091426; font-size: 18px; margin-bottom: 16px;">Payment Request</h2>
              <div style="color: #333; font-size: 14px; white-space: pre-line; margin-bottom: 24px;">${emailBody}</div>
              <p style="color: #B8960B; font-size: 11px; margin-top: 32px; letter-spacing: 2px; text-transform: uppercase;">Yael Siso — Interior Design</p>
            </div>
          `,
          ...(attachedFiles.length > 0 ? { attachments: attachedFiles.map(f => ({ name: f.name, dataUrl: f.dataUrl })) } : {}),
        }),
      })
      if (res.ok) {
        // עדכון סטטוס ל-sent + רישום ביומן
        const client = clients[projects.find(p => p.id === emailModal.project_id)?.id]
        await updateStatus(emailModal.id, 'sent')
        await supabase.from('payment_logs').insert({
          payment_id: emailModal.id,
          note: `Payment request sent to ${emailTo}`
        })
        setToast('Email sent successfully')
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast('Failed to send email')
        setTimeout(() => setToast(null), 3000)
      }
    } catch (e) {
      setToast('Failed to send email')
      setTimeout(() => setToast(null), 3000)
    }
    setSendingEmail(false)
    await fetchAll()
    setEmailModal(null)
    setAttachedFiles([])
  }

  function exportCSV() {
    const csvRows = [['Project', 'Payment Name', 'Amount', 'Phase Completed', 'Payment Terms', 'Due Date', 'Status', 'Notes']]
    filtered.forEach(p => {
      const proj = projects.find(pr => pr.id === p.project_id)
      const due = calcDueDate(p)
      const termsLabel = TERMS_OPTIONS.find(t => t.days === (p.payment_terms_days || 0))?.label || 'Immediate'
      csvRows.push([
        proj?.name || '', p.name, p.amount || '',
        p.phase_completed_at || '', termsLabel,
        due ? due.toISOString().split('T')[0] : '',
        classifyPayment(p), p.notes || ''
      ])
    })
    const csv  = csvRows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'billing.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // סינון לפי סטטוס, פרויקט, וחיפוש
  const filtered = useMemo(() => {
    return payments.filter(p => {
      // סינון פרויקט
      if (filterProject && p.project_id !== filterProject) return false
      // סינון סטטוס
      if (filterStatus) {
        const cls = classifyPayment(p)
        if (filterStatus !== cls) return false
      }
      // חיפוש לפי שם
      if (searchQuery && !p.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [payments, filterProject, filterStatus, searchQuery])

  // קיבוץ לפי פרויקט
  const byProject = useMemo(() => {
    const groups = {}
    filtered.forEach(p => {
      if (!groups[p.project_id]) groups[p.project_id] = []
      groups[p.project_id].push(p)
    })
    return groups
  }, [filtered])

  // KPIs — מחושבים על כל התשלומים (לא רק מסוננים)
  const toCollectNow = payments
    .filter(p => classifyPayment(p) === 'current')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + Number(p.amount || 0), 0)

  const overdueCount = payments
    .filter(p => isOverdue(p))
    .length

  // כמה תשלומים ממתינים לאישור
  const pendingApprovalCount = payments
    .filter(p => p.status === 'pending_approval')
    .length

  // יומנים לפי payment_id
  const logsByPayment = useMemo(() => {
    const map = {}
    paymentLogs.forEach(l => {
      if (!map[l.payment_id]) map[l.payment_id] = []
      map[l.payment_id].push(l)
    })
    return map
  }, [paymentLogs])

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Client Billing</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">{payments.length} payments in system</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 bg-[#F3F3F3] text-[#6B7A90] px-3 py-2 rounded-xl text-sm hover:bg-[#F8F9FC] transition-all">
            <Download size={14} strokeWidth={1.8} /> Download CSV
          </button>
          <button onClick={() => setShowTemplate(true)}
            className="bg-[#F3F3F3] text-[#091426] px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#F8F9FC] transition-all flex items-center gap-1.5">
            <Plus size={14} strokeWidth={1.8} /> Project Template
          </button>
          <button onClick={() => { setEditItem(null); setShowNew(true) }}
            className="bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-1.5">
            <Plus size={14} strokeWidth={1.8} /> Single Payment
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 text-center">
          <div className="text-xl font-bold text-violet-600">{pendingApprovalCount}</div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">Pending Approval</div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 text-center">
          <div className="text-xl font-bold text-[#091426]">{fmt(toCollectNow)}</div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">To Collect Now</div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 text-center">
          <div className="text-xl font-bold text-emerald-600">{fmt(totalPaid)}</div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">Paid</div>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 text-center">
          <div className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-500' : 'text-[#6B7A90]'}`}>{overdueCount}</div>
          <div className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">Overdue</div>
        </div>
      </div>

      {/* סרגל סינון */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          <option value="">All</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="current">Current</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="future">Future</option>
        </select>
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search payment name..."
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 min-w-[180px]"
        />
      </div>

      {/* כותרת טבלה */}
      {filtered.length > 0 && (
        <div className="hidden sm:flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">
          <div className="flex-1">Phase</div>
          <div className="min-w-[80px] text-right">Amount</div>
          <div className="min-w-[80px] text-center">Completed</div>
          <div className="min-w-[90px] text-center">Terms</div>
          <div className="min-w-[80px] text-center">Due Date</div>
          <div className="min-w-[70px] text-center">Status</div>
          <div className="min-w-[100px]"></div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center text-3xl mb-4">
            <FileText size={28} className="text-[#6B7A90]" />
          </div>
          <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">No payments yet</h3>
          <p className="text-sm text-[#6B7A90] mb-5">Create a billing template for a project or add a single payment</p>
          <button onClick={() => setShowTemplate(true)}
            className="bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
            + Project Template
          </button>
        </div>
      )}

      {/* רשימה מקובצת לפי פרויקט */}
      <div className="space-y-3">
        {Object.entries(byProject).map(([projectId, pms]) => {
          const project   = projects.find(p => p.id === projectId)
          const client    = clients[projectId]
          const projPaid  = pms.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
          const projTotal = pms.reduce((s, p) => s + Number(p.amount || 0), 0)
          const projRemaining = projTotal - projPaid
          const isOpen    = collapsed[projectId] !== true

          return (
            <div key={projectId} className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
              <button onClick={() => setCollapsed(prev => ({ ...prev, [projectId]: !prev[projectId] }))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#F8F9FC] hover:bg-[#F3F3F3] transition-colors border-b border-[#E2E8F0]">
                {isOpen ? <ChevronDown size={14} className="text-[#6B7A90]" strokeWidth={1.8} /> : <ChevronRight size={14} className="text-[#6B7A90]" strokeWidth={1.8} />}
                <div className="flex-1 text-left">
                  <span className="font-semibold text-[#091426] text-sm">
                    {project?.name || 'Unknown Project'}
                  </span>
                  {client?.name && (
                    <span className="text-xs text-[#6B7A90] ml-2">{client.name}</span>
                  )}
                </div>
                <div className="text-xs text-[#6B7A90] shrink-0 flex items-center gap-2">
                  <span>{fmt(projPaid)} / {fmt(projTotal)}</span>
                  <span className="text-[10px]">({fmt(projRemaining)} left)</span>
                </div>
                <div className="w-24 bg-[#F3F3F3] rounded-full h-1.5 shrink-0">
                  <div className="h-1.5 rounded-full bg-emerald-400 transition-all"
                    style={{ width: projTotal ? `${Math.round(projPaid / projTotal * 100)}%` : '0%' }} />
                </div>
              </button>

              {isOpen && pms.map(payment => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  project={project}
                  clients={clients}
                  onEdit={item => { setEditItem(item); setShowNew(true) }}
                  onStatusChange={updateStatus}
                  onTermsChange={updateTerms}
                  onDelete={deletePayment}
                  onSendEmail={sendEmail}
                  logs={logsByPayment[payment.id] || []}
                  onAddLog={addLogEntry}
                  expandedLog={expandedLogs[payment.id]}
                  onToggleLog={toggleLog}
                />
              ))}
            </div>
          )
        })}
      </div>

      {showNew && (
        <PaymentModal
          onClose={() => { setShowNew(false); setEditItem(null) }}
          onSave={savePayment}
          projects={projects}
          editItem={editItem}
        />
      )}
      {showTemplate && (
        <TemplateModal
          onClose={() => setShowTemplate(false)}
          onSave={saveTemplate}
          projects={projects}
        />
      )}

      {/* מודאל מייל גבייה */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setEmailModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#091426] font-[Manrope]">Send Payment Request</h3>
              <button onClick={() => setEmailModal(null)} className="text-[#6B7A90] hover:text-[#091426] transition"><X size={16} strokeWidth={1.8} /></button>
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
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8}
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 resize-none" />
              </div>
              {/* קבצים מצורפים */}
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1">Attachments</label>
                {attachedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-[#F3F3F3] rounded-lg px-3 py-1.5 mb-1.5 text-xs">
                    <span className="flex-1 truncate">{f.name}</span>
                    <button onClick={() => setAttachedFiles(prev => prev.filter((_, j) => j !== i))}
                      className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  </div>
                ))}
                <label className={`inline-flex items-center gap-1.5 text-xs text-[#7B5800] font-medium cursor-pointer hover:underline ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploadingFile ? 'Uploading...' : '+ Add File'}
                  <input type="file" className="hidden" onChange={e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return }
                    setUploadingFile(true)
                    const reader = new FileReader()
                    reader.onload = () => { setAttachedFiles(prev => [...prev, { name: file.name, dataUrl: reader.result }]); setUploadingFile(false) }
                    reader.readAsDataURL(file)
                    e.target.value = ''
                  }} />
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#E2E8F0] flex gap-2">
              <button onClick={() => setEmailModal(null)}
                className="flex-1 bg-[#F3F3F3] text-[#091426] py-2.5 rounded-xl text-sm font-medium hover:bg-[#E8E8E8] transition">
                Cancel
              </button>
              <button onClick={confirmSendEmail} disabled={sendingEmail || !emailTo}
                className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition disabled:opacity-50">
                {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* הודעת הצלחה/שגיאה */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toast.includes('Failed') ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast}
        </div>
      )}
    </div>
  )
}
