import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  useEffect(() => { fetchClients() }, [])

  async function fetchClients() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
    setLoading(false)
  }

  function openNew() {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    setEditClient(null)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' })
    setEditClient(c)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    if (editClient) {
      await supabase.from('clients').update(form).eq('id', editClient.id)
    } else {
      await supabase.from('clients').insert(form)
    }
    setShowForm(false)
    fetchClients()
  }

  async function remove(id) {
    await supabase.from('clients').delete().eq('id', id)
    fetchClients()
  }

  const filtered = clients.filter(c =>
    c.name.includes(search) || (c.phone || '').includes(search) || (c.email || '').includes(search)
  )

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">לקוחות</h1>
          <p className="text-sm text-slate-400 mt-0.5">{clients.length} לקוחות במערכת</p>
        </div>
        <button onClick={openNew}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2">
          <span>+</span> לקוח חדש
        </button>
      </div>

      {/* חיפוש */}
      <div className="relative mb-5">
        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או אימייל..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">👥</div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            {search ? 'לא נמצאו תוצאות' : 'אין לקוחות עדיין'}
          </h3>
          <p className="text-sm text-slate-400 mb-5">
            {!search && 'הוסיפי את הלקוח הראשון כדי להתחיל'}
          </p>
          {!search && (
            <button onClick={openNew} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              + לקוח חדש
            </button>
          )}
        </div>
      )}

      {/* רשימה */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map(c => {
          const initials = c.name.charAt(0)
          const colors = ['bg-indigo-100 text-indigo-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600']
          const color = colors[c.name.charCodeAt(0) % colors.length]
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center justify-between hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-base shrink-0 ${color}`}>
                  {initials}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">{c.name}</h3>
                  <div className="flex gap-3 mt-0.5 flex-wrap">
                    {c.phone && <span className="text-xs text-slate-400">📞 {c.phone}</span>}
                    {c.email && <span className="text-xs text-slate-400">✉️ {c.email}</span>}
                    {c.address && <span className="text-xs text-slate-400">📍 {c.address}</span>}
                  </div>
                  {c.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{c.notes}</p>}
                </div>
              </div>
              <div className="flex gap-2 mr-4 shrink-0">
                <button onClick={() => openEdit(c)} className="text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition">עריכה</button>
                <button onClick={() => remove(c.id)} className="text-xs text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">מחיקה</button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">{editClient ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {[
                { key: 'name', label: 'שם מלא', placeholder: 'שם הלקוח', required: true },
                { key: 'phone', label: 'טלפון', placeholder: '050-0000000' },
                { key: 'email', label: 'אימייל', placeholder: 'email@example.com' },
                { key: 'address', label: 'כתובת', placeholder: 'רחוב, עיר' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{f.label}{f.required && ' *'}</label>
                  <input value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                    placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">הערות</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
                  rows={2} />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">שמירה</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
