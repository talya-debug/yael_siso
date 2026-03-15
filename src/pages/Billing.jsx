import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = { pending: 'ממתין', paid: 'שולם', overdue: 'באיחור' }
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-700', paid: 'bg-green-100 text-green-700', overdue: 'bg-red-100 text-red-700' }

export default function Billing() {
  const [tab, setTab] = useState('clients')
  const [records, setRecords] = useState([])
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ project_id: '', client_id: '', vendor_name: '', description: '', amount: '', due_date: '', status: 'pending' })

  useEffect(() => { fetchAll() }, [tab])

  async function fetchAll() {
    setLoading(true)
    const table = tab === 'clients' ? 'billing_clients' : 'billing_vendors'
    const select = tab === 'clients' ? '*, projects(name), clients(name)' : '*, projects(name)'
    const [{ data: r }, { data: p }, { data: c }] = await Promise.all([
      supabase.from(table).select(select).order('due_date'),
      supabase.from('projects').select('id, name').order('name'),
      supabase.from('clients').select('id, name').order('name'),
    ])
    setRecords(r || [])
    setProjects(p || [])
    setClients(c || [])
    setLoading(false)
  }

  async function save() {
    const table = tab === 'clients' ? 'billing_clients' : 'billing_vendors'
    const data = tab === 'clients'
      ? { project_id: form.project_id || null, client_id: form.client_id || null, description: form.description, amount: Number(form.amount), due_date: form.due_date || null, status: form.status }
      : { project_id: form.project_id || null, vendor_name: form.vendor_name, description: form.description, amount: Number(form.amount), due_date: form.due_date || null, status: form.status }
    await supabase.from(table).insert(data)
    setShowForm(false)
    setForm({ project_id: '', client_id: '', vendor_name: '', description: '', amount: '', due_date: '', status: 'pending' })
    fetchAll()
  }

  async function updateStatus(id, status) {
    const table = tab === 'clients' ? 'billing_clients' : 'billing_vendors'
    const update = status === 'paid' ? { status, paid_at: new Date().toISOString().split('T')[0] } : { status }
    await supabase.from(table).update(update).eq('id', id)
    fetchAll()
  }

  async function remove(id) {
    const table = tab === 'clients' ? 'billing_clients' : 'billing_vendors'
    await supabase.from(table).delete().eq('id', id)
    fetchAll()
  }

  const total = records.reduce((s, r) => s + Number(r.amount || 0), 0)
  const paid = records.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0)

  if (loading) return <div className="text-gray-400 p-8">טוען...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">גבייה</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + רשומה חדשה
        </button>
      </div>

      {/* טאבים */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-5">
        {[['clients', 'גבייה מלקוחות'], ['vendors', 'גבייה מספקים']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === key ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* סיכום */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'סה"כ', value: total, color: 'text-gray-800' },
          { label: 'שולם', value: paid, color: 'text-green-600' },
          { label: 'ממתין', value: total - paid, color: 'text-orange-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>₪{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center text-gray-400 py-12">
          <div className="text-4xl mb-2">💰</div>
          <p>אין רשומות עדיין</p>
        </div>
      )}

      <div className="space-y-2">
        {records.map(r => (
          <div key={r.id} className="bg-white rounded-xl border p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800">{tab === 'clients' ? r.clients?.name : r.vendor_name}</span>
                  {r.projects?.name && <span className="text-xs text-gray-400">· {r.projects.name}</span>}
                </div>
                {r.description && <p className="text-sm text-gray-500 mt-0.5">{r.description}</p>}
                {r.due_date && <p className="text-xs text-gray-400 mt-0.5">לתשלום: {r.due_date}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0 mr-3">
                <span className="font-bold text-gray-800">₪{Number(r.amount).toLocaleString()}</span>
                <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[r.status]}`}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={() => remove(r.id)} className="text-red-400 text-xs hover:text-red-600">✕</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* טופס */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">רשומה חדשה — {tab === 'clients' ? 'לקוח' : 'ספק'}</h2>
            <div className="space-y-3">
              {tab === 'clients' ? (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">לקוח</label>
                  <select value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="">בחרי לקוח...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-600 block mb-1">שם ספק *</label>
                  <input value={form.vendor_name} onChange={e => setForm({...form, vendor_name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="שם הספק" />
                </div>
              )}
              <div>
                <label className="text-sm text-gray-600 block mb-1">פרויקט</label>
                <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">בחרי פרויקט...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">תיאור</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="עבור מה?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">סכום (₪)</label>
                  <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">תאריך לתשלום</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
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
