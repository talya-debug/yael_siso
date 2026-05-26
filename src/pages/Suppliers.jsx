import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Phone, Mail, Globe, MapPin, Search, Pencil, Save,
  Zap, Droplet, Hammer, Snowflake, PaintBucket, Square, Lightbulb, Wrench, Package,
  Blinds, Sofa, TreePine, Scissors, Shield, Wifi, Sun, Truck, Ruler, HardHat,
} from 'lucide-react'

// אייקונים וצבעים לקטגוריות ספקים
const CATEGORY_ICONS = {
  'Electrician':            { Icon: Zap,         color: '#D97706' },
  'Plumber':                { Icon: Droplet,     color: '#2563EB' },
  'Carpenter':              { Icon: Hammer,      color: '#92400E' },
  'HVAC Technician':        { Icon: Snowflake,   color: '#0891B2' },
  'Painter':                { Icon: PaintBucket, color: '#DB2777' },
  'Flooring':               { Icon: Square,      color: '#059669' },
  'Lighting':               { Icon: Lightbulb,   color: '#D97706' },
  'Renovation Contractor':  { Icon: HardHat,     color: '#4F46E5' },
  'Drywall':                { Icon: Square,      color: '#6B7280' },
  'Furniture':              { Icon: Sofa,        color: '#7C3AED' },
  'Curtains & Blinds':      { Icon: Blinds,      color: '#6366F1' },
  'Countertops & Kitchens': { Icon: Scissors,    color: '#DC2626' },
  'Tiles & Cladding':       { Icon: Square,      color: '#0891B2' },
  'Landscaping':            { Icon: TreePine,    color: '#059669' },
  'Iron & Metalwork':       { Icon: Wrench,      color: '#6B7280' },
  'Glass & Mirrors':        { Icon: Square,      color: '#0EA5E9' },
  'Doors':                  { Icon: Square,      color: '#92400E' },
  'Windows & Shutters':     { Icon: Sun,         color: '#D97706' },
  'Smart Home & Automation':{ Icon: Wifi,        color: '#4F46E5' },
  'Security Systems':       { Icon: Shield,      color: '#DC2626' },
  'Moving & Storage':       { Icon: Truck,       color: '#6B7280' },
  'Architect':              { Icon: Ruler,       color: '#4F46E5' },
  'Structural Engineer':    { Icon: Ruler,       color: '#0891B2' },
  'Other':                  { Icon: Package,     color: '#6B7280' },
}

function CategoryIcon({ category, size = 20 }) {
  const cat = CATEGORY_ICONS[category] || CATEGORY_ICONS['Other']
  const IconComp = cat.Icon
  return (
    <div className="rounded-lg flex items-center justify-center shrink-0"
      style={{ width: size + 4, height: size + 4, backgroundColor: cat.color + '18' }}>
      <IconComp size={size - 4} strokeWidth={1.8} style={{ color: cat.color }} />
    </div>
  )
}

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
  'Iron & Metalwork',
  'Glass & Mirrors',
  'Doors',
  'Windows & Shutters',
  'Smart Home & Automation',
  'Security Systems',
  'Wallpaper & Wall Finishes',
  'Upholstery',
  'Rugs & Carpets',
  'Art & Decor',
  'Outdoor Furniture',
  'Pool & Spa',
  'Cleaning Services',
  'Moving & Storage',
  'Architect',
  'Structural Engineer',
  'Interior Accessories',
  'Other',
]

