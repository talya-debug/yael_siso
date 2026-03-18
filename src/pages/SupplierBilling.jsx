import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Pencil, Save, TrendingUp, Clock, CheckCircle, DollarSign, Download } from 'lucide-react'

const STATUS = {
  pending: { label: 'ממתין',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  paid:    { label: 'שולם',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
}

// ── מודאל הוספה/עריכה ──
function EntryModal({ entry, suppliers, projects, onClose, onSaved }) {
  const isEdit = !!entry?.id
  const [form, setForm] = useState({
    supplier_id: '',
    project_id: '',
    description: '',
    amount: '',
    commission_pct: '',
    status: 'pending',
    payment_date: '',
    ...entry,
    amount:         entry?.amount         ?? '',
    commission_pct: entry?.commission_pct ?? '',
  })

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const commissionAmount = form.amount && form.commission_pct
    ? ((parseFloat(form.amount) * parseFloat(form.commission_pct)) / 100).toFixed(2)
    : null

  async function handleSave() {
    if (!form.supplier_id) { alert('יש לבחור ספק'); return }
    if (!form.amount)       { alert('יש להזין סכום'); return }

    const payload = {
      supplier_id:    form.supplier_id    || null,
      project_id:     form.project_id     || null,
      description:    form.description    || '',
      amount:         parseFloat(form.amount),
      commission_pct: form.commission_pct ? parseFloat(form.commission_pct) : null,
      status:         form.status,
      payment_date:   form.payment_date   || null,
      updated_at:     new Date().toISOString(),
    }

    let data, error
    if (isEdit) {
      ;({ data, error } = await supabase.from('supplier_payments').update(payload).eq('id', entry.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('supplier_payments').insert(payload).select().single())
    }

    if (error) { alert('שגיאה: ' + error.message); return }
    onSaved(data, isEdit)
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
  const lbl = "text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'עריכת תשלום' : 'תשלום חדש לספק'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* ספק */}
          <div>
            <label className={lbl}>ספק *</label>
            <select value={form.supplier_id} onChange={e => set('supplier_id', e.target.value)} className={inp}>
              <option value="">— בחר ספק —</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
            </select>
          </div>

          {/* פרויקט */}
          <div>
            <label className={lbl}>פרויקט (אופציונלי)</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} className={inp}>
              <option value="">— כללי / לא מקושר לפרויקט —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* תיאור */}
          <div>
            <label className={lbl}>תיאור</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="ריהוט סלון, ריצוף חדר שינה..." className={inp} />
          </div>

          {/* סכום + עמלה */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>סכום לספק (₪)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>עמלה (%)</label>
              <input type="number" value={form.commission_pct} onChange={e => set('commission_pct', e.target.value)}
                placeholder="10" min="0" max="100" className={inp} />
            </div>
          </div>

          {/* חישוב עמלה */}
          {commissionAmount && (
            <div className="bg-indigo-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-indigo-600 font-medium">עמלה צפויה</span>
              <span className="text-lg font-bold text-indigo-700">₪{parseFloat(commissionAmount).toLocaleString('he-IL')}</span>
            </div>
          )}

          {/* סטטוס + תאריך */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>סטטוס</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>תאריך תשלום</label>
              <input type="date" value={form.payment_date || ''} onChange={e => set('payment_date', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={handleSave}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2">
            <Save size={15} /> {isEdit ? 'עדכן' : 'הוסף תשלום'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 transition">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

// ── שורת תשלום ──
function PaymentRow({ payment, supplierName, projectName, onEdit, onDelete, onToggleStatus }) {
  const st = STATUS[payment.status] || STATUS.pending
  const commission = payment.commission_pct
    ? (payment.amount * payment.commission_pct / 100)
    : null

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50 transition group">
      <td className="py-3 px-4 text-sm font-medium text-slate-800">{supplierName}</td>
      <td className="py-3 px-4 text-sm text-slate-500">{projectName || '—'}</td>
      <td className="py-3 px-4 text-sm text-slate-600 max-w-48 truncate">{payment.description || '—'}</td>
      <td className="py-3 px-4 text-sm font-semibold text-slate-800">₪{payment.amount.toLocaleString('he-IL')}</td>
      <td className="py-3 px-4 text-sm">
        {commission !== null
          ? <span className="text-indigo-600 font-medium">₪{commission.toLocaleString('he-IL')} ({payment.commission_pct}%)</span>
          : <span className="text-slate-300">—</span>}
      </td>
      <td className="py-3 px-4">
        <button onClick={() => onToggleStatus(payment)}
          className={`text-xs px-2.5 py-1 rounded-full border font-medium transition hover:opacity-80 ${st.color}`}>
          {st.label}
        </button>
      </td>
      <td className="py-3 px-4 text-sm text-slate-400">
        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('he-IL') : '—'}
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(payment)} className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(payment)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── דף ראשי ──
export default function SupplierBilling() {
  const [payments,  setPayments]  = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [projects,  setProjects]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [filterSup, setFilterSup] = useState('הכל')
  const [filterSt,  setFilterSt]  = useState('הכל')

  useEffect(() => {
    async function load() {
      const [{ data: pay }, { data: sup }, { data: proj }] = await Promise.all([
        supabase.from('supplier_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id,name,category').order('name'),
        supabase.from('projects').select('id,name').order('name'),
      ])
      setPayments(pay || [])
      setSuppliers(sup || [])
      setProjects(proj || [])
      setLoading(false)
    }
    load()
  }, [])

  const supMap  = Object.fromEntries(suppliers.map(s => [s.id, s]))
  const projMap = Object.fromEntries(projects.map(p => [p.id, p]))

  // פילטר
  const filtered = payments.filter(p => {
    const matchSup = filterSup === 'הכל' || p.supplier_id === filterSup
    const matchSt  = filterSt  === 'הכל' || p.status === filterSt
    return matchSup && matchSt
  })

  // KPIs
  const totalPaid       = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const totalPending    = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const totalCommission = payments.reduce((s, p) => s + (p.commission_pct ? p.amount * p.commission_pct / 100 : 0), 0)

  function handleSaved(saved, isEdit) {
    if (isEdit) setPayments(prev => prev.map(p => p.id === saved.id ? saved : p))
    else        setPayments(prev => [saved, ...prev])
    setModal(null)
  }

  async function handleDelete(payment) {
    const sup = supMap[payment.supplier_id]?.name || 'תשלום'
    if (!window.confirm(`למחוק את התשלום ל${sup}?`)) return
    await supabase.from('supplier_payments').delete().eq('id', payment.id)
    setPayments(prev => prev.filter(p => p.id !== payment.id))
  }

  async function handleToggleStatus(payment) {
    const next = payment.status === 'pending' ? 'paid' : 'pending'
    const { data } = await supabase.from('supplier_payments').update({ status: next }).eq('id', payment.id).select().single()
    if (data) setPayments(prev => prev.map(p => p.id === data.id ? data : p))
  }

  // ייצוא CSV
  function exportCSV() {
    const rows = [
      ['ספק','פרויקט','תיאור','סכום','עמלה%','עמלה ₪','סטטוס','תאריך'],
      ...filtered.map(p => {
        const com = p.commission_pct ? (p.amount * p.commission_pct / 100).toFixed(2) : ''
        return [
          supMap[p.supplier_id]?.name || '',
          projMap[p.project_id]?.name || '',
          p.description,
          p.amount,
          p.commission_pct || '',
          com,
          STATUS[p.status]?.label || '',
          p.payment_date || '',
        ]
      })
    ]
    const csv = '\uFEFF' + rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    Object.assign(document.createElement('a'), { href: url, download: 'גבייה-ספקים.csv' }).click()
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">טוען...</div>

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">גבייה מספקים</h1>
          <p className="text-sm text-slate-400 mt-0.5">מעקב תשלומים ועמלות ספקים</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 border border-slate-200 bg-white text-slate-600 px-3 py-2.5 rounded-xl text-sm hover:bg-slate-50 transition">
            <Download size={15} /> CSV
          </button>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
            <Plus size={16} /> תשלום חדש
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-500" />
            </div>
            <span className="text-sm text-slate-500">שולם</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">₪{totalPaid.toLocaleString('he-IL')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-amber-500" />
            </div>
            <span className="text-sm text-slate-500">ממתין לתשלום</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">₪{totalPending.toLocaleString('he-IL')}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-indigo-500" />
            </div>
            <span className="text-sm text-slate-500">סה"כ עמלות</span>
          </div>
          <p className="text-2xl font-bold text-indigo-700">₪{totalCommission.toLocaleString('he-IL')}</p>
        </div>
      </div>

      {/* פילטרים */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={filterSup} onChange={e => setFilterSup(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 bg-white">
          <option value="הכל">כל הספקים</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {['הכל', 'pending', 'paid'].map(s => (
          <button key={s} onClick={() => setFilterSt(s)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
              filterSt === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
            }`}>
            {s === 'הכל' ? 'הכל' : STATUS[s]?.label}
          </button>
        ))}

        <span className="text-sm text-slate-400 mr-auto">{filtered.length} רשומות</span>
      </div>

      {/* טבלה */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm">
            {payments.length === 0 ? 'עדיין אין תשלומים — לחצי "תשלום חדש"' : 'לא נמצאו רשומות תואמות'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">ספק</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">פרויקט</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">תיאור</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">סכום</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">עמלה</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">סטטוס</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wide">תאריך</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  supplierName={supMap[p.supplier_id]?.name || '—'}
                  projectName={projMap[p.project_id]?.name}
                  onEdit={pay => setModal(pay)}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* מודאל */}
      {modal && (
        <EntryModal
          entry={modal === 'add' ? null : modal}
          suppliers={suppliers}
          projects={projects}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
