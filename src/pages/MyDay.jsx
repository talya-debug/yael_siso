import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, X, ChevronRight, Calendar } from 'lucide-react'

function fmtDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
}

function fmtDay(d) {
  if (!d) return ''
  const date = new Date(d)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const dateClean = new Date(date); dateClean.setHours(0,0,0,0)
  if (dateClean.getTime() === today.getTime()) return 'Today'
  if (dateClean.getTime() === tomorrow.getTime()) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

// צבעי פרויקט — פלטה של 10 צבעים רכים
const PROJECT_COLORS = [
  '#5B8DEF', '#E87461', '#9B6DD7', '#4ECDC4', '#F2994A',
  '#6C63FF', '#EB5E80', '#27AE60', '#F2C94C', '#56CCF2'
]
function getProjectColor(projectId) {
  if (!projectId) return '#6B7A90'
  let hash = 0
  for (let i = 0; i < projectId.length; i++) hash = projectId.charCodeAt(i) + ((hash << 5) - hash)
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

export default function MyDay({ userRole }) {
  const [projectTasks, setProjectTasks] = useState([])
  const [dailyTasks, setDailyTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ title: '', due_date: new Date().toISOString().split('T')[0], project_id: '' })

  const userName = userRole?.name || 'User'
  const userEmail = userRole?.email || ''

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: tasks }, { data: daily }, { data: proj }] = await Promise.all([
      supabase.from('tasks').select('*, projects(name)').eq('assigned_to', userName).neq('status', 'done').order('due_date'),
      supabase.from('daily_tasks').select('*').eq('user_email', userEmail).order('due_date'),
      supabase.from('projects').select('id, name').eq('status', 'active').order('name'),
    ])
    setProjectTasks(tasks || [])
    setDailyTasks(daily || [])
    setProjects(proj || [])
    setLoading(false)
  }

  // סיווג משימות פרויקט
  const today = new Date(); today.setHours(0,0,0,0)
  const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + 7)

  const overdue = projectTasks.filter(t => {
    if (!t.due_date) return false
    return new Date(t.due_date) < today
  })

  const activeNow = projectTasks.filter(t => {
    if (overdue.includes(t)) return false
    const start = t.start_date ? new Date(t.start_date) : null
    const due = t.due_date ? new Date(t.due_date) : null
    if (start && start <= today && due && due >= today) return true
    if (!start && due && due >= today && due <= endOfWeek) return true
    return false
  })

  const thisWeek = projectTasks.filter(t => {
    if (overdue.includes(t) || activeNow.includes(t)) return false
    const start = t.start_date ? new Date(t.start_date) : null
    const due = t.due_date ? new Date(t.due_date) : null
    if (due && due > today && due <= endOfWeek) return true
    if (start && start > today && start <= endOfWeek) return true
    return false
  })

  // משימות יומיומיות — פעילות + הושלמו היום
  const activeDailyTasks = dailyTasks.filter(t => t.status !== 'done')
  const doneTodayDaily = dailyTasks.filter(t => t.status === 'done' && t.due_date === today.toISOString().split('T')[0])

  async function toggleProjectTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    setProjectTasks(prev => prev.filter(t => t.id !== taskId))
  }

  async function toggleDailyTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await supabase.from('daily_tasks').update({ status: newStatus }).eq('id', taskId)
    fetchAll()
  }

  async function addDailyTask() {
    if (!addForm.title.trim()) return
    await supabase.from('daily_tasks').insert({
      user_email: userEmail,
      title: addForm.title.trim(),
      due_date: addForm.due_date || null,
      project_id: addForm.project_id || null,
    })
    setAddForm({ title: '', due_date: new Date().toISOString().split('T')[0], project_id: '' })
    setShowAdd(false)
    fetchAll()
  }

  async function deleteDailyTask(id) {
    await supabase.from('daily_tasks').delete().eq('id', id)
    setDailyTasks(prev => prev.filter(t => t.id !== id))
  }

  // שעת ברכה
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  function TaskRow({ task, isProject = true, onToggle, onDelete }) {
    const projectName = isProject ? task.projects?.name : (projects.find(p => p.id === task.project_id)?.name)
    const projectColor = getProjectColor(task.project_id)
    const isDone = task.status === 'done'

    return (
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-[#F3F3F3] last:border-0 hover:bg-[#F9F9F9] transition-colors group ${isDone ? 'opacity-50' : ''}`}>
        <button onClick={() => onToggle(task.id, task.status)}
          className="shrink-0">
          {isDone
            ? <CheckCircle2 size={20} className="text-emerald-500" strokeWidth={1.8} />
            : <Circle size={20} className="text-[#d1d5db] hover:text-[#091426] transition" strokeWidth={1.8} />
          }
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${isDone ? 'line-through text-[#6B7A90]' : 'text-[#091426]'}`}>
            {task.title || task.name}
          </p>
          {projectName && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: projectColor }} />
              <span className="text-xs text-[#6B7A90]">{projectName}</span>
            </div>
          )}
        </div>
        {task.due_date && (
          <span className={`text-xs shrink-0 ${new Date(task.due_date) < today && !isDone ? 'text-red-500 font-bold' : 'text-[#6B7A90]'}`}>
            {fmtDay(task.due_date)}
          </span>
        )}
        {!isProject && onDelete && (
          <button onClick={() => onDelete(task.id)}
            className="opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-red-500 p-1 rounded-lg hover:bg-red-50 shrink-0">
            <X size={14} strokeWidth={1.8} />
          </button>
        )}
      </div>
    )
  }

  function Section({ title, icon: Icon, iconColor, tasks, isProject = true, onToggle, onDelete, emptyText, accent }) {
    if (tasks.length === 0 && !emptyText) return null
    return (
      <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
        <div className={`flex items-center gap-2 px-4 py-3 border-b border-[#F3F3F3] ${accent || 'bg-[#F9F9F9]'}`}>
          <Icon size={16} className={iconColor || 'text-[#6B7A90]'} strokeWidth={1.8} />
          <span className="text-xs font-bold tracking-wider uppercase text-[#6B7A90]">{title}</span>
          <span className="text-xs text-[#6B7A90] ml-auto">{tasks.length}</span>
        </div>
        {tasks.length === 0 ? (
          <p className="px-4 py-6 text-sm text-[#6B7A90] text-center italic">{emptyText}</p>
        ) : (
          tasks.map(t => (
            <TaskRow key={t.id} task={t} isProject={isProject} onToggle={onToggle} onDelete={onDelete} />
          ))
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* כותרת */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">
            {greeting}, {userName.split(' ')[0]}
          </h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-2">
          <Plus size={15} strokeWidth={1.8} /> Add Task
        </button>
      </div>

      {/* באיחור */}
      {overdue.length > 0 && (
        <Section
          title="Overdue"
          icon={AlertCircle}
          iconColor="text-red-500"
          tasks={overdue}
          onToggle={toggleProjectTask}
          accent="bg-red-50/50"
        />
      )}

      {/* פעיל עכשיו */}
      <Section
        title="Active Now"
        icon={Clock}
        iconColor="text-[#7B5800]"
        tasks={activeNow}
        onToggle={toggleProjectTask}
        emptyText="No active tasks right now"
      />

      {/* השבוע */}
      <Section
        title="This Week"
        icon={Calendar}
        iconColor="text-[#6B7A90]"
        tasks={thisWeek}
        onToggle={toggleProjectTask}
      />

      {/* משימות יומיומיות */}
      <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F3F3] bg-[#F9F9F9]">
          <CheckCircle2 size={16} className="text-[#091426]" strokeWidth={1.8} />
          <span className="text-xs font-bold tracking-wider uppercase text-[#6B7A90]">My Tasks</span>
          <span className="text-xs text-[#6B7A90] ml-auto">{activeDailyTasks.length}</span>
        </div>
        {activeDailyTasks.length === 0 && doneTodayDaily.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[#6B7A90] mb-3">No tasks yet</p>
            <button onClick={() => setShowAdd(true)}
              className="text-sm text-[#7B5800] font-medium hover:text-[#B8960B] transition">
              + Add your first task
            </button>
          </div>
        ) : (
          <>
            {activeDailyTasks.map(t => (
              <TaskRow key={t.id} task={t} isProject={false} onToggle={toggleDailyTask} onDelete={deleteDailyTask} />
            ))}
            {doneTodayDaily.map(t => (
              <TaskRow key={t.id} task={t} isProject={false} onToggle={toggleDailyTask} onDelete={deleteDailyTask} />
            ))}
          </>
        )}
      </div>

      {/* מודאל הוספת משימה */}
      {showAdd && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
              <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">Add Task</h2>
              <button onClick={() => setShowAdd(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Task *</label>
                <input value={addForm.title} onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                  autoFocus onKeyDown={e => e.key === 'Enter' && addDailyTask()}
                  placeholder="What needs to be done?"
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Due Date</label>
                  <input type="date" value={addForm.due_date} onChange={e => setAddForm(p => ({ ...p, due_date: e.target.value }))}
                    className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Project (optional)</label>
                  <select value={addForm.project_id} onChange={e => setAddForm(p => ({ ...p, project_id: e.target.value }))}
                    className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20">
                    <option value="">None</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
              <button onClick={addDailyTask} disabled={!addForm.title.trim()}
                className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
                Add Task
              </button>
              <button onClick={() => setShowAdd(false)}
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
