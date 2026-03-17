import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Send, CheckCircle2, Clock, AlertCircle, Circle, Download, ChevronDown, ChevronRight } from 'lucide-react'

// תבנית ברירת מחדל — 4 תשלומים לפי אבני דרך
const DEFAULT_MILESTONES = [
  { name: 'מקדמה',                pct: 30 },
  { name: 'אישור תוכנית העמדה',  pct: 20 },
  { name: 'תוכניות עבודה',        pct: 30 },
  { name: 'סיום פרויקט',          pct: 20 },
]

const STATUS_META = {
  pending: { label: 'ממתין',    color: 'bg-slate-100 text-slate-500',     Icon: Circle },
  sent:    { label: 'נשלח',     color: 'bg-amber-100 text-amber-700',     Icon: Clock },
  paid:    { label: 'שולם ✓',   color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  overdue: { label: 'באיחור',   color: 'bg-red-100 text-red-600',        Icon: AlertCircle },
}

function fmt(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── מודאל תשלום בודד ──
function PaymentModal({ onClose, onSave, projects, editItem }) {
  const [form, setForm] = useState(editItem || {
    project_id: '', name: '', amount: '', pct: '', due_date: '', status: 'pending', notes: ''
  })
  const [contractTotal, setContractTotal] = useState('')

  // חישוב סכום לפי אחוז
  useEffect(() => {
    if (form.pct && contractTotal) {
      setForm(p => ({ ...p, amount: Math.round(Number(contractTotal) * Number(form.pct) / 100) }))
    }
  }, [form.pct, contractTotal])

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
  const lbl = "text-xs font-semibold text-slate-500 block mb-1"

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">{editItem ? 'עריכת תשלום' : 'תשלום חדש'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={lbl}>פרויקט *</label>
            <select value={form.project_id} onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))} className={inp}>
              <option value="">בחרי פרויקט...</option>
              {projects.map(pr => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>שם / אבן דרך *</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="מקדמה / אישור תוכנית העמדה..." className={inp} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>סה"כ חוזה (לחישוב %)</label>
              <input type="number" value={contractTotal} onChange={e => setContractTotal(e.target.value)}
                placeholder="100000" className={inp} />
            </div>
            <div>
              <label className={lbl}>אחוז מהחוזה</label>
              <input type="number" value={form.pct} onChange={e => setForm(p => ({ ...p, pct: e.target.value }))}
                placeholder="30" className={inp} />
            </div>
          </div>
          <div>
            <label className={lbl}>סכום לתשלום (₪) *</label>
            <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
              placeholder="30000" className={inp} />
          </div>
          <div>
            <label className={lbl}>תאריך יעד</label>
            <input type="date" value={form.due_date || ''} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className={inp} />
          </div>
          <div>
            <label className={lbl}>סטטוס</label>
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className={inp}>
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>הערות</label>
            <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              rows={2} placeholder="פרטים נוספים..." className={inp + ' resize-none'} />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={() => onSave(form)}
            disabled={!form.project_id || !form.name || !form.amount}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40">
            שמור
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">יצירת תבנית גבייה לפרויקט</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">פרויקט *</label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                <option value="">בחרי...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">סה"כ חוזה (₪) *</label>
              <input type="number" value={contractTotal} onChange={e => setContractTotal(e.target.value)}
                placeholder="100000"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 px-1">
              <span className="col-span-6">אבן דרך</span>
              <span className="col-span-2 text-center">%</span>
              <span className="col-span-3 text-left">סכום</span>
            </div>
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input value={r.name} onChange={e => updateRow(i, 'name', e.target.value)}
                  className="col-span-6 border border-slate-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-indigo-400" />
                <div className="col-span-2 flex items-center gap-1">
                  <input type="number" value={r.pct} onChange={e => updateRow(i, 'pct', e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-indigo-400 text-center" />
                </div>
                <div className="col-span-3 text-sm text-slate-500 font-medium">
                  {contractTotal ? fmt(Math.round(Number(contractTotal) * Number(r.pct || 0) / 100)) : '—'}
                </div>
                <button onClick={() => setRows(prev => prev.filter((_, idx) => idx !== i))}
                  className="col-span-1 text-slate-300 hover:text-red-500 transition flex justify-center">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button onClick={() => setRows(prev => [...prev, { name: 'תשלום נוסף', pct: 0 }])}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
              <Plus size={12} /> הוסף שורה
            </button>
            <span className={`text-xs font-semibold ${totalPct === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
              סה"כ: {totalPct}% {totalPct !== 100 ? '⚠ אמור להיות 100%' : '✓'}
            </span>
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={() => onSave({ projectId, contractTotal, rows })}
            disabled={!projectId || !contractTotal}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40">
            צור {rows.length} תשלומים
          </button>
          <button onClick={onClose} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">ביטול</button>
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
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition group ${isOverdue ? 'bg-red-50/30' : ''}`}>
      <button onClick={() => onStatusChange(payment.id, payment.status === 'paid' ? 'pending' : 'paid')} className="shrink-0">
        <Icon size={16} className={
          payment.status === 'paid'    ? 'text-emerald-500' :
          payment.status === 'overdue' ? 'text-red-500' :
          payment.status === 'sent'    ? 'text-amber-500' :
          'text-slate-300 hover:text-indigo-400'
        } />
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${payment.status === 'paid' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
          {payment.name}
        </p>
        {project && <p className="text-xs text-slate-400 truncate">{project.name}</p>}
      </div>
      <span className={`text-xs shrink-0 ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
        {fmtDate(payment.due_date)}
      </span>
      <span className={`text-sm font-bold shrink-0 min-w-[90px] text-left ${payment.status === 'paid' ? 'text-emerald-600' : 'text-slate-700'}`}>
        {fmt(payment.amount)}
      </span>
      <select value={payment.status} onChange={e => onStatusChange(payment.id, e.target.value)}
        onClick={e => e.stopPropagation()}
        className={`text-xs px-2.5 py-1 rounded-full font-medium border-0 cursor-pointer outline-none shrink-0 ${meta.color}`}>
        {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
      </select>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
        <button onClick={() => onSendEmail(payment, project)} title="שלח מייל"
          className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition">
          <Send size={13} />
        </button>
        <button onClick={() => onEdit(payment)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition text-xs font-medium">
          עריכה
        </button>
        <button onClick={() => onDelete(payment.id)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition">
          <X size={13} />
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
    const subject = encodeURIComponent(`תשלום נדרש: ${payment.name} — ${project?.name || ''}`)
    const body    = encodeURIComponent(
      `שלום,\n\nלפי הסכמנו, נבקש לסדר את תשלום "${payment.name}" בסך ${fmt(payment.amount)}.\n\nתאריך יעד: ${fmtDate(payment.due_date)}\n\nבתודה,\nMotiv Interior Design`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  function exportCSV() {
    const rows = [['פרויקט', 'שם תשלום', 'סכום', 'אחוז', 'תאריך יעד', 'סטטוס', 'הערות']]
    filtered.forEach(p => {
      const proj = projects.find(pr => pr.id === p.project_id)
      rows.push([proj?.name || '', p.name, p.amount || '', p.pct || '', p.due_date || '', STATUS_META[p.status]?.label || '', p.notes || ''])
    })
    const csv  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'גבייה.csv'; a.click()
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

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">גבייה מלקוחות</h1>
          <p className="text-sm text-slate-400 mt-0.5">{payments.length} תשלומים במערכת</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 border border-slate-200 text-slate-600 px-3 py-2 rounded-xl text-sm hover:bg-slate-50 transition">
            <Download size={14} /> ייצוא Excel
          </button>
          <button onClick={() => setShowTemplate(true)}
            className="border border-indigo-200 text-indigo-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-indigo-50 transition flex items-center gap-1.5">
            <Plus size={14} /> תבנית לפרויקט
          </button>
          <button onClick={() => { setEditItem(null); setShowNew(true) }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-1.5">
            <Plus size={14} /> תשלום יחיד
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'צפוי לגבייה',  value: fmt(totalExpected), color: 'text-indigo-600' },
          { label: 'שולם עד כה',   value: fmt(totalPaid),     color: 'text-emerald-600' },
          { label: 'תשלומים בפיגור', value: overdueCount,     color: overdueCount > 0 ? 'text-red-500' : 'text-slate-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <div className={`text-xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* סינון */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">כל הפרויקטים</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 bg-white">
          <option value="">כל הסטטוסים</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">💳</div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">אין תשלומים עדיין</h3>
          <p className="text-sm text-slate-400 mb-5">צרי תבנית גבייה לפרויקט או הוסיפי תשלום יחיד</p>
          <button onClick={() => setShowTemplate(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
            + תבנית לפרויקט
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
            <div key={projectId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button onClick={() => setCollapsed(prev => ({ ...prev, [projectId]: !prev[projectId] }))}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100/80 transition border-b border-slate-100">
                {isOpen ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <span className="font-semibold text-slate-700 text-sm flex-1 text-right">
                  {project?.name || 'פרויקט לא ידוע'}
                </span>
                <span className="text-xs text-slate-400 shrink-0">
                  {fmt(projPaid)} / {fmt(projTotal)}
                </span>
                <div className="w-24 bg-slate-200 rounded-full h-1.5 shrink-0">
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
