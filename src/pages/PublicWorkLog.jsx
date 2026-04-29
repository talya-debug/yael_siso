import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Clock, Send, CheckCircle2 } from 'lucide-react'

const ROLES = ['Project Manager', 'Drafter', 'Designer', 'Other']

export default function PublicWorkLog() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [form, setForm] = useState({
    project_id: '',
    work_date: new Date().toISOString().split('T')[0],
    role: ROLES[0],
    worker_name: '',
    hours: '',
    description: '',
  })

  useEffect(() => {
    supabase.from('projects').select('id, name').eq('status', 'active').order('name')
      .then(({ data }) => { setProjects(data || []); setLoading(false) })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    if (honeypot) return
    if (!form.project_id || !form.worker_name || !form.hours || !form.description.trim()) return

    await supabase.from('work_log').insert({
      project_id: form.project_id,
      work_date: form.work_date,
      role: form.role,
      worker_name: form.worker_name,
      hours: Number(form.hours),
      description: form.description,
    })

    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setForm(f => ({ ...f, hours: '', description: '' }))
    }, 3000)
  }

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-4 py-3 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  if (loading) return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7B5800] to-[#B8960B] flex items-center justify-center mx-auto mb-3">
            <Clock size={22} className="text-white" strokeWidth={1.8} />
          </div>
          <h1 className="text-xl font-bold text-[#091426] font-[Manrope] tracking-tight">Work Log</h1>
          <p className="text-xs text-[#6B7A90] tracking-widest uppercase mt-1">Yael Siso Interior Design</p>
        </div>

        {/* Form */}
        {submitted ? (
          <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-8 text-center">
            <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-lg font-bold text-[#091426] font-[Manrope]">Hours Logged!</h2>
            <p className="text-sm text-[#6B7A90] mt-1">Thank you. You can submit another entry.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-6 space-y-4">
            <div>
              <label className={lbl}>Your Name *</label>
              <input value={form.worker_name} onChange={e => setForm({...form, worker_name: e.target.value})}
                placeholder="Full name" className={inp} required />
            </div>

            <div>
              <label className={lbl}>Role *</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className={inp}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <label className={lbl}>Project *</label>
              <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} className={inp} required>
                <option value="">— Select Project —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Date *</label>
                <input type="date" value={form.work_date} onChange={e => setForm({...form, work_date: e.target.value})}
                  className={inp} required />
              </div>
              <div>
                <label className={lbl}>Hours *</label>
                <input type="number" step="0.5" min="0.5" max="24" value={form.hours}
                  onChange={e => setForm({...form, hours: e.target.value})}
                  placeholder="0" className={inp} required />
              </div>
            </div>

            <div>
              <label className={lbl}>Description *</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="What did you work on..."
                rows={3} className={inp + ' resize-none'} required />
              {/* Honeypot - hidden from real users */}
              <input type="text" value={honeypot} onChange={e => setHoneypot(e.target.value)}
                style={{ position: 'absolute', left: '-9999px', tabIndex: -1 }} autoComplete="off" />
            </div>

            <button type="submit"
              disabled={!form.project_id || !form.worker_name || !form.hours || !form.description.trim()}
              className="w-full bg-[#091426] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#1E293B] transition-all disabled:opacity-40 flex items-center justify-center gap-2">
              <Send size={15} strokeWidth={1.8} />
              Submit Hours
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
