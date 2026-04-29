import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Phone, Mail, Globe, MapPin, Search, Pencil, Save } from 'lucide-react'

// קטגוריות ספקים
const CATEGORIES = [
  'Renovation Contractor',
  'Electrician',
  'Plumber',
  'Carpenter',
  'HVAC Technician',
  'Painter',
  'Drywall',
  'Flooring',
  'Furniture',
  'Lighting',
  'Curtains & Blinds',
  'Countertops & Kitchens',
  'Tiles & Cladding',
  'Landscaping',
  'Other',
]

// מודאל הוספה / עריכת ספק
function SupplierModal({ supplier, onClose, onSaved }) {
  const isEdit = !!supplier?.id
  const [form, setForm] = useState({
    name: '',
    category: CATEGORIES[0],
    phone: '',
    email: '',
    address: '',
    website: '',
    notes: '',
    commission_pct: '',
    ...supplier,
  })
  const [saving, setSaving] = useState(false)

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('Supplier name is required'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      website: form.website.trim(),
      notes: form.notes.trim(),
      commission_pct: form.commission_pct !== '' ? parseFloat(form.commission_pct) : null,
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (isEdit) {
      ;({ data, error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('suppliers').insert(payload).select().single())
    }

    setSaving(false)
    if (error) { alert('Error saving: ' + error.message); return }
    onSaved(data, isEdit)
  }

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#F3F3F3]">
          <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">{isEdit ? 'Edit Supplier' : 'New Supplier'}</h2>
          <button onClick={onClose} className="text-[#6B7A90] hover:text-[#091426] transition p-1 rounded-xl hover:bg-[#F3F3F3]">
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className={lbl}>Supplier Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Supplier / Business name" className={inp} autoFocus />
          </div>

          <div>
            <label className={lbl}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="050-0000000" className={inp} />
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@example.com" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Address</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Street, City" className={inp} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Website / Link</label>
              <input value={form.website} onChange={e => set('website', e.target.value)}
                placeholder="https://..." className={inp} />
            </div>
            <div>
              <label className={lbl}>Commission (%)</label>
              <input type="number" value={form.commission_pct} onChange={e => set('commission_pct', e.target.value)}
                placeholder="10" min="0" max="100" className={inp} />
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional details, recommendations, payment terms..."
              rows={3} className={inp + ' resize-none'} />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-[#F3F3F3]">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={15} strokeWidth={1.8} />
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Supplier'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F9F9F9] bg-[#F3F3F3] transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// כרטיס ספק
function SupplierCard({ supplier, isAdmin, onEdit, onDelete, onAddPurchase }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5 hover:shadow-[0_4px_30px_rgba(9,20,38,0.08)] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-[#091426] text-base leading-tight font-[Manrope] tracking-tight">{supplier.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[10px] font-bold tracking-wider bg-[#F3F3F3] text-[#091426] px-2 py-0.5 rounded-full">
              {supplier.category}
            </span>
            {isAdmin && supplier.commission_pct != null && (
              <span className="text-[10px] font-bold tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                Commission {supplier.commission_pct}%
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          {!isAdmin && (
            <button onClick={() => onAddPurchase(supplier)}
              className="px-2.5 py-1 rounded-xl text-[10px] font-bold tracking-wider text-[#7B5800] bg-amber-50 hover:bg-amber-100 transition">
              + Purchase
            </button>
          )}
          {isAdmin && (
            <>
              <button onClick={() => onEdit(supplier)}
                className="p-1.5 rounded-xl text-[#6B7A90] hover:text-[#091426] hover:bg-[#F3F3F3] transition">
                <Pencil size={14} strokeWidth={1.8} />
              </button>
              <button onClick={() => onDelete(supplier)}
                className="p-1.5 rounded-xl text-[#6B7A90] hover:text-red-500 hover:bg-red-50 transition">
                <Trash2 size={14} strokeWidth={1.8} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        {supplier.phone && (
          <a href={`tel:${supplier.phone}`}
            className="flex items-center gap-2 text-sm text-[#091426] hover:text-[#091426] transition">
            <Phone size={13} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
            <span>{supplier.phone}</span>
          </a>
        )}
        {supplier.email && (
          <a href={`mailto:${supplier.email}`}
            className="flex items-center gap-2 text-sm text-[#091426] hover:text-[#091426] transition">
            <Mail size={13} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
            <span className="truncate">{supplier.email}</span>
          </a>
        )}
        {supplier.address && (
          <div className="flex items-center gap-2 text-sm text-[#6B7A90]">
            <MapPin size={13} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
            <span>{supplier.address}</span>
          </div>
        )}
        {supplier.website && (
          <a href={supplier.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[#091426] hover:text-[#091426] transition">
            <Globe size={13} className="shrink-0" strokeWidth={1.8} />
            <span className="truncate">Website / Link</span>
          </a>
        )}
      </div>

      {supplier.notes && (
        <p className="mt-3 text-xs text-[#6B7A90] border-t border-[#F3F3F3] pt-3 leading-relaxed">
          {supplier.notes}
        </p>
      )}
    </div>
  )
}

// ── דף ראשי ──
export default function Suppliers({ isAdmin = true }) {
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [purchaseModal, setPurchaseModal] = useState(null)
  const [purchaseForm, setPurchaseForm]   = useState({ project_id: '', description: '', amount: '', quote_link: '' })
  const [savingPurchase, setSavingPurchase] = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: p }] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
      ])
      setSuppliers(s || [])
      setProjects(p || [])
      setLoading(false)
    }
    load()
  }, [])

  async function savePurchase() {
    if (!purchaseForm.project_id || !purchaseForm.amount) return
    setSavingPurchase(true)
    await supabase.from('supplier_payments').insert({
      supplier_id: purchaseModal.id,
      project_id: purchaseForm.project_id,
      description: purchaseForm.description,
      amount: Number(purchaseForm.amount),
      commission_pct: purchaseModal.commission_pct || null,
      status: 'pending',
    })
    setPurchaseModal(null)
    setPurchaseForm({ project_id: '', description: '', amount: '', quote_link: '' })
    setSavingPurchase(false)
    alert('Purchase added! Chloe will review it.')
  }

  const existingCats = ['All', ...Array.from(new Set(suppliers.map(s => s.category))).sort()]

  const filtered = suppliers.filter(s => {
    const matchSearch = !search || [s.name, s.phone, s.email, s.category, s.notes]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchCat = filterCat === 'All' || s.category === filterCat
    return matchSearch && matchCat
  })

  function handleSaved(saved, isEdit) {
    if (isEdit) {
      setSuppliers(prev => prev.map(s => s.id === saved.id ? saved : s))
    } else {
      setSuppliers(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setModal(null)
  }

  async function handleDelete(supplier) {
    if (!window.confirm(`Delete ${supplier.name}?`)) return
    await supabase.from('suppliers').delete().eq('id', supplier.id)
    setSuppliers(prev => prev.filter(s => s.id !== supplier.id))
  }

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Supplier Directory</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">{suppliers.length} suppliers in directory</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('add')}
            className="flex items-center gap-2 bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
            <Plus size={16} strokeWidth={1.8} /> New Supplier
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A90]" strokeWidth={1.8} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full bg-[#F3F3F3] rounded-xl pl-9 pr-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {existingCats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                filterCat === cat
                  ? 'bg-[#091426] text-white'
                  : 'bg-white text-[#6B7A90] hover:bg-[#F3F3F3]'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6B7A90] text-sm">
            {suppliers.length === 0 ? 'No suppliers yet — click "New Supplier" to add one' : 'No matching suppliers found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <SupplierCard key={s.id} supplier={s} isAdmin={isAdmin}
              onEdit={sup => setModal(sup)}
              onDelete={handleDelete}
              onAddPurchase={sup => { setPurchaseModal(sup); setPurchaseForm({ project_id: '', description: '', amount: '', quote_link: '' }) }} />
          ))}
        </div>
      )}

      {modal && (
        <SupplierModal
          supplier={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Purchase Modal — for team members */}
      {purchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={() => setPurchaseModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#F3F3F3]">
              <div>
                <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">Add Purchase</h2>
                <p className="text-xs text-[#6B7A90] mt-0.5">Supplier: {purchaseModal.name}</p>
              </div>
              <button onClick={() => setPurchaseModal(null)} className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-xl hover:bg-[#F3F3F3] transition">
                <X size={18} strokeWidth={1.8} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Project *</label>
                <select value={purchaseForm.project_id} onChange={e => setPurchaseForm(p => ({...p, project_id: e.target.value}))}
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
                  <option value="">— Select Project —</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Description</label>
                <input value={purchaseForm.description} onChange={e => setPurchaseForm(p => ({...p, description: e.target.value}))}
                  placeholder="What was ordered..."
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Amount (₪) *</label>
                <input type="number" value={purchaseForm.amount} onChange={e => setPurchaseForm(p => ({...p, amount: e.target.value}))}
                  placeholder="0"
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
              </div>
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Quote File Link (Google Drive)</label>
                <input value={purchaseForm.quote_link} onChange={e => setPurchaseForm(p => ({...p, quote_link: e.target.value}))}
                  placeholder="https://drive.google.com/..."
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
                <p className="text-[10px] text-[#6B7A90] mt-1">Upload the quote to Google Drive and paste the link here</p>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-[#F3F3F3]">
              <button onClick={savePurchase} disabled={!purchaseForm.project_id || !purchaseForm.amount || savingPurchase}
                className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
                {savingPurchase ? 'Saving...' : 'Submit Purchase'}
              </button>
              <button onClick={() => setPurchaseModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F9F9F9] bg-[#F3F3F3] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
