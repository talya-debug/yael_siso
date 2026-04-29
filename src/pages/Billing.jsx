import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Send, CheckCircle2, Clock, AlertCircle, Circle, Download, ChevronDown, ChevronRight } from 'lucide-react'

// תבנית ברירת מחדל — 4 תשלומים לפי אבני דרך
const DEFAULT_MILESTONES = [
  { name: 'Advance Payment',       pct: 30 },
  { name: 'Layout Approval',       pct: 20 },
  { name: 'Working Drawings',      pct: 30 },
  { name: 'Project Completion',    pct: 20 },
]

const STATUS_META = {
  pending: { label: 'Future',    color: 'bg-[#F3F3F3] text-[#6B7A90]',     Icon: Circle },
  sent:    { label: 'Current',   color: 'bg-amber-50 text-amber-700',     Icon: Clock },
  paid:    { label: 'Paid',      color: 'bg-emerald-50 text-emerald-700', Icon: CheckCircle2 },
  overdue: { label: 'Overdue',   color: 'bg-red-50 text-red-600',        Icon: AlertCircle },
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('en-US', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── מודאל תשלום בודד ──
function PaymentModal({ onClose, onSave, projects, editItem }) {
  const [form, setForm] = useState(editItem || {
    project_id: '', name: '', amount: '', pct: '', due_date: '', status: 'pending', notes: ''
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
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
            <label className={lbl}>Due Date</label>
            <input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inp}>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="Additional details..." className={inp + ' resize-none'} />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
          <button onClick={() => onSave(form)}
            disabled={!form.project_id || !form.name || !form.amount}
            className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
            Save
          </button>
          <button onClick={onClose} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
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
              <span className="col-span-6">Milestone</span>
              <span className="col-span-2 text-center">%</span>
              <span className="col-span-3 text-right">Amount</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.name} onChange={e => updateRow(i, 'name', e.target.value)}
                  className="col-span-6 bg-[#F3F3F3] rounded-xl px-2.5 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
                <div className="col-span-2 flex items-center gap-1">
                  <input type="number" value={r.pct} onChange={e => updateRow(i, 'pct', e.target.value)}
                    className="w-full bg-[#F3F3F3] rounded-xl px-2 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 text-center" />
                </div>
                <div className="col-span-3 text-sm text-[#6B7A90] font-medium text-right">
                  {contractTotal ? fmt(Math.round(Number(contractTotal) * Number(r.pct || 0) / 100)) : '—'}
                </div>
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
              Total: {totalPct}% {totalPct !== 100 ? '⚠ Should be 100%' : '✓'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
          <button onClick={() => onSave({ projectId, contractTotal, rows })}
            disabled={!projectId || !contractTotal}
            className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
            Create {rows.length} Payments
          </button>
          <button onClick={onClose} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── שורת תשלום ──
function PaymentRow({ payment, project, onEdit, onStatusChange, onDelete, onSendEmail }) {
  const meta     = STATUS_META[payment.status] || STATUS_META.pending
  const { Icon } = meta
  const isOverdue = payment.due_date && new Date(payment.due_date) < new Date() && payment.status !== 'paid'

  return (
    <div className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3.5 border-b border-[#F3F3F3] last:border-0 hover:bg-[#F9F9F9] transition-colors group flex-wrap ${isOverdue ? 'bg-red-50/30' : ''}`}>
      <button onClick={() => onStatusChange(payment.id, payment.status === 'paid' ? 'pending' : 'paid')} className="shrink-0">
        <Icon size={16} strokeWidth={1.8} className={
          payment.status === 'paid'    ? 'text-emerald-500' :
          payment.status === 'overdue' ? 'text-red-500' :
          payment.status === 'sent'    ? 'text-amber-500' :
          'text-[#6B7A90] hover:text-[#091426]'
        } />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${payment.status === 'paid' ? 'line-through text-[#6B7A90]' : 'text-[#091426]'}`}>
          {payment.name}
        </p>
        {project && <p className="text-xs text-[#6B7A90] truncate">{project.name}</p>}
      </div>
      <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-semibold' : 'text-[#6B7A90]'}`}>
        {fmtDate(payment.due_date)}
      </span>
      <span className={`text-sm font-bold shrink-0 min-w-[90px] text-right ${payment.status === 'paid' ? 'text-emerald-600' : 'text-[#091426]'}`}>
        {fmt(payment.amount)}
      </span>
      <select value={payment.status} onChange={e => onStatusChange(payment.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider border-0 cursor-pointer outline-none shrink-0 ${meta.color}`}>
        {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition shrink-0">
        <button onClick={() => onSendEmail(payment, project)} title="Send email"
          className="p-1.5 rounded-xl hover:bg-[#F3F3F3] text-[#6B7A90] hover:text-[#091426] transition">
          <Send size={13} strokeWidth={1.8} />
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
  )
}

// ── עמוד ראשי ──
export default function Billing() {
  const [payments, setPayments]         = useState([])
  const [projects, setProjects]         = useState([])
  const [loading, setLoading]           = useState(true)
  const [showNew, setShowNew]           = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [editItem, setEditItem]         = useState(null)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus, setFilterStatus]   = useState('')
  const [collapsed, setCollapsed]       = useState({})

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: pay }, { data: proj }] = await Promise.all([
      supabase.from('payments').select('*').order('due_date'),
      supabase.from('projects').select('id, name').order('name'),
    ])
    setPayments(pay || [])
    setProjects(proj || [])
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
      pct:        Number(r.pct),
      amount:     Math.round(Number(contractTotal) * Number(r.pct) / 100),
      status:     'pending',
    }))
    await supabase.from('payments').insert(items)
    setShowTemplate(false)
    fetchAll()
  }

  async function updateStatus(id, status) {
    const paid_at = status === 'paid' ? new Date().toISOString() : null
    await supabase.from('payments').update({ status, paid_at }).eq('id', id)
    setPayments(prev => prev.map(p => p.id === id ? { ...p, status, paid_at } : p))
  }

  async function deletePayment(id) {
    await supabase.from('payments').delete().eq('id', id)
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  function sendEmail(payment, project) {
    const subject = encodeURIComponent(`Payment Required: ${payment.name} — ${project?.name || ''}`)
    const body    = encodeURIComponent(
      `Hello,\n\nAs agreed, we would like to arrange the payment "${payment.name}" of ${fmt(payment.amount)}.\n\nDue date: ${fmtDate(payment.due_date)}\n\nThank you,\nYael Siso Interior Design`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  function exportCSV() {
    const rows = [['Project', 'Payment Name', 'Amount', 'Percentage', 'Due Date', 'Status', 'Notes']]
    filtered.forEach(p => {
      const proj = projects.find(pr => pr.id === p.project_id)
      rows.push([proj?.name || '', p.name, p.amount || '', p.pct || '', p.due_date || '', STATUS_META[p.status]?.label || '', p.notes || ''])
    })
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'billing.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // סינון
  const filtered = payments.filter(p =>
    (!filterProject || p.project_id === filterProject) &&
    (!filterStatus  || p.status === filterStatus)
  )

  // קיבוץ לפי פרויקט
  const byProject = {}
  filtered.forEach(p => {
    if (!byProject[p.project_id]) byProject[p.project_id] = []
    byProject[p.project_id].push(p)
  })

  // KPIs
  const totalExpected = payments.filter(p => p.status !== 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
  const totalPaid     = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
  const overdueCount  = payments.filter(p => p.due_date && new Date(p.due_date) < new Date() && p.status !== 'paid').length

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
            className="flex items-center gap-1.5 bg-[#F3F3F3] text-[#6B7A90] px-3 py-2 rounded-xl text-sm hover:bg-[#F9F9F9] transition-all">
            <Download size={14} strokeWidth={1.8} /> Download CSV
          </button>
          <button onClick={() => setShowTemplate(true)}
            className="bg-[#F3F3F3] text-[#091426] px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#F9F9F9] transition-all flex items-center gap-1.5">
            <Plus size={14} strokeWidth={1.8} /> Project Template
          </button>
          <button onClick={() => { setEditItem(null); setShowNew(true) }}
            className="bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-1.5">
            <Plus size={14} strokeWidth={1.8} /> Single Payment
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Expected Billing',  value: fmt(totalExpected), color: 'text-[#091426]' },
          { label: 'Paid So Far',       value: fmt(totalPaid),     color: 'text-emerald-600' },
          { label: 'Overdue Payments',   value: overdueCount,       color: overdueCount > 0 ? 'text-red-500' : 'text-[#6B7A90]' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 text-center">
            <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* סינון */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center text-3xl mb-4">💳</div>
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
          const projPaid  = pms.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount || 0), 0)
          const projTotal = pms.reduce((s, p) => s + Number(p.amount || 0), 0)
          const isOpen    = collapsed[projectId] !== true

          return (
            <div key={projectId} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
              <button onClick={() => setCollapsed(prev => ({ ...prev, [projectId]: !prev[projectId] }))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#F9F9F9] hover:bg-[#F3F3F3] transition-colors border-b border-[#F3F3F3]">
                {isOpen ? <ChevronDown size={14} className="text-[#6B7A90]" strokeWidth={1.8} /> : <ChevronRight size={14} className="text-[#6B7A90]" strokeWidth={1.8} />}
                <span className="font-semibold text-[#091426] text-sm flex-1 text-left">
                  {project?.name || 'Unknown Project'}
                </span>
                <span className="text-xs text-[#6B7A90] shrink-0">
                  {fmt(projPaid)} / {fmt(projTotal)}
                </span>
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
                  onEdit={item => { setEditItem(item); setShowNew(true) }}
                  onStatusChange={updateStatus}
                  onDelete={deletePayment}
                  onSendEmail={sendEmail}
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
    </div>
  )
}
