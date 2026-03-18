import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Phone, Mail, Globe, MapPin, Search, Pencil, Save } from 'lucide-react'

// קטגוריות ספקים
const CATEGORIES = [
  'קבלן שיפוצים',
  'חשמלאי',
  'אינסטלטור',
  'נגר',
  'טכנאי מיזוג',
  'צבעי',
  'גבס',
  'ריצוף',
  'ריהוט',
  'תאורה',
  'וילונות ותריסים',
  'שיש ומטבחים',
  'אריחים וחיפויים',
  'גינון ונוף',
  'אחר',
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
    ...supplier,
  })
  const [saving, setSaving] = useState(false)

  function set(field, val) {
    setForm(prev => ({ ...prev, [field]: val }))
  }

  async function handleSave() {
    if (!form.name.trim()) { alert('שם הספק הוא שדה חובה'); return }
    setSaving(true)
    const payload = {
      name: form.name.trim(),
      category: form.category,
      phone: form.phone.trim(),
      email: form.email.trim(),
      address: form.address.trim(),
      website: form.website.trim(),
      notes: form.notes.trim(),
      updated_at: new Date().toISOString(),
    }

    let data, error
    if (isEdit) {
      ;({ data, error } = await supabase.from('suppliers').update(payload).eq('id', supplier.id).select().single())
    } else {
      ;({ data, error } = await supabase.from('suppliers').insert(payload).select().single())
    }

    setSaving(false)
    if (error) { alert('שגיאה בשמירה: ' + error.message); return }
    onSaved(data, isEdit)
  }

  const inp = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
  const lbl = "text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-slate-900/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* כותרת */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{isEdit ? 'עריכת ספק' : 'ספק חדש'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-1 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* טופס */}
        <div className="p-5 space-y-4">
          {/* שם */}
          <div>
            <label className={lbl}>שם הספק *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="שם הספק / עסק" className={inp} autoFocus />
          </div>

          {/* קטגוריה */}
          <div>
            <label className={lbl}>קטגוריה</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inp}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* טלפון + מייל */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>טלפון</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="050-0000000" className={inp} />
            </div>
            <div>
              <label className={lbl}>מייל</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                placeholder="email@example.com" className={inp} />
            </div>
          </div>

          {/* כתובת */}
          <div>
            <label className={lbl}>כתובת</label>
            <input value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="רחוב, עיר" className={inp} />
          </div>

          {/* אתר */}
          <div>
            <label className={lbl}>אתר / קישור</label>
            <input value={form.website} onChange={e => set('website', e.target.value)}
              placeholder="https://..." className={inp} />
          </div>

          {/* הערות */}
          <div>
            <label className={lbl}>הערות</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="פרטים נוספים, המלצות, תנאי תשלום..."
              rows={3} className={inp + ' resize-none'} />
          </div>
        </div>

        {/* כפתורים */}
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            <Save size={15} />
            {saving ? 'שומר...' : isEdit ? 'עדכן' : 'הוסף ספק'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition border border-slate-200">
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

// כרטיס ספק
function SupplierCard({ supplier, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition group">
      {/* שורה עליונה */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-slate-800 text-base leading-tight">{supplier.name}</h3>
          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium mt-1 inline-block">
            {supplier.category}
          </span>
        </div>
        {/* כפתורי עריכה/מחיקה */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(supplier)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(supplier)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* פרטי קשר */}
      <div className="space-y-1.5">
        {supplier.phone && (
          <a href={`tel:${supplier.phone}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition">
            <Phone size={13} className="text-slate-400 shrink-0" />
            <span>{supplier.phone}</span>
          </a>
        )}
        {supplier.email && (
          <a href={`mailto:${supplier.email}`}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 transition">
            <Mail size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{supplier.email}</span>
          </a>
        )}
        {supplier.address && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={13} className="text-slate-400 shrink-0" />
            <span>{supplier.address}</span>
          </div>
        )}
        {supplier.website && (
          <a href={supplier.website} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-700 transition">
            <Globe size={13} className="shrink-0" />
            <span className="truncate">אתר / קישור</span>
          </a>
        )}
      </div>

      {/* הערות */}
      {supplier.notes && (
        <p className="mt-3 text-xs text-slate-400 border-t border-slate-100 pt-3 leading-relaxed">
          {supplier.notes}
        </p>
      )}
    </div>
  )
}

// ── דף ראשי ──
export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(null)   // null | 'add' | supplier-object (edit)
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('הכל')

  // טעינה
  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('suppliers').select('*').order('name')
      setSuppliers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  // קטגוריות קיימות בפועל
  const existingCats = ['הכל', ...Array.from(new Set(suppliers.map(s => s.category))).sort()]

  // פילטר
  const filtered = suppliers.filter(s => {
    const matchSearch = !search || [s.name, s.phone, s.email, s.category, s.notes]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
    const matchCat = filterCat === 'הכל' || s.category === filterCat
    return matchSearch && matchCat
  })

  // אחרי שמירה
  function handleSaved(saved, isEdit) {
    if (isEdit) {
      setSuppliers(prev => prev.map(s => s.id === saved.id ? saved : s))
    } else {
      setSuppliers(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name, 'he')))
    }
    setModal(null)
  }

  // מחיקה
  async function handleDelete(supplier) {
    if (!window.confirm(`למחוק את ${supplier.name}?`)) return
    await supabase.from('suppliers').delete().eq('id', supplier.id)
    setSuppliers(prev => prev.filter(s => s.id !== supplier.id))
  }

  if (loading) return <div className="text-slate-400 text-sm p-8">טוען...</div>

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ספר ספקים</h1>
          <p className="text-sm text-slate-400 mt-0.5">{suppliers.length} ספקים במאגר</p>
        </div>
        <button onClick={() => setModal('add')}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm">
          <Plus size={16} /> ספק חדש
        </button>
      </div>

      {/* חיפוש + פילטר */}
      <div className="flex gap-3 flex-wrap">
        {/* חיפוש */}
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, טלפון, מייל..."
            className="w-full border border-slate-200 rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition bg-white"
          />
        </div>

        {/* פילטר קטגוריה */}
        <div className="flex gap-1.5 flex-wrap">
          {existingCats.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition border ${
                filterCat === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* רשת ספקים */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 text-sm">
            {suppliers.length === 0 ? 'עדיין אין ספקים — לחצי "ספק חדש" להוספה' : 'לא נמצאו ספקים תואמים'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <SupplierCard key={s.id} supplier={s}
              onEdit={sup => setModal(sup)}
              onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* מודאל */}
      {modal && (
        <SupplierModal
          supplier={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
