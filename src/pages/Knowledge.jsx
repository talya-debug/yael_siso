import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Knowledge() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', category: '' })

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.title.trim()) return
    await supabase.from('knowledge').insert(form)
    setShowForm(false)
    setForm({ title: '', content: '', category: '' })
    fetchItems()
  }

  async function remove(id) {
    await supabase.from('knowledge').delete().eq('id', id)
    if (viewing?.id === id) setViewing(null)
    fetchItems()
  }

  const filtered = items.filter(i =>
    i.title.includes(search) || (i.content || '').includes(search) || (i.category || '').includes(search)
  )

  if (loading) return <div className="text-gray-400 p-8">טוען...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ריכוז ידע</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + מאמר חדש
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="חיפוש..."
        className="w-full border rounded-lg px-4 py-2 text-sm mb-4 bg-white" />

      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <div className="text-5xl mb-3">📚</div>
          <p>{search ? 'לא נמצאו תוצאות' : 'אין מאמרים עדיין — שמרי כאן ידע שימושי לצוות'}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl border p-4 cursor-pointer hover:border-blue-200 transition"
            onClick={() => setViewing(item)}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{item.title}</h3>
                {item.category && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">{item.category}</span>}
                {item.content && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.content}</p>}
              </div>
              <button onClick={e => { e.stopPropagation(); remove(item.id) }} className="text-red-400 text-xs hover:text-red-600 mr-2">✕</button>
            </div>
          </div>
        ))}
      </div>

      {/* תצוגת מאמר */}
      {viewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{viewing.title}</h2>
                {viewing.category && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full mt-1 inline-block">{viewing.category}</span>}
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{viewing.content}</p>
          </div>
        </div>
      )}

      {/* טופס חדש */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">מאמר חדש</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">כותרת *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="נושא המאמר" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">קטגוריה</label>
                <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="לדוגמה: חומרים, ספקים, נהלים..." />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">תוכן</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={6} placeholder="כתבי כאן את המידע..." />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={save} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">שמירה</button>
              <button onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