// מודאל הוספה / עריכת ספק
function SupplierModal({ supplier, onClose, onSaved, isAdmin = true }) {
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
    bank_name: '',
    bank_branch: '',
    bank_account: '',
    account_holder: '',
    ...supplier,
  })
  const [saving, setSaving] = useState(false)
  const [formToast, setFormToast] = useState(null)
  function showFormToast(msg) { setFormToast(msg); setTimeout(() => setFormToast(null), 3000) }

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { showFormToast('Supplier name is required'); return }
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
      bank_name: form.bank_name.trim(),
      bank_branch: form.bank_branch.trim(),
      bank_account: form.bank_account.trim(),
      account_holder: form.account_holder.trim(),
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (isEdit) {
      ;({ data, error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('suppliers').insert(payload).select().single())
    }

    setSaving(false)
    if (error) { showFormToast('Error saving: ' + error.message); return }
    onSaved(data, isEdit)
  }

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
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
            <select value={CATEGORIES.includes(form.category) ? form.category : '__custom__'} onChange={e => {
              if (e.target.value === '__custom__') set('category', '')
              else set('category', e.target.value)
            }} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom__">+ Custom Category...</option>
            </select>
            {!CATEGORIES.includes(form.category) && (
              <input value={form.category} onChange={e => set('category', e.target.value)}
                placeholder="Type custom category..." className={inp + ' mt-2'} autoFocus />
            )}
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
            {isAdmin && (
              <div>
                <label className={lbl}>Commission (%)</label>
                <input type="number" value={form.commission_pct} onChange={e => set('commission_pct', e.target.value)}
                  placeholder="10" min="0" max="100" className={inp} />
              </div>
            )}
          </div>

          {/* פרטי בנק — גלוי לכולם */}
          <div className="border-t border-[#E2E8F0] pt-4 mt-4">
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-3">Bank Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Bank Name</label>
                <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)}
                  placeholder="שם בנק" className={inp} />
              </div>
              <div>
                <label className={lbl}>Branch</label>
                <input value={form.bank_branch} onChange={e => set('bank_branch', e.target.value)}
                  placeholder="סניף" className={inp} />
              </div>
              <div>
                <label className={lbl}>Account Number</label>
                <input value={form.bank_account} onChange={e => set('bank_account', e.target.value)}
                  placeholder="מספר חשבון" className={inp} />
              </div>
              <div>
                <label className={lbl}>Account Holder</label>
                <input value={form.account_holder} onChange={e => set('account_holder', e.target.value)}
                  placeholder="שם בעל החשבון" className={inp} />
              </div>
            </div>
          </div>

          <div>
            <label className={lbl}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Additional details, recommendations, payment terms..."
              rows={3} className={inp + ' resize-none'} />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-[#E2E8F0]">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={15} strokeWidth={1.8} />
            {saving ? 'Saving...' : isEdit ? 'Update' : 'Add Supplier'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F8F9FC] bg-[#F3F3F3] transition-all">
            Cancel
          </button>
        </div>
        {formToast && (
          <div className="mx-5 mb-4 bg-red-50 text-red-700 px-4 py-2.5 rounded-xl text-sm text-center">
            {formToast}
          </div>
        )}
      </div>
    </div>
  )
}

