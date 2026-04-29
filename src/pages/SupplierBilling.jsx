import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Pencil, Save, TrendingUp, Clock, CheckCircle, DollarSign, Download, Send, UserPlus } from 'lucide-react'

const STATUS = {
  pending: { label: 'Pending',  color: 'bg-amber-50 text-amber-700' },
  paid:    { label: 'Paid',     color: 'bg-emerald-50 text-emerald-700' },
}

// מייל דרישת עמלה בעברית
function sendCommissionEmail(payment, supplier, project) {
  const commission = payment.commission_pct ? (payment.amount * payment.commission_pct / 100) : 0
  const subject = encodeURIComponent(`דרישת תשלום עמלה — ${project?.name || 'הזמנה'}`)
  const body = encodeURIComponent(
`שלום ${supplier?.name || ''},

בהמשך להזמנה שבוצעה${project ? ` עבור פרויקט "${project.name}"` : ''}${payment.description ? ` (${payment.description})` : ''}, בסך ₪${payment.amount.toLocaleString('he-IL')},

נבקש להעביר את תשלום העמלה בגובה ${payment.commission_pct}% — סה"כ ₪${commission.toLocaleString('he-IL')}.

פרטים:
• סכום ההזמנה: ₪${payment.amount.toLocaleString('he-IL')}
• אחוז עמלה: ${payment.commission_pct}%
• סכום העמלה: ₪${commission.toLocaleString('he-IL')}

נודה להעברה בהקדם.

בברכה,
יעל סיסו — עיצוב פנים`
  )
  const to = supplier?.email ? encodeURIComponent(supplier.email) : ''
  window.open(`mailto:${to}?subject=${subject}&body=${body}`)
}

