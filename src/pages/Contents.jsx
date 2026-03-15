import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// קטגוריות תכולות
const CATEGORIES = ['תכנון', 'עיצוב', 'ביצוע', 'ריהוט', 'תאורה', 'אחר']

export default function Contents() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', category: 'תכנון', description: '', estimated_days: '' })

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('contents').select('*').order('category').order('name')
    setItems(data || [])
    setLoading(false)
  }

  function openNew() {
    setForm({ name: '', category: 'תכנון', description: '', estimated_days: '' })
    setEditItem(null)
    setShowForm(true)
  }

  function openEdit(item) {
    setForm({ name: item.name, category: item.category || 'תכנון', description: item.description || '', estimated_days: item.estimated_days || '' })
    setEditItem(item)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return
    const data = { name: form.name, category: form.category, description: form.description, estimated_days: Number(form.estimated_days) || 0 }
    if (editItem) {
      await supabase.from('contents').update(data).eq('id', editItem.id)
    } else {
      await supabase.from('contents').insert(data)
    }
    setShowForm(false)
    fetchItems()
  }

  async function remove(id) {
    await supabase.from('contents').delete().eq('id', id)
    fetchItems()
  }

  // קיבוץ לפי קטגוריה
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const filtered = items.filter(i => i.category === cat)
    if (filtered.length) acc[cat] = filtered
    return acc
  }, {})
  const uncategorized = items.filter(i => !CATEGORIES.includes(i.category))
  if (uncategorized.length) byCategory['אחר'] = [...(byCategory['אחר'] || []), ...uncategorized]

  if (loading) return <div className="text-gray-400 p-8">טוען...</div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">קטלוג תכולות</h1>
        <button onClick={openNew} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + הוסף תכולה
        </button>
      </div>

      {/* רשימה לפי קטגוריה */}
      {Object.keys(byCategory).length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <div className="text-5xl mb-3">📦</div>
          <p>אין תכולות עדיין — הוסיפי את השירותים שהמשרד מציע</p>
        </div>
      )}

      {Object.entries(byCategory).map(([cat, catItems]) => (
        <div key={cat} className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 border-b pb-1">{cat}</h2>
          <div className="grid grid-cols-1 gap-2">
            {catItems.map(item => (
              <div key={item.id} className="bg-white rounded-lg border px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-800">{item.name}</span>
                  {item.description && <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>}
                </div>
                <div className="flex items-center gap-4">
                  {item.estimated_days > 0 && (
                    <span className="text-xs text-gray-400">{item.estimated_days} ימים</span>
                  )}
                  <button onClick={() => openEdit(item)} className="text-blue-500 text-sm hover:underline">עריכה</button>
                  <button onClick={() => remove(item.id)} className="text-red-400 text-sm hover:underline">מחיקה</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* טופס */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editItem ? 'עריכת תכולה' : 'תכולה חדשה'}</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">שם התכולה *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="לדוגמה: תכנון מטבח" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">קטגוריה</label>
                <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">תיאור</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">ימי עבודה משוערים</label>
                <input type="number" value={form.estimated_days} onChange={e => setForm({...form, estimated_days: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
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