// כרטיס ספק — לפי רפרנס סטיץ' החדש
function SupplierCard({ supplier, isAdmin, onEdit, onDelete, onAddPurchase, onToggleFavorite, supplierProjects }) {
  const cat = CATEGORY_ICONS[supplier.category] || CATEGORY_ICONS['Other']

  return (
    <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all cursor-pointer border border-[#E2E8F0] hover:border-[#CBD5E1] flex flex-col h-full group"
      onClick={() => onEdit(supplier)}>
      <div className="p-6 flex-grow">
        {/* שם + כוכב + Active badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-[#091426] text-lg font-[Manrope] tracking-tight leading-tight">{supplier.name}</h3>
              <button onClick={e => { e.stopPropagation(); onToggleFavorite(supplier) }}
                className="text-base transition hover:scale-110 shrink-0">
                {supplier.is_favorite ? '⭐' : '☆'}
              </button>
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-wider bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md shrink-0 ml-2">
            ACTIVE
          </span>
        </div>

        {/* קטגוריה badge */}
        <div className="mb-4">
          <span className="text-[12px] font-semibold px-3 py-1 rounded-full border"
            style={{ color: cat.color, borderColor: cat.color + '40', backgroundColor: cat.color + '10' }}>
            {supplier.category}
          </span>
          {isAdmin && supplier.commission_pct != null && (
            <span className="text-[11px] font-bold text-emerald-700 ml-2">
              {supplier.commission_pct}%
            </span>
          )}
        </div>

        {/* פרטי קשר */}
        <div className="space-y-2.5">
          {supplier.phone && (
            <div className="flex items-center gap-3 text-[#64748B] text-sm" onClick={e => e.stopPropagation()}>
              <Phone size={16} className="shrink-0" strokeWidth={1.8} />
              <a href={`tel:${supplier.phone}`} className="hover:text-[#091426] transition">{supplier.phone}</a>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-3 text-[#64748B] text-sm" onClick={e => e.stopPropagation()}>
              <Mail size={16} className="shrink-0" strokeWidth={1.8} />
              <a href={`mailto:${supplier.email}`} className="hover:text-[#091426] transition truncate">{supplier.email}</a>
            </div>
          )}
          {supplier.website && (
            <div className="flex items-center gap-3 text-[#64748B] text-sm" onClick={e => e.stopPropagation()}>
              <Globe size={16} className="shrink-0" strokeWidth={1.8} />
              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#091426] transition truncate">{supplier.website.replace(/^https?:\/\//, '')}</a>
            </div>
          )}
        </div>
      </div>

      {/* פרויקטים */}
      {supplierProjects && supplierProjects.length > 0 && (
        <div className="border-t border-[#E2E8F0] px-6 py-4">
          <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-2">Current Projects</p>
          <div className="flex flex-wrap gap-1.5">
            {supplierProjects.map(p => (
              <span key={p.id} className="text-[11px] font-medium px-2.5 py-1 rounded-full border border-[#E2E8F0] text-[#091426] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── דף ראשי ──
export default function Suppliers({ isAdmin = true }) {
  const [suppliers, setSuppliers] = useState([])
  const [projects, setProjects]   = useState([])
  const [budgetItems, setBudgetItems] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [filterFav, setFilterFav] = useState(false)
  const [showAllCats, setShowAllCats] = useState(false)
  const [viewSupplier, setViewSupplier] = useState(null)
  const [purchaseModal, setPurchaseModal] = useState(null)
  const [purchaseForm, setPurchaseForm]   = useState({ project_id: '', description: '', amount: '', quote_link: '' })
  const [savingPurchase, setSavingPurchase] = useState(false)
  const [toast, setToast] = useState(null)
  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: p }, { data: bi }] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('budget_items').select('supplier_id, project_id, projects(name)'),
      ])
      setSuppliers(s || [])
      setProjects(p || [])
      setBudgetItems(bi || [])
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
    showToast('Purchase added! Chloe will review it.')
  }

  async function toggleFavorite(supplier) {
    const newVal = !supplier.is_favorite
    await supabase.from('suppliers').update({ is_favorite: newVal }).eq('id', supplier.id)
    setSuppliers(prev => prev.map(s => s.id === supplier.id ? { ...s, is_favorite: newVal } : s))
  }

  function getSupplierProjects(supplierId) {
    const projectIds = [...new Set(budgetItems.filter(bi => bi.supplier_id === supplierId).map(bi => bi.project_id))]
    return projectIds.map(pid => {
      const proj = projects.find(p => p.id === pid)
      return proj ? { id: proj.id, name: proj.name } : null
    }).filter(Boolean)
  }

  const existingCats = ['All', ...Array.from(new Set(suppliers.map(s => s.category))).sort()]

  const filtered = suppliers.filter(s => {
    const matchSearch = !search || [s.name, s.phone, s.email, s.category, s.notes]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchCat = filterCat === 'All' || s.category === filterCat
    const matchFav = !filterFav || s.is_favorite
    return matchSearch && matchCat && matchFav
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
          <p className="text-sm text-[#64748B] mt-1">Manage and discover trusted partners for your studio projects.</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-[#B8960B] hover:bg-[#9A7D09] text-white px-6 py-3 rounded-lg text-sm font-bold transition-all">
          <Plus size={16} strokeWidth={1.8} /> Add Supplier
        </button>
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

        {(() => {
          const PRIMARY_CATS = ['All', 'Renovation Contractor', 'Electrician', 'Plumber', 'Carpenter', 'Furniture', 'Lighting', 'Flooring', 'Countertops & Kitchens']
          const shownCats = showAllCats ? existingCats : existingCats.filter(c => PRIMARY_CATS.includes(c))
          const hasMore = existingCats.length > shownCats.length
          return (
            <div className="flex gap-1.5 flex-wrap items-center">
              <button onClick={() => { setFilterFav(!filterFav); if (!filterFav) setFilterCat('All') }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  filterFav
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-white text-[#6B7A90] hover:bg-[#F3F3F3]'
                }`}>
                ⭐ Favorites
              </button>
              {shownCats.map(cat => (
                <button key={cat} onClick={() => { setFilterCat(cat); setFilterFav(false) }}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                    filterCat === cat
                      ? 'bg-[#091426] text-white'
                      : 'bg-white text-[#6B7A90] hover:bg-[#F3F3F3]'
                  }`}>
                  {cat}
                </button>
              ))}
              {hasMore && (
                <button onClick={() => setShowAllCats(!showAllCats)}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-[#7B5800] hover:bg-amber-50 transition-all">
                  {showAllCats ? '← Less' : `+${existingCats.length - shownCats.length} more →`}
                </button>
              )}
            </div>
          )
        })()}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[#6B7A90] text-sm">
            {suppliers.length === 0 ? 'No suppliers yet — click "New Supplier" to add one' : 'No matching suppliers found'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map(s => (
            <SupplierCard key={s.id} supplier={s} isAdmin={isAdmin}
              onEdit={sup => setViewSupplier(sup)}
              onDelete={handleDelete}
              onAddPurchase={sup => { setPurchaseModal(sup); setPurchaseForm({ project_id: '', description: '', amount: '', quote_link: '' }) }}
              onToggleFavorite={toggleFavorite}
              supplierProjects={getSupplierProjects(s.id)} />
          ))}
        </div>
      )}

      {modal && (
        <SupplierModal
          supplier={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          isAdmin={isAdmin}
        />
      )}

      {/* Purchase Modal — for team members */}
      {purchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[#091426]/60" onClick={() => setPurchaseModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0]">
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
            <div className="flex gap-3 p-5 border-t border-[#E2E8F0]">
              <button onClick={savePurchase} disabled={!purchaseForm.project_id || !purchaseForm.amount || savingPurchase}
                className="flex-1 bg-[#091426] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
                {savingPurchase ? 'Saving...' : 'Submit Purchase'}
              </button>
              <button onClick={() => setPurchaseModal(null)}
                className="px-4 py-2.5 rounded-xl text-sm text-[#6B7A90] hover:bg-[#F8F9FC] bg-[#F3F3F3] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Supplier Detail Drawer */}
      {viewSupplier && (() => {
        const vs = viewSupplier
        const vsCat = CATEGORY_ICONS[vs.category] || CATEGORY_ICONS['Other']
        const VsCatIcon = vsCat.Icon
        const vsProjects = getSupplierProjects(vs.id)
        return (
          <>
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]" onClick={() => setViewSupplier(null)} />
            <div className="fixed right-0 top-0 h-screen w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: vsCat.color }}>
                    <VsCatIcon size={24} strokeWidth={1.8} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-lg text-[#091426] font-[Manrope]">{vs.name}</h2>
                      <span className="bg-emerald-100 text-emerald-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">Active</span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[#B8960B]">⭐</span>
                      <span className="text-xs text-[#64748B]">{vs.category}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setViewSupplier(null)}
                  className="w-10 h-10 rounded-full hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]">
                  <X size={20} strokeWidth={1.8} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Action buttons */}
                <div className="flex gap-3">
                  <button onClick={() => { setViewSupplier(null); setModal(vs) }}
                    className="flex-1 py-2.5 px-4 border border-[#CBD5E1] text-[#091426] font-bold rounded-lg hover:bg-[#F8F9FC] transition">
                    Edit Information
                  </button>
                  <button onClick={() => { setViewSupplier(null); setPurchaseModal(vs); setPurchaseForm({ project_id: '', description: '', amount: '', quote_link: '' }) }}
                    className="flex-1 py-2.5 px-4 bg-[#B8960B] text-white font-bold rounded-lg hover:bg-[#9A7D09] transition">
                    + Purchase
                  </button>
                </div>

                {/* Details grid */}
                <div className="space-y-5">
                  {[
                    { icon: <VsCatIcon size={20} strokeWidth={1.8} />, label: 'Category', value: vs.category },
                    { icon: <Phone size={20} strokeWidth={1.8} />, label: 'Phone', value: vs.phone, link: vs.phone ? `tel:${vs.phone}` : null },
                    { icon: <Mail size={20} strokeWidth={1.8} />, label: 'Email', value: vs.email, link: vs.email ? `mailto:${vs.email}` : null },
                    { icon: <Globe size={20} strokeWidth={1.8} />, label: 'Website', value: vs.website?.replace(/^https?:\/\//, ''), link: vs.website },
                    { icon: <MapPin size={20} strokeWidth={1.8} />, label: 'Address', value: vs.address },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} className="flex items-start gap-4">
                      <div className="text-[#64748B] mt-0.5 shrink-0">{row.icon}</div>
                      <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-0.5">{row.label}</p>
                        {row.link ? (
                          <a href={row.link} target={row.link.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                            className="text-sm text-[#091426] hover:text-[#7B5800] transition">{row.value}</a>
                        ) : (
                          <p className="text-sm text-[#091426]">{row.value}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Bank details - admin only */}
                  {isAdmin && vs.bank_name && (
                    <div className="flex items-start gap-4">
                      <div className="text-[#64748B] mt-0.5 shrink-0"><Wrench size={20} strokeWidth={1.8} /></div>
                      <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-0.5">Bank Details</p>
                        <p className="text-sm text-[#091426]">{vs.bank_name} · Branch {vs.bank_branch} · {vs.bank_account}</p>
                        {vs.account_holder && <p className="text-xs text-[#64748B] mt-0.5">{vs.account_holder}</p>}
                      </div>
                    </div>
                  )}

                  {/* Commission - admin only */}
                  {isAdmin && vs.commission_pct != null && (
                    <div className="flex items-start gap-4">
                      <div className="text-[#64748B] mt-0.5 shrink-0"><span className="text-lg">%</span></div>
                      <div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-0.5">Commission</p>
                        <p className="text-sm text-[#091426] font-bold">{vs.commission_pct}%</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Projects */}
                {vsProjects.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-3">Active In Projects</p>
                    <div className="flex flex-wrap gap-2">
                      {vsProjects.map(p => (
                        <span key={p.id} className="text-[12px] font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {vs.notes && (
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-[#94A3B8] mb-3">Notes</p>
                    <div className="bg-[#F8F9FC] p-4 rounded-xl border border-[#E2E8F0]">
                      <p className="text-sm text-[#091426] italic leading-relaxed">{vs.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      })()}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#091426] text-white px-5 py-3 rounded-xl text-sm shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
