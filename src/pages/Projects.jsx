import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STATUS_LABELS = { active: 'פעיל', completed: 'הושלם', on_hold: 'מושהה' }
const STATUS_COLORS = { active: 'bg-green-100 text-green-700', completed: 'bg-gray-100 text-gray-600', on_hold: 'bg-yellow-100 text-yellow-700' }
const TASK_STATUS = { pending: 'ממתין', in_progress: 'בביצוע', done: 'הושלם' }
const TASK_COLORS = { pending: 'bg-gray-100 text-gray-500', in_progress: 'bg-blue-100 text-blue-700', done: 'bg-green-100 text-green-700' }

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [contents, setContents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // פרויקט נבחר לתצוגת טיימליין
  const [tasks, setTasks] = useState([])
  const [showNewProject, setShowNewProject] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [projectForm, setProjectForm] = useState({ name: '', client_id: '', start_date: '', end_date: '' })
  const [taskForm, setTaskForm] = useState({ name: '', due_date: '', assigned_to: '' })

  useEffect(() => {
    fetchAll()
  }, [])

  async function fetchAll() {
    const [{ data: p }, { data: c }, { data: ct }] = await Promise.all([
      supabase.from('projects').select('*, clients(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, name').order('name'),
      supabase.from('contents').select('id, name').order('name'),
    ])
    setProjects(p || [])
    setClients(c || [])
    setContents(ct || [])
    setLoading(false)
  }

  async function fetchTasks(projectId) {
    const { data } = await supabase.from('tasks').select('*').eq('project_id', projectId).order('sort_order').order('created_at')
    setTasks(data || [])
  }

  function selectProject(p) {
    setSelected(p)
    fetchTasks(p.id)
  }

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

  if (loading) return <div className="text-gray-400 p-8">טוען...</div>

  // תצוגת טיימליין לפרויקט נבחר
  if (selected) {
    const done = tasks.filter(t => t.status === 'done').length
    const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0

    return (
      <div>
        {/* כותרת */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setSelected(null)} className="text-blue-500 hover:underline text-sm">← חזרה לפרויקטים</button>
          <span className="text-gray-300">|</span>
          <h1 className="text-xl font-bold text-gray-800">{selected.name}</h1>
          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[selected.status]}`}>
            {STATUS_LABELS[selected.status]}
          </span>
          <div className="mr-auto flex gap-2">
            <select value={selected.status} onChange={e => updateProjectStatus(selected.id, e.target.value)}
              className="text-sm border rounded-lg px-2 py-1">
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={() => setShowNewTask(true)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700">
              + משימה
            </button>
          </div>
        </div>

        {/* פס התקדמות */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl border p-4 mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>התקדמות: {done}/{tasks.length} משימות</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* טיימליין משימות */}
        {tasks.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <div className="text-4xl mb-2">📋</div>
            <p>אין משימות — הוסיפי את המשימות לפרויקט</p>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task, idx) => (
            <div key={task.id} className={`bg-white rounded-xl border p-4 ${task.status === 'done' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-6 text-center">{idx + 1}</span>
                  <div>
                    <p className={`font-medium text-gray-800 ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                      {task.name}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                      {task.due_date && <span>📅 {task.due_date}</span>}
                      {task.assigned_to && <span>👤 {task.assigned_to}</span>}
                      {task.client_signed && <span className="text-green-600">✅ חתום ע"י לקוח {task.client_signed_at ? new Date(task.client_signed_at).toLocaleDateString('he-IL') : ''}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={task.status} onChange={e => updateTaskStatus(task.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 ${TASK_COLORS[task.status]}`}>
                    {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  {!task.client_signed && (
                    <button onClick={() => signTask(task.id)} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full hover:bg-purple-200">
                      חתימת לקוח
                    </button>
                  )}
                  <button onClick={() => deleteTask(task.id)} className="text-red-400 text-xs hover:text-red-600">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* טופס משימה חדשה */}
        {showNewTask && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
              <h2 className="text-lg font-bold mb-4">משימה חדשה</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">שם המשימה *</label>
                  <input value={taskForm.name} onChange={e => setTaskForm({...taskForm, name: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="לדוגמה: תכנון מטבח" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">תאריך יעד</label>
                  <input type="date" value={taskForm.due_date} onChange={e => setTaskForm({...taskForm, due_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">אחראי</label>
                  <input value={taskForm.assigned_to} onChange={e => setTaskForm({...taskForm, assigned_to: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="שם האחראי" />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={saveTask} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">הוסף</button>
                <button onClick={() => setShowNewTask(false)} className="flex-1 border py-2 rounded-lg text-sm text-gray-600">ביטול</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // רשימת פרויקטים
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">פרויקטים</h1>
        <button onClick={() => setShowNewProject(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700">
          + פרויקט חדש
        </button>
      </div>

      {projects.length === 0 && (
        <div className="text-center text-gray-400 py-16">
          <div className="text-5xl mb-3">📋</div>
          <p>אין פרויקטים עדיין</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        {projects.map(p => (
          <div key={p.id} onClick={() => selectProject(p)}
            className="bg-white rounded-xl border p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-800">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">{p.clients?.name}</p>
                {(p.start_date || p.end_date) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {p.start_date && `התחלה: ${p.start_date}`}
                    {p.start_date && p.end_date && ' · '}
                    {p.end_date && `סיום: ${p.end_date}`}
                  </p>
                )}
              </div>
              <span className={`text-xs px-3 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>
                {STATUS_LABELS[p.status]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* טופס פרויקט חדש */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">פרויקט חדש</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600 block mb-1">שם הפרויקט *</label>
                <input value={projectForm.name} onChange={e => setProjectForm({...projectForm, name: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="לדוגמה: דירת רמת גן" />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">לקוח *</label>
                <select value={projectForm.client_id} onChange={e => setProjectForm({...projectForm, client_id: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">בחרי לקוח...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">תאריך התחלה</label>
                  <input type="date" value={projectForm.start_date} onChange={e => setProjectForm({...projectForm, start_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">תאריך סיום</label>
                  <input type="date" value={projectForm.end_date} onChange={e => setProjectForm({...projectForm, end_date: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveProject} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700">צור פרויקט</button>
              <button onClick={() => setShowNewProject(false)} className="flex-1 border py-2 rounded-lg text-sm text-gray-600">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
