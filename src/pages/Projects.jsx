import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_META = {
  active:    { label: 'פעיל',    dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  completed: { label: 'הושלם',   dot: 'bg-slate-400',   chip: 'bg-slate-50 text-slate-600 border-slate-200' },
  on_hold:   { label: 'מושהה',   dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700 border-amber-200' },
}
const TASK_META = {
  pending:     { label: 'ממתין',  color: 'bg-slate-100 text-slate-500' },
  in_progress: { label: 'בביצוע', color: 'bg-blue-100 text-blue-700' },
  done:        { label: 'הושלם',  color: 'bg-emerald-100 text-emerald-700' },
}

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tasks, setTasks] = useState([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', client_id: '', start_date: '', end_date: '' })
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', assigned_to: '' })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
    ])
    setProjects(p || [])
    setClients(c || [])
    setLoading(false)
  }

  async function fetchTasks(projectId) {
    const { data } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('sort_order').order('created_at')
    setTasks(data || [])
  }

  function selectProject(p) { setSelected(p); fetchTasks(p.id) }

  async function saveProject() {
    if (!projectForm.name.trim() || !projectForm.client_id) return
    await supabase.from('projects').insert(projectForm)
    setShowNewProject(false)
    setProjectForm({ name: '', client_id: '', start_date: '', end_date: '' })
    fetchAll()
  }

  async function saveTask() {
    if (!taskForm.name.trim()) return
    await supabase.from('tasks').insert({ ...taskForm, project_id: selected.id })
    setShowNewTask(false)
    setTaskForm({ name: '', due_date: '', assigned_to: '' })
    fetchTasks(selected.id)
  }

  async function updateTaskStatus(taskId, status) {
    await supabase.from('tasks').update({ status }).eq('id', taskId)
    fetchTasks(selected.id)
  }

  async function signTask(taskId) {
    await supabase.from('tasks').update({ client_signed: true, client_signed_at: new Date().toISOString() }).eq('id', taskId)
    fetchTasks(selected.id)
  }

  async function deleteTask(taskId) {
    await supabase.from('tasks').delete().eq('id', taskId)
    fetchTasks(selected.id)
  }

  async function updateProjectStatus(projectId, status) {
    await supabase.from('projects').update({ status }).eq('id', projectId)
    fetchAll()
    if (selected?.id === projectId) setSelected({ ...selected, status })
  }

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  // ── תצוגת פרויקט נבחר ──
  if (selected) {
    const done = tasks.filter(t => t.status === 'done').length
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0
    const meta = STATUS_META[selected.status] || STATUS_META.active

    return (
      <div>
        {/* breadcrumb */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-indigo-600 transition">פרויקטים</button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-800 font-medium">{selected.name}</span>
          <span className={`inline-flex items-center gap-1 text-xs border px-2.5 py-0.5 rounded-full font-medium mr-1 ${meta.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
          <div className="mr-auto flex gap-2">
            <select value={selected.status} onChange={e => updateProjectStatus(selected.id, e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
              {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={() => setShowNewTask(true)}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-indigo-700 transition">
              + משימה
            </button>
          </div>
        </div>

        {/* פס התקדמות */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium text-slate-700">התקדמות: {done}/{tasks.length} משימות</span>
              <span className="font-bold text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* משימות */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">📋</div>
            <h3 className="text-base font-semibold text-slate-700 mb-1">אין משימות עדיין</h3>
            <p className="text-sm text-slate-400 mb-5">הוסיפי משימות כדי לעקוב אחרי ההתקדמות</p>
            <button onClick={() => setShowNewTask(true)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              + משימה ראשונה
            </button>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task, idx) => {
            const tm = TASK_META[task.status]
            return (
              <div key={task.id} className={`group bg-white rounded-2xl border p-4 flex items-start gap-4 transition-all ${
                task.status === 'done' ? 'border-slate-100 opacity-70' : 'border-slate-100 hover:border-indigo-200 hover:shadow-sm'
              }`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  task.status === 'done' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'
                }`}>{idx + 1}</div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                    {task.name}
                  </p>
                  <div className="flex gap-3 mt-1 flex-wrap">
                    {task.due_date && <span className="text-xs text-slate-400">📅 {task.due_date}</span>}
                    {task.assigned_to && <span className="text-xs text-slate-400">👤 {task.assigned_to}</span>}
                    {task.client_signed && (
                      <span className="text-xs text-emerald-600 font-medium">
                        ✅ חתום {task.client_signed_at ? new Date(task.client_signed_at).toLocaleDateString('he-IL') : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value)}
                    className={`text-xs px-2.5 py-1 rounded-full border-0 cursor-pointer font-medium ${tm.color}`}>
                    {Object.entries(TASK_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {!task.client_signed && (
                    <button onClick={() => signTask(task.id)}
                      className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full hover:bg-purple-100 transition font-medium">
                      חתימת לקוח
                    </button>
                  )}
                  <button onClick={() => deleteTask(task.id)} className="text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 text-sm">✕</button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal משימה */}
        {showNewTask && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-800">משימה חדשה</h2>
                <button onClick={() => setShowNewTask(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">שם המשימה *</label>
                  <input value={taskForm.name} onChange={e => setTaskForm({...taskForm, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                    placeholder="לדוגמה: תכנון מטבח" autoFocus />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">תאריך יעד</label>
                    <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">אחראי</label>
                    <input value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                      placeholder="שם" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
                <button onClick={saveTask} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">הוסף</button>
                <button onClick={() => setShowNewTask(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── רשימת פרויקטים ──
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">פרויקטים</h1>
          <p className="text-sm text-slate-400 mt-0.5">{projects.length} פרויקטים</p>
        </div>
        <button onClick={() => setShowNewProject(true)}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
          + פרויקט חדש
        </button>
      </div>

      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl mb-4">📋</div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">אין פרויקטים עדיין</h3>
          <p className="text-sm text-slate-400 mb-5">צרי פרויקט ראשון</p>
          <button onClick={() => setShowNewProject(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">+ פרויקט חדש</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(p => {
          const meta = STATUS_META[p.status] || STATUS_META.active
          return (
            <div key={p.id} onClick={() => selectProject(p)}
              className="bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">📋</div>
                <span className={`inline-flex items-center gap-1 text-xs border px-2.5 py-0.5 rounded-full font-medium ${meta.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <h3 className="font-semibold text-slate-800 mb-0.5">{p.name}</h3>
              <p className="text-sm text-slate-400">{p.clients?.name}</p>
              {(p.start_date || p.end_date) && (
                <p className="text-xs text-slate-300 mt-2">
                  {p.start_date && p.start_date} {p.start_date && p.end_date && '→'} {p.end_date && p.end_date}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal פרויקט */}
      {showNewProject && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">פרויקט חדש</h2>
              <button onClick={() => setShowNewProject(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">שם הפרויקט *</label>
                <input value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                  placeholder="לדוגמה: דירת רמת גן" autoFocus />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">לקוח *</label>
                <select value={projectForm.client_id} onChange={e => setProjectForm({...projectForm, client_id: e.target.value})}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition">
                  <option value="">בחרי לקוח...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">תאריך התחלה</label>
                  <input type="date" value={projectForm.start_date} onChange={e => setProjectForm({...projectForm, start_date: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">תאריך סיום</label>
                  <input type="date" value={projectForm.end_date} onChange={e => setProjectForm({...projectForm, end_date: e.target.value})}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={saveProject} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">צור פרויקט</button>
              <button onClick={() => setShowNewProject(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
