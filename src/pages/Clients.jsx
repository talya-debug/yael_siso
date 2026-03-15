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

  if (loading) return <div className="text-gray-400 p-8">טוען...</div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">לקוחות</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + לקוח חדש
        </button>
      </div>

      {/* חיפוש */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="חיפוש לפי שם, טלפון או אימייל..."
        className="w-full border rounded-lg px-4 py-2 text-sm mb-4 bg-white" />

      {/* רשימת לקוחות */}
      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <div className="text-5xl mb-3">👥</div>
          <p>{search ? 'לא נמצאו תוצאות' : 'אין לקוחות עדיין'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border p-4 flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-800 text-base">{c.name}</h3>
              <div className="flex gap-4 mt-1 text-sm text-gray-500 flex-wrap">
                {c.phone && <span>📞 {c.phone}</span>}
                {c.email && <span>✉️ {c.email}</span>}
                {c.address && <span>📍 {c.address}</span>}
              </div>
              {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
            </div>
            <div className="flex gap-3 mr-4 shrink-0">
              <button onClick={() => openEdit(c)} className="text-blue-500 text-sm hover:underline">עריכה</button>
              <button onClick={() => remove(c.id)} className="text-red-400 text-sm hover:underline">מחיקה</button>
            </div>
          </div>
        ))}
      </div>

      {/* טופס */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editClient ? 'עריכת לקוח' : 'לקוח חדש'}</h2>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'שם מלא *', placeholder: 'שם הלקוח' },
                { key: 'phone', label: 'טלפון', placeholder: '050-0000000' },
                { key: 'email', label: 'אימייל', placeholder: 'email@example.com' },
                { key: 'address', label: 'כתובת', placeholder: 'רחוב, עיר' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-sm text-gray-600 block mb-1">{f.label}</label>
                  <input value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder={f.placeholder} />
                </div>
              ))}
              <div>
                <label className="text-sm text-gray-600 block mb-1">הערות</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">שמירה</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