// ── מודאל הוספה/עריכה ──
function EntryModal({ entry, suppliers: initialSuppliers, projects, onClose, onSaved }) {
  const isEdit = !!entry?.id
  const [suppliers, setSuppliers] = useState(initialSuppliers)
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
  const [showNewSupplier, setShowNewSupplier] = useState(false)
  const [newSupplier, setNewSupplier] = useState({ name: '', commission_pct: '', email: '' })

  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // הוספת ספק חדש ישירות מהטופס
  async function addNewSupplier() {
    if (!newSupplier.name.trim()) return
    const payload = {
      name: newSupplier.name,
      commission_pct: newSupplier.commission_pct ? parseFloat(newSupplier.commission_pct) : null,
      email: newSupplier.email || null,
      category: 'General',
    }
    const { data, error } = await supabase.from('suppliers').insert(payload).select().single()
    if (error) { alert('Error: ' + error.message); return }
    setSuppliers(prev => [...prev, data])
    setForm(p => ({
      ...p,
      supplier_id: data.id,
      commission_pct: data.commission_pct ?? p.commission_pct,
    }))
    setShowNewSupplier(false)
    setNewSupplier({ name: '', commission_pct: '', email: '' })
  }

  const commissionAmount = form.amount && form.commission_pct
    ? ((parseFloat(form.amount) * parseFloat(form.commission_pct)) / 100).toFixed(2)
    : null

  async function handleSave() {
    if (!form.supplier_id) { alert('Please select a supplier'); return }
    if (!form.amount)       { alert('Please enter an amount'); return }

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

    if (error) { alert('Error: ' + error.message); return }
    onSaved(data, isEdit)
  }

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#F3F3F3]">
          <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">{isEdit ? 'Edit Payment' : 'New Supplier Payment'}</h2>
          <button onClick={onClose} className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-xl hover:bg-[#F3F3F3] transition"><X size={18} strokeWidth={1.8} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={lbl}>Supplier *</label>
            <div className="flex gap-2">
              <select value={form.supplier_id} onChange={e => {
                const sup = suppliers.find(s => s.id === e.target.value)
                setForm(p => ({
                  ...p,
                  supplier_id: e.target.value,
                  commission_pct: sup?.commission_pct != null ? sup.commission_pct : p.commission_pct,
                }))
              }} className={inp + ' flex-1'}>
                <option value="">— Select Supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.commission_pct != null ? ` · ${s.commission_pct}%` : ''}</option>)}
              </select>
              <button type="button" onClick={() => setShowNewSupplier(!showNewSupplier)}
                className="shrink-0 w-10 h-10 rounded-xl bg-[#F3F3F3] hover:bg-[#091426] hover:text-white text-[#6B7A90] flex items-center justify-center transition-all"
                title="Add new supplier">
                <UserPlus size={16} strokeWidth={1.8} />
              </button>
            </div>
            {form.supplier_id && !suppliers.find(s => s.id === form.supplier_id)?.commission_pct && (
              <p className="text-xs text-amber-600 mt-1.5">⚠ No commission rate set for this supplier</p>
            )}

            {/* הוספת ספק חדש inline */}
            {showNewSupplier && (
              <div className="mt-3 bg-[#F9F9F9] rounded-xl p-3 space-y-2">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#7B5800]">Quick Add Supplier</p>
                <input value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))}
                  placeholder="Supplier name *" className={inp} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input value={newSupplier.email} onChange={e => setNewSupplier(p => ({ ...p, email: e.target.value }))}
                    placeholder="Email" className={inp} />
                  <input type="number" value={newSupplier.commission_pct} onChange={e => setNewSupplier(p => ({ ...p, commission_pct: e.target.value }))}
                    placeholder="Commission %" className={inp} />
                </div>
                <div className="flex gap-2">
                  <button onClick={addNewSupplier} disabled={!newSupplier.name.trim()}
                    className="bg-[#091426] text-white px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
                    Add Supplier
                  </button>
                  <button onClick={() => setShowNewSupplier(false)}
                    className="text-xs text-[#6B7A90] px-3 py-1.5 rounded-xl hover:bg-[#F3F3F3] transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className={lbl}>Project (optional)</label>
            <select value={form.project_id} onChange={e => set('project_id', e.target.value)} className={inp}>
              <option value="">— General / Not linked to a project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className={lbl}>Description</label>
            <input value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Living room furniture, bedroom flooring..." className={inp} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Amount to Supplier (₪)</label>
              <input type="number" value={form.amount} onChange={e => set('amount', e.target.value)}
                placeholder="0" className={inp} />
            </div>
            <div>
              <label className={lbl}>Commission (%)</label>
              <input type="number" value={form.commission_pct} onChange={e => set('commission_pct', e.target.value)}
                placeholder="10" min="0" max="100" className={inp} />
            </div>
          </div>

          {commissionAmount && (
            <div className="bg-[#F3F3F3] rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[#091426] font-medium">Expected Commission</span>
              <span className="text-lg font-bold text-[#091426]">₪{parseFloat(commissionAmount).toLocaleString('en-US')}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp}>
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Payment Date</label>
              <input type="date" value={form.payment_date || ''} onChange={e => set('payment_date', e.target.value)} className={inp} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-[#F3F3F3]">
          <button onClick={handleSave}
            className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center justify-center gap-2">
            <Save size={15} strokeWidth={1.8} /> {isEdit ? 'Update' : 'Add Payment'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F3F3F3] bg-[#F3F3F3] transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── שורת תשלום ──
function PaymentRow({ payment, supplierName, projectName, supplier, project, onEdit, onDelete, onToggleStatus, onSendEmail }) {
  const st = STATUS[payment.status] || STATUS.pending
  const commission = payment.commission_pct && payment.amount
    ? (payment.amount * payment.commission_pct / 100)
    : 0

  return (
    <tr className="border-b border-[#F3F3F3] hover:bg-[#F9F9F9] transition-colors group">
      <td className="py-3.5 px-4 text-sm font-medium text-[#091426]">{supplierName}</td>
      <td className="py-3.5 px-4 text-sm text-[#6B7A90]">{projectName || '—'}</td>
      <td className="py-3.5 px-4 text-sm text-[#091426] max-w-48 truncate">{payment.description || '—'}</td>
      <td className="py-3.5 px-4 text-sm font-semibold text-[#091426]">₪{payment.amount.toLocaleString('en-US')}</td>
      <td className="py-3.5 px-4 text-sm">
        {commission > 0
          ? <span className="text-[#091426] font-medium">₪{commission.toLocaleString('en-US')} ({payment.commission_pct}%)</span>
          : <span className="text-[#6B7A90]">—</span>}
      </td>
      <td className="py-3.5 px-4">
        <button onClick={() => onToggleStatus(payment)}
          className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wider transition hover:opacity-80 ${st.color}`}>
          {st.label}
        </button>
      </td>
      <td className="py-3.5 px-4 text-sm text-[#6B7A90]">
        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-US') : '—'}
      </td>
      <td className="py-3.5 px-4">
        <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition">
          {commission > 0 && (
            <button onClick={() => onSendEmail(payment)} title="Send commission email"
              className="p-1.5 rounded-xl text-[#6B7A90] hover:text-[#7B5800] hover:bg-amber-50 transition">
              <Send size={13} strokeWidth={1.8} />
            </button>
          )}
          <button onClick={() => onEdit(payment)} className="p-1.5 rounded-xl text-[#6B7A90] hover:text-[#091426] hover:bg-[#F3F3F3] transition">
            <Pencil size={13} strokeWidth={1.8} />
          </button>
          <button onClick={() => onDelete(payment)} className="p-1.5 rounded-xl text-[#6B7A90] hover:text-red-500 hover:bg-red-50 transition">
            <Trash2 size={13} strokeWidth={1.8} />
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
  const [filterSup, setFilterSup] = useState('all')
  const [filterSt,  setFilterSt]  = useState('all')

  useEffect(() => {
    async function load() {
      const [{ data: pay }, { data: sup }, { data: proj }] = await Promise.all([
        supabase.from('supplier_payments').select('*').order('created_at', { ascending: false }),
        supabase.from('suppliers').select('id,name,category,commission_pct,email').order('name'),
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

  const filtered = payments.filter(p => {
    const matchSup = filterSup === 'all' || p.supplier_id === filterSup
    const matchSt  = filterSt  === 'all' || p.status === filterSt
    return matchSup && matchSt
  })

  // KPIs — focused on commissions due to Yael
  const totalCommission     = payments.reduce((s, p) => s + (p.commission_pct ? p.amount * p.commission_pct / 100 : 0), 0)
  const collectedCommission = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.commission_pct ? p.amount * p.commission_pct / 100 : 0), 0)
  const pendingCommission   = payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.commission_pct ? p.amount * p.commission_pct / 100 : 0), 0)

  function handleSaved(saved, isEdit) {
    if (isEdit) setPayments(prev => prev.map(p => p.id === saved.id ? saved : p))
    else        setPayments(prev => [saved, ...prev])
    setModal(null)
  }

  async function handleDelete(payment) {
    const sup = supMap[payment.supplier_id]?.name || 'payment'
    if (!window.confirm(`Delete the payment to ${sup}?`)) return
    await supabase.from('supplier_payments').delete().eq('id', payment.id)
    setPayments(prev => prev.filter(p => p.id !== payment.id))
  }

  async function handleToggleStatus(payment) {
    const next = payment.status === 'pending' ? 'paid' : 'pending'
    const { data } = await supabase.from('supplier_payments').update({ status: next }).eq('id', payment.id).select().single()
    if (data) setPayments(prev => prev.map(p => p.id === data.id ? data : p))
  }

  function exportCSV() {
    const rows = [
      ['Supplier','Project','Description','Amount','Commission%','Commission ₪','Status','Date'],
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
    Object.assign(document.createElement('a'), { href: url, download: 'supplier-billing.csv' }).click()
  }

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Supplier Billing</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">Track commissions from supplier orders</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-2 bg-[#F3F3F3] text-[#6B7A90] px-3 py-2.5 rounded-xl text-sm hover:bg-[#F9F9F9] transition-all">
            <Download size={15} strokeWidth={1.8} /> CSV
          </button>
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
            <Plus size={16} strokeWidth={1.8} /> New Payment
          </button>
        </div>
      </div>

      {/* KPIs — commissions focus */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-[#F3F3F3] rounded-xl flex items-center justify-center">
              <TrendingUp size={18} className="text-[#091426]" strokeWidth={1.8} />
            </div>
            <span className="text-sm text-[#6B7A90]">Total Commissions</span>
          </div>
          <p className="text-2xl font-bold text-[#091426]">₪{Math.round(totalCommission).toLocaleString('en-US')}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-500" strokeWidth={1.8} />
            </div>
            <span className="text-sm text-[#6B7A90]">Collected</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">₪{Math.round(collectedCommission).toLocaleString('en-US')}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-amber-500" strokeWidth={1.8} />
            </div>
            <span className="text-sm text-[#6B7A90]">Pending Collection</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">₪{Math.round(pendingCommission).toLocaleString('en-US')}</p>
        </div>
      </div>

      {/* פילטרים */}
      <div className="flex gap-3 flex-wrap items-center">
        <select value={filterSup} onChange={e => setFilterSup(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          <option value="all">All Suppliers</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        {['all', 'pending', 'paid'].map(s => (
          <button key={s} onClick={() => setFilterSt(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterSt === s
                ? 'bg-[#091426] text-white'
                : 'bg-white text-[#6B7A90] hover:bg-[#F3F3F3]'
            }`}>
            {s === 'all' ? 'All' : STATUS[s]?.label}
          </button>
        ))}

        <span className="text-sm text-[#6B7A90] ml-auto">{filtered.length} records</span>
      </div>

      {/* טבלה */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6B7A90] text-sm">
            {payments.length === 0 ? 'No payments yet — click "New Payment"' : 'No matching records found'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#F3F3F3] bg-[#F9F9F9]">
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Supplier</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Project</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Description</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Amount</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Commission</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Status</th>
                <th className="text-left py-3.5 px-4 text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Date</th>
                <th className="py-3.5 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  supplierName={supMap[p.supplier_id]?.name || '—'}
                  projectName={projMap[p.project_id]?.name}
                  supplier={supMap[p.supplier_id]}
                  project={projMap[p.project_id]}
                  onEdit={pay => setModal(pay)}
                  onDelete={handleDelete}
                  onToggleStatus={handleToggleStatus}
                  onSendEmail={pay => sendCommissionEmail(pay, supMap[pay.supplier_id], projMap[pay.project_id])}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

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
