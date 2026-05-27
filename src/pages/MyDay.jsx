import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Circle, Plus, X, ChevronRight, CalendarX, CalendarCheck, CalendarDays, FolderKanban, Pencil, Zap, ListChecks, Pin } from 'lucide-react'

function fmtDay(d) {
  if (!d) return ''
  const date = new Date(d)
  const today = new Date(); today.setHours(0,0,0,0)
  const dateClean = new Date(date); dateClean.setHours(0,0,0,0)
  if (dateClean.getTime() === today.getTime()) return 'Today'
  const diff = Math.round((today - dateClean) / 86400000)
  if (diff > 0) return `${diff} days late`
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const PROJECT_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777']
function getProjectColor(pid) {
  if (!pid) return '#94A3B8'
  let h = 0; for (let i = 0; i < pid.length; i++) h = pid.charCodeAt(i) + ((h << 5) - h)
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length]
}

export default function MyDay({ userRole, onOpenProject }) {
  const [projectTasks, setProjectTasks] = useState([])
  const [dailyTasks, setDailyTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [myProjects, setMyProjects] = useState([])
  const [projectTaskCounts, setProjectTaskCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [noteProject, setNoteProject] = useState('')
  const [addTaskInput, setAddTaskInput] = useState('')
  const [addTaskProject, setAddTaskProject] = useState('')
  const [weeklyDone, setWeeklyDone] = useState(0)
  const [weeklyTotal, setWeeklyTotal] = useState(0)

  const userName = userRole?.name || 'User'
  const userEmail = userRole?.email || ''

  useEffect(() => { fetchAll(); checkGoogle().then(() => pullFromGoogle()) }, [])

  async function checkGoogle() {
    if (!userEmail) return
    const { data } = await supabase.from('google_task_tokens').select('id').eq('user_email', userEmail).maybeSingle()
    setGoogleConnected(!!data)
  }

  async function fetchAll() {
    const [{ data: tasks }, { data: daily }, { data: proj }, { data: allTasks }] = await Promise.all([
      supabase.from('tasks').select('*, projects(name)').eq('assigned_to', userName).neq('status', 'done').order('due_date'),
      supabase.from('daily_tasks').select('*').eq('user_email', userEmail).order('created_at', { ascending: true }),
      supabase.from('projects').select('id, name, status, default_assignee').eq('status', 'active').order('name'),
      supabase.from('tasks').select('id, project_id, status, due_date, level').eq('assigned_to', userName),
    ])
    setProjectTasks(tasks || [])
    setDailyTasks(daily || [])
    setProjects(proj || [])
    setMyProjects((proj || []).filter(p => p.default_assignee === userName))

    const now = new Date(); now.setHours(0,0,0,0)
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7)
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - now.getDay())
    const counts = {}
    let wDone = 0, wTotal = 0
    ;(allTasks || []).forEach(t => {
      if (!t.project_id || t.level === 'subtask') return
      if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0, overdue: 0, dueSoon: 0 }
      counts[t.project_id].total++
      if (t.status === 'done') counts[t.project_id].done++
      if (t.status !== 'done' && t.due_date && new Date(t.due_date) < now) counts[t.project_id].overdue++
      if (t.status !== 'done' && t.due_date) {
        const due = new Date(t.due_date)
        if (due >= now && due <= weekEnd) counts[t.project_id].dueSoon++
      }
      if (t.due_date) {
        const due = new Date(t.due_date)
        if (due >= weekStart && due <= weekEnd) { wTotal++; if (t.status === 'done') wDone++ }
      }
    })
    setProjectTaskCounts(counts)
    setWeeklyDone(wDone)
    setWeeklyTotal(wTotal)
    setLoading(false)
  }

  const today = new Date(); today.setHours(0,0,0,0)
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7)
  const overdueTasks = projectTasks.filter(t => t.due_date && new Date(t.due_date) < today)
  const todayOnlyTasks = projectTasks.filter(t => { if (!t.due_date) return false; const d = new Date(t.due_date); d.setHours(0,0,0,0); return d.getTime() === today.getTime() })
  const weekTasks = projectTasks.filter(t => !overdueTasks.includes(t) && !todayOnlyTasks.includes(t) && t.due_date && new Date(t.due_date) > today && new Date(t.due_date) <= weekEnd)

  async function syncGoogle(action, taskId, taskData) {
    const email = userEmail || userRole?.email
    if (!email) return
    try { await fetch('/api/sync-tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, user_email: email, task_id: taskId, task_data: taskData }) }) } catch {}
  }

  async function pullFromGoogle() {
    const email = userEmail || userRole?.email
    if (!email) return
    try {
      const res = await fetch('/api/sync-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pull', user_email: email }),
      })
      const data = await res.json()
      if (data?.updated > 0) fetchAll()
    } catch {}
  }

  async function toggleTask(taskId) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
    fetchAll()
    syncGoogle('complete', taskId)
  }

  async function toggleDaily(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    // עדכון אופטימיסטי — UI מיד
    setDailyTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    supabase.from('daily_tasks').update({ status: newStatus }).eq('id', taskId)
    syncGoogle(newStatus === 'done' ? 'complete' : 'uncomplete', taskId)
  }

  async function addQuickTask() {
    if (!addTaskInput.trim()) return
    const email = userEmail || userRole?.email
    if (!email) return
    const title = addTaskInput.trim()
    const projId = addTaskProject || null
    // עדכון אופטימיסטי — מוסיף ל-UI מיד
    const tempId = 'temp-' + Date.now()
    setDailyTasks(prev => [{ id: tempId, title, status: 'pending', due_date: todayStr, project_id: projId, type: 'task', user_email: email }, ...prev])
    setAddTaskInput(''); setAddTaskProject('')
    // שמירה ב-DB ברקע
    const { data } = await supabase.from('daily_tasks').insert({
      user_email: email, title, due_date: todayStr,
      project_id: projId, type: 'task',
    }).select().single()
    if (data) {
      setDailyTasks(prev => prev.map(t => t.id === tempId ? data : t))
      syncGoogle('create', data.id, { name: title, due_date: todayStr })
    }
  }

  async function addNote() {
    if (!noteInput.trim()) return
    const email = userEmail || userRole?.email
    if (!email) return
    await supabase.from('daily_tasks').insert({
      user_email: email, title: noteInput.trim(), due_date: todayStr, type: 'note',
    })
    setNoteInput('')
    fetchAll()
  }

  async function deleteDaily(id) { await supabase.from('daily_tasks').delete().eq('id', id); fetchAll() }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const quickTasks = dailyTasks.filter(t => t.type !== 'note')
  const notes = dailyTasks.filter(t => t.type === 'note')
  const activeDailyTasks = quickTasks.filter(t => t.status !== 'done')
  const doneDailyTasks = quickTasks.filter(t => t.status === 'done')
  const efficiency = weeklyTotal > 0 ? Math.round((weeklyDone / weeklyTotal) * 100) : 0

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  function TaskRow({ task, badge }) {
    const pName = task.projects?.name; const pColor = getProjectColor(task.project_id)
    return (
      <div className="flex items-center px-6 py-4 hover:bg-[#F8F9FC] transition-colors group">
        <button onClick={() => toggleTask(task.id)} className="mr-4 shrink-0">
          <Circle size={20} className="text-[#CBD5E1] group-hover:text-emerald-500 transition" strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-[#091426]">{task.name}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: pColor }} />
            <span className="text-[12px] text-[#64748B]">{pName}</span>
          </div>
        </div>
        {badge}
        <button onClick={() => onOpenProject && onOpenProject(task.project_id)}
          className="opacity-0 group-hover:opacity-100 ml-2 text-[#94A3B8] hover:text-[#091426] transition shrink-0">
          <ChevronRight size={16} strokeWidth={1.8} />
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-extrabold text-[#091426] font-[Manrope]">My Day</h1>
          <div className="h-6 w-px bg-[#E2E8F0]" />
          <p className="text-sm text-[#64748B]">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          {googleConnected ? (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5"><CheckCircle2 size={14} strokeWidth={1.8} /> Synced</span>
          ) : (
            <a href={`/api/google-tasks-auth?email=${encodeURIComponent(userEmail)}`}
              className="text-xs text-[#64748B] bg-[#F3F3F3] hover:bg-[#E2E8F0] px-3 py-2 rounded-xl font-medium transition">Connect Google Tasks</a>
          )}
        </div>
      </div>

      {/* KPI Cards — Overdue / Today / This Week */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border-l-[6px] border-[#DC2626] flex justify-between items-center">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Overdue Tasks</p>
            <h3 className="text-[32px] font-extrabold text-[#DC2626]">{String(overdueTasks.length).padStart(2, '0')}</h3>
          </div>
          <div className="p-3 bg-red-50 rounded-lg"><CalendarX size={22} className="text-[#DC2626]" strokeWidth={1.8} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border-l-[6px] border-[#D97706] flex justify-between items-center">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Due Today</p>
            <h3 className="text-[32px] font-extrabold text-[#D97706]">{String(todayOnlyTasks.length).padStart(2, '0')}</h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg"><CalendarCheck size={22} className="text-[#D97706]" strokeWidth={1.8} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border-l-[6px] border-[#059669] flex justify-between items-center">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">This Week</p>
            <h3 className="text-[32px] font-extrabold text-[#059669]">{String(weekTasks.length).padStart(2, '0')}</h3>
          </div>
          <div className="p-3 bg-emerald-50 rounded-lg"><CalendarDays size={22} className="text-[#059669]" strokeWidth={1.8} /></div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left Panel ── */}
        <div className="lg:w-[60%] space-y-6">
          {/* Task Timeline — one container */}
          <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
            {/* Overdue */}
            {overdueTasks.length > 0 && (<>
              <div className="bg-[#FEE2E2] border-l-4 border-[#DC2626] px-6 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3 text-[#DC2626] font-bold text-[13px]">
                  <CalendarX size={18} strokeWidth={1.8} /><span className="uppercase tracking-wider">Overdue</span>
                </div>
                <span className="bg-[#DC2626] text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold">{overdueTasks.length}</span>
              </div>
              <div className="divide-y divide-[#E2E8F0]">
                {overdueTasks.map(t => <TaskRow key={t.id} task={t} badge={
                  <span className="text-[11px] font-bold bg-red-50 text-[#DC2626] px-3 py-1 rounded-full shrink-0">{fmtDay(t.due_date)}</span>
                } />)}
              </div>
            </>)}

            {/* Today */}
            <div className={`bg-[#FEF3C7] border-l-4 border-[#D97706] px-6 py-3 flex justify-between items-center ${overdueTasks.length > 0 ? 'mt-1' : ''}`}>
              <div className="flex items-center gap-3 text-[#D97706] font-bold text-[13px]">
                <CalendarCheck size={18} strokeWidth={1.8} /><span className="uppercase tracking-wider">Today</span>
              </div>
              <span className="bg-[#D97706] text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold">{todayOnlyTasks.length}</span>
            </div>
            {todayOnlyTasks.length === 0 ? (
              <div className="px-6 py-6 text-center text-sm text-[#64748B]">All clear for today!</div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {todayOnlyTasks.map(t => <TaskRow key={t.id} task={t} badge={
                  <span className="text-[11px] font-bold bg-amber-50 text-[#D97706] px-3 py-1 rounded-full shrink-0">Today</span>
                } />)}
              </div>
            )}

            {/* This Week */}
            <div className="bg-[#D1FAE5] border-l-4 border-[#059669] px-6 py-3 flex justify-between items-center mt-1">
              <div className="flex items-center gap-3 text-[#059669] font-bold text-[13px]">
                <CalendarDays size={18} strokeWidth={1.8} /><span className="uppercase tracking-wider">This Week</span>
              </div>
              <span className="bg-[#059669] text-white text-[11px] px-2.5 py-0.5 rounded-full font-bold">{weekTasks.length}</span>
            </div>
            {weekTasks.length === 0 ? (
              <div className="px-6 py-6 text-center text-sm text-[#64748B]">No upcoming tasks this week</div>
            ) : (
              <div className="divide-y divide-[#E2E8F0]">
                {weekTasks.map(t => <TaskRow key={t.id} task={t} badge={
                  <span className="text-[12px] text-[#64748B] font-medium bg-[#F3F3F3] px-3 py-1 rounded-full shrink-0">{fmtDay(t.due_date)}</span>
                } />)}
              </div>
            )}

          </div>

        </div>

        {/* ── Right Panel ── */}
        <div className="lg:w-[40%] space-y-6">
          {/* Quick Tasks — למעלה, הכי בולט */}
          <section>
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] overflow-hidden">
              <div className="bg-[#091426] px-5 py-3 flex items-center justify-between">
                <h2 className="font-bold text-sm text-white font-[Manrope] flex items-center gap-2">
                  <ListChecks size={16} strokeWidth={1.8} className="text-[#B8960B]" /> Quick Tasks
                </h2>
                <span className="text-[11px] text-[#64748B] font-medium">{activeDailyTasks.length} tasks</span>
              </div>

              {/* Add task inline */}
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                <Plus size={16} className="text-[#B8960B] shrink-0" strokeWidth={2} />
                <input value={addTaskInput} onChange={e => setAddTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addQuickTask()}
                  placeholder="Add a quick task..."
                  className="flex-1 text-sm bg-transparent border-0 focus:outline-none placeholder:text-[#94A3B8] text-[#091426]" />
                <select value={addTaskProject} onChange={e => setAddTaskProject(e.target.value)}
                  className="text-[10px] bg-[#F3F3F3] rounded px-2 py-1 text-[#64748B] border-0 w-24">
                  <option value="">Project</option>
                  {myProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Task list */}
              {activeDailyTasks.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[#94A3B8]">No quick tasks yet</div>
              ) : (
                <div className="divide-y divide-[#E2E8F0]">
                  {activeDailyTasks.map(t => {
                    const pName = t.project_id ? projects.find(p => p.id === t.project_id)?.name : null
                    const pColor = getProjectColor(t.project_id)
                    return (
                      <div key={t.id} className="px-4 py-3 flex items-center gap-3 group hover:bg-[#F8F9FC] transition">
                        <button onClick={() => toggleDaily(t.id, t.status)} className="shrink-0">
                          <Circle size={18} className="text-[#CBD5E1] group-hover:text-emerald-500 transition" strokeWidth={1.8} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#091426]">{t.title}</p>
                          {pName && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pColor }} />
                              <span className="text-[10px] text-[#64748B]">{pName}</span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => deleteDaily(t.id)}
                          className="opacity-0 group-hover:opacity-100 text-[#94A3B8] hover:text-red-500 transition shrink-0">
                          <X size={14} strokeWidth={1.8} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Done tasks — עם פס, נמחקים אחרי יום */}
              {doneDailyTasks.length > 0 && (
                <div className="px-4 py-2 bg-[#F8F9FC] border-t border-[#E2E8F0]">
                  {doneDailyTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2 py-1.5 opacity-50">
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" strokeWidth={1.8} />
                      <span className="text-sm text-[#091426] line-through truncate flex-1">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* My Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-[#091426] font-[Manrope]">My Projects</h2>
              <button onClick={() => onOpenProject && onOpenProject(null)}
                className="text-xs text-[#B8960B] hover:text-[#9A7D09] font-semibold transition">Browse all →</button>
            </div>
            <div className="space-y-3">
              {myProjects.length === 0 && (
                <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] p-6 text-center">
                  <p className="text-sm text-[#94A3B8]">No projects assigned yet</p>
                </div>
              )}
              {myProjects.map(p => {
                const color = getProjectColor(p.id)
                const c = projectTaskCounts[p.id] || { total: 0, done: 0, overdue: 0, dueSoon: 0 }
                const pct = c.total > 0 ? Math.round(c.done / c.total * 100) : 0
                return (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
                    onClick={() => onOpenProject && onOpenProject(p.id)}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
                        <FolderKanban size={22} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-[15px] text-[#091426] truncate">{p.name}</h4>
                        {c.overdue > 0 ? (
                          <p className="text-[12px] text-red-500 font-semibold">{c.overdue} tasks overdue</p>
                        ) : c.dueSoon > 0 ? (
                          <p className="text-[12px] font-medium" style={{ color }}>{c.dueSoon} tasks due soon</p>
                        ) : (
                          <p className="text-[12px] text-emerald-600 font-medium">On schedule</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[11px] text-[#94A3B8]">Progress</span>
                          <span className="text-[12px] font-bold text-[#091426]">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-[#F3F3F3] rounded-full overflow-hidden mt-1">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Weekly Overview */}
          <section>
            <div className="bg-[#091426] rounded-xl p-6 text-white">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-lg font-[Manrope]">Weekly Overview</h2>
                  <p className="text-xs text-[#64748B] mt-0.5">Efficiency Metrics</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-[#94A3B8]">Tasks Completed</span>
                <span className="font-bold text-[#B8960B]">{weeklyDone} / {weeklyTotal}</span>
              </div>
              <div className="h-2 w-full bg-[#1E293B] rounded-full overflow-hidden mb-5">
                <div className="h-full rounded-full bg-[#B8960B] transition-all" style={{ width: `${weeklyTotal > 0 ? (weeklyDone / weeklyTotal * 100) : 0}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#1E293B] rounded-lg p-4 text-center">
                  <p className="text-2xl font-extrabold text-[#B8960B]">{efficiency}%</p>
                  <p className="text-[10px] text-[#64748B] uppercase tracking-widest mt-1">Efficiency</p>
                </div>
                <div className="bg-[#1E293B] rounded-lg p-4 text-center">
                  <p className="text-2xl font-extrabold text-white">{weeklyDone}</p>
                  <p className="text-[10px] text-[#64748B] uppercase tracking-widest mt-1">Done This Week</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
