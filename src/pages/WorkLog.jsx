import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, Trash2, Clock, Link2, Copy, Check } from 'lucide-react'

// תפקידים אפשריים
const ROLES = ['Project Manager', 'Drafter', 'Designer', 'Other']

function getPublicUrl() {
  return `${window.location.origin}/worklog-public`
}

export default function WorkLog() {
  const [logs,       setLogs]       = useState([])
  const [projects,   setProjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [filterProj, setFilterProj] = useState('')
  const [filterRole, setFilterRole] = useState('')

  const [form, setForm] = useState({
    project_id: '',
    work_date:  new Date().toISOString().split('T')[0],
    hours:      '',
    role:       ROLES[0],
    description:'',
    worker_name:'',
  })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: l }, { data: p }] = await Promise.all([
      supabase.from('work_log').select('*, projects(name)').order('work_date', { ascending: false }),
      supabase.from('projects').select('id, name').order('name'),
    ])
    setLogs(l || [])
    setProjects(p || [])
    setLoading(false)
  }

  async function save() {
    if (!form.project_id || !form.hours || !form.worker_name.trim()) return
    await supabase.from('work_log').insert({
      project_id:  form.project_id  || null,
      work_date:   form.work_date,
      hours:       Number(form.hours) || null,
      role:        form.role,
      description: form.description,
      worker_name: form.worker_name,
    })
    setShowForm(false)
    setForm({ project_id: '', work_date: new Date().toISOString().split('T')[0], hours: '', role: ROLES[0], description: '', worker_name: '' })
    fetchAll()
  }

  async function remove(id) {
    if (!confirm('Delete this entry?')) return
    await supabase.from('work_log').delete().eq('id', id)
    setLogs(prev => prev.filter(l => l.id !== id))
  }

  function copyLink() {
    navigator.clipboard.writeText(getPublicUrl())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filtered = logs.filter(l => {
    const matchProj = !filterProj || l.project_id === filterProj
    const matchRole = !filterRole || l.role === filterRole
    return matchProj && matchRole
  })

  const totalHours = filtered.reduce((s, l) => s + Number(l.hours || 0), 0)

  const hoursByRole = ROLES.reduce((acc, r) => {
    acc[r] = logs.filter(l => l.role === r).reduce((s, l) => s + Number(l.hours || 0), 0)
    return acc
  }, {})

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Work Log</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">
            {logs.length} entries · Total {logs.reduce((s,l) => s + Number(l.hours||0),0)} hours
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={copyLink}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all ${
              copied
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-[#F3F3F3] text-[#6B7A90] hover:bg-[#F9F9F9]'
            }`}>
            {copied ? <Check size={14} strokeWidth={1.8} /> : <Link2 size={14} strokeWidth={1.8} />}
            {copied ? 'Copied!' : 'Public Link'}
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
            <Plus size={15} strokeWidth={1.8} /> New Entry
          </button>
        </div>
      </div>

      <div className="bg-[#091426] rounded-xl px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
        <Link2 size={14} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
        <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer"
          className="text-gray-300 text-xs font-mono flex-1 truncate hover:text-white transition">
          {getPublicUrl()}
        </a>
        <button onClick={copyLink}
          className="text-xs text-[#6B7A90] hover:text-gray-300 transition shrink-0">
          {copied ? '✓ Copied' : 'Copy'}
        </button>
        <a href={getPublicUrl()} target="_blank" rel="noopener noreferrer"
          className="text-xs text-[#B8960B] hover:text-white transition shrink-0 font-medium">
          Open ↗
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {ROLES.map(r => (
          <div key={r} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4">
            <p className="text-2xl font-bold text-[#091426]">{hoursByRole[r] || 0}<span className="text-sm font-normal text-[#6B7A90]">h</span></p>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-0.5">{r}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap">
        <select value={filterProj} onChange={e => setFilterProj(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 min-w-40">
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(filterProj || filterRole) && (
          <span className="text-sm text-[#6B7A90] self-center">{filtered.length} entries · {totalHours} hours</span>
        )}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📅</div>
          <p className="text-[#6B7A90] text-sm">No entries yet — click "+ New Entry"</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(l => (
          <div key={l.id} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 flex items-start justify-between group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium text-[#6B7A90]">
                  {new Date(l.work_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                {l.projects?.name && (
                  <span className="text-[10px] font-bold tracking-wider bg-[#F3F3F3] text-[#091426] px-2 py-0.5 rounded-full">
                    {l.projects.name}
                  </span>
                )}
                {l.role && (
                  <span className="text-[10px] font-bold tracking-wider bg-[#F3F3F3] text-[#6B7A90] px-2 py-0.5 rounded-full">
                    {l.role}
                  </span>
                )}
                {l.worker_name && (
                  <span className="text-xs text-[#6B7A90]">{l.worker_name}</span>
                )}
              </div>
              <p className="text-[#091426] text-sm">{l.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              {l.hours && (
                <span className="flex items-center gap-1 font-semibold text-[#091426] text-sm">
                  <Clock size={13} className="text-[#6B7A90]" strokeWidth={1.8} /> {l.hours}h
                </span>
              )}
              <button onClick={() => remove(l.id)}
                className="opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-red-500 p-1 rounded-xl hover:bg-red-50">
                <Trash2 size={13} strokeWidth={1.8} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
              <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">Log Work</h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Date</label>
                  <input type="date" value={form.work_date}
                    onChange={e => setForm({...form, work_date: e.target.value})} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Hours</label>
                  <input type="number" step="0.5" value={form.hours}
                    onChange={e => setForm({...form, hours: e.target.value})}
                    className={inp} placeholder="0" />
                </div>
              </div>
              <div>
                <label className={lbl}>Role</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={inp}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Project</label>
                <select value={form.project_id}
                  onChange={e => setForm({...form, project_id: e.target.value})} className={inp}>
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>What did you do? *</label>
                <textarea value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className={inp + ' resize-none'} rows={3}
                  placeholder="Description of work performed..." />
              </div>
              <div>
                <label className={lbl}>Worker Name</label>
                <input value={form.worker_name}
                  onChange={e => setForm({...form, worker_name: e.target.value})}
                  className={inp} placeholder="Name..." />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
              <button onClick={save}
                className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
                Save
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
