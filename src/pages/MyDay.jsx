import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Circle, Plus, X, ChevronRight, Calendar, FolderKanban, ListChecks, AlertCircle, Pencil, Zap, Home, Building2, Hammer, Ruler, Hotel } from 'lucide-react'

function fmtDay(d) {
  if (!d) return ''
  const date = new Date(d)
  const today = new Date(); today.setHours(0,0,0,0)
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
  const dateClean = new Date(date); dateClean.setHours(0,0,0,0)
  if (dateClean.getTime() === today.getTime()) return 'Today'
  if (dateClean.getTime() === tomorrow.getTime()) return 'Tomorrow'
  const diff = Math.round((today - dateClean) / 86400000)
  if (diff > 0) return `${diff} days late`
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

const PROJECT_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777']
const PROJECT_ICON_LIST = [Home, Building2, Hammer, Ruler, Hotel, FolderKanban, Pencil, ListChecks]
const NOTE_COLORS = ['#DBEAFE', '#FEF3C7', '#D1FAE5', '#F3E8FF', '#FFE4E6', '#E0F2FE', '#FEF9C3', '#DCFCE7']

function getProjectColor(pid) {
  if (!pid) return '#6B7A90'
  let h = 0; for (let i = 0; i < pid.length; i++) h = pid.charCodeAt(i) + ((h << 5) - h)
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length]
}
function getProjectIcon(pid) {
  if (!pid) return FolderKanban
  let h = 0; for (let i = 0; i < pid.length; i++) h = pid.charCodeAt(i) + ((h << 5) - h)
  return PROJECT_ICON_LIST[Math.abs(h) % PROJECT_ICON_LIST.length]
}
function getNoteColor(id) {
  if (!id) return NOTE_COLORS[0]
  let h = 0; const s = String(id); for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return NOTE_COLORS[Math.abs(h) % NOTE_COLORS.length]
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
  const [weeklyDone, setWeeklyDone] = useState(0)
  const [weeklyTotal, setWeeklyTotal] = useState(0)

  const userName = userRole?.name || 'User'
  const userEmail = userRole?.email || ''

  useEffect(() => { fetchAll(); checkGoogle() }, [])

  async function checkGoogle() {
    if (!userEmail) return
    const { data } = await supabase.from('google_task_tokens').select('id').eq('user_email', userEmail).maybeSingle()
    setGoogleConnected(!!data)
  }

  async function fetchAll() {
    const [{ data: tasks }, { data: daily }, { data: proj }, { data: allTasks }] = await Promise.all([
      supabase.from('tasks').select('*, projects(name)').eq('assigned_to', userName).neq('status', 'done').order('due_date'),
      supabase.from('daily_tasks').select('*').eq('user_email', userEmail).order('created_at', { ascending: false }),
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
      // weekly stats
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
  const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + 7)

  // Overdue = past due date
  const overdueTasks = projectTasks.filter(t => {
    if (!t.due_date) return false
    const due = new Date(t.due_date); due.setHours(0,0,0,0)
    return due < today
  })

  // Today = due today only
  const todayOnlyTasks = projectTasks.filter(t => {
    if (!t.due_date) return false
    const due = new Date(t.due_date); due.setHours(0,0,0,0)
    return due.getTime() === today.getTime()
  })

  // This Week = due this week but not today/overdue
  const weekTasks = projectTasks.filter(t => {
    if (overdueTasks.includes(t) || todayOnlyTasks.includes(t)) return false
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    return due > today && due <= weekEnd
  })

  async function syncGoogle(action, taskId, taskData) {
    if (!googleConnected) return
    try {
      await fetch('/api/sync-tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_email: userEmail, task_id: taskId, task_data: taskData }),
      })
    } catch {}
  }

  async function toggleTask(taskId) {
    await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId)
    await syncGoogle('complete', taskId)
    fetchAll()
  }

  async function toggleDaily(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await supabase.from('daily_tasks').update({ status: newStatus }).eq('id', taskId)
    await syncGoogle(newStatus === 'done' ? 'complete' : 'uncomplete', taskId)
    fetchAll()
  }

  async function addQuickTask() {
    if (!addTaskInput.trim()) return
    const { data } = await supabase.from('daily_tasks').insert({
      user_email: userEmail, title: addTaskInput.trim(), due_date: today.toISOString().split('T')[0],
    }).select().single()
    if (data) await syncGoogle('create', data.id, { name: addTaskInput.trim(), due_date: today.toISOString().split('T')[0] })
    setAddTaskInput('')
    fetchAll()
  }

  async function addNote() {
    if (!noteInput.trim()) return
    const { data } = await supabase.from('daily_tasks').insert({
      user_email: userEmail, title: noteInput.trim(), due_date: today.toISOString().split('T')[0],
      project_id: noteProject || null,
    }).select().single()
    if (data) await syncGoogle('create', data.id, { name: noteInput.trim(), due_date: today.toISOString().split('T')[0] })
    setNoteInput('')
    setNoteProject('')
    fetchAll()
  }

  async function deleteDaily(id) {
    await supabase.from('daily_tasks').delete().eq('id', id)
    fetchAll()
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const activeDailyTasks = dailyTasks.filter(t => t.status !== 'done')
  const doneDailyTasks = dailyTasks.filter(t => t.status === 'done')
  const efficiency = weeklyTotal > 0 ? Math.round((weeklyDone / weeklyTotal) * 100) : 0

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  function TaskRow({ task, showDate = false }) {
    const projectName = task.projects?.name
    const projectColor = getProjectColor(task.project_id)
    const isOverdue = task.due_date && new Date(task.due_date) < today
    const dateLabel = fmtDay(task.due_date)
    return (
      <div className="flex items-center p-4 hover:bg-[#F8F9FC] transition-colors group">
        <button onClick={() => toggleTask(task.id)} className="mr-4 shrink-0">
          <Circle size={22} className="text-[#CBD5E1] group-hover:text-emerald-500 transition" strokeWidth={1.8} />
        </button>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-[14px] text-[#091426]">{task.name}</h4>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-[10px] h-[10px] rounded-sm shrink-0" style={{ backgroundColor: projectColor }} />
            <span className="text-[12px] text-[#64748B]">{projectName}</span>
          </div>
        </div>
        {isOverdue ? (
          <span className="text-[11px] font-bold uppercase bg-red-50 text-red-600 px-2.5 py-1 rounded shrink-0">{dateLabel}</span>
        ) : showDate ? (
          <span className="text-[12px] text-[#64748B] font-medium shrink-0">{dateLabel}</span>
        ) : (
          <span className="text-[11px] font-bold uppercase bg-blue-50 text-blue-600 px-2.5 py-1 rounded shrink-0">{dateLabel}</span>
        )}
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
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">{greeting}, {userName.split(' ')[0]}</h1>
          <p className="text-sm text-[#64748B] mt-0.5">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        {googleConnected ? (
          <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5">
            <CheckCircle2 size={14} strokeWidth={1.8} /> Synced
          </span>
        ) : (
          <a href={`/api/google-tasks-auth?email=${encodeURIComponent(userEmail)}`}
            className="text-xs text-[#64748B] bg-[#F3F3F3] hover:bg-[#E2E8F0] px-3 py-2 rounded-xl font-medium transition">
            Connect Google Tasks
          </a>
        )}
      </div>

      {/* KPI Cards — clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => onOpenProject && onOpenProject(null)} className="bg-white p-5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] flex justify-between items-start text-left hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">My Projects</p>
            <h3 className="text-[28px] font-bold text-[#091426]">{myProjects.length}</h3>
          </div>
          <div className="p-2 bg-purple-50 rounded-lg"><FolderKanban size={20} className="text-purple-600" strokeWidth={1.8} /></div>
        </button>
        <div className="bg-white p-5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Tasks This Week</p>
            <h3 className="text-[28px] font-bold text-[#091426]">{overdueTasks.length + todayOnlyTasks.length + weekTasks.length}</h3>
          </div>
          <div className="p-2 bg-blue-50 rounded-lg"><ListChecks size={20} className="text-blue-600" strokeWidth={1.8} /></div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] flex justify-between items-start">
          <div>
            <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-1">Tasks Today</p>
            <h3 className="text-[28px] font-bold text-[#091426]">{todayOnlyTasks.length}</h3>
          </div>
          <div className="p-2 bg-red-50 rounded-lg"><AlertCircle size={20} className="text-red-600" strokeWidth={1.8} /></div>
        </div>
      </div>

      {/* Two panels */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Left Panel ── */}
        <div className="lg:w-[60%] space-y-6">

          {/* Overdue */}
          {overdueTasks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={18} className="text-red-500" strokeWidth={1.8} />
                <h2 className="font-bold text-lg text-red-600 font-[Manrope]">Overdue</h2>
                <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{overdueTasks.length}</span>
              </div>
              <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-red-100 overflow-hidden divide-y divide-[#E2E8F0]">
                {overdueTasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            </section>
          )}

          {/* Today */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <h2 className="font-bold text-lg text-[#091426] font-[Manrope]">Today</h2>
              <span className="text-sm text-[#64748B]">{todayOnlyTasks.length}</span>
            </div>
            {todayOnlyTasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] p-8 text-center">
                <CheckCircle2 size={28} className="text-emerald-400 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-sm text-[#64748B]">All clear for today!</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0]">
                {todayOnlyTasks.map(t => <TaskRow key={t.id} task={t} />)}
              </div>
            )}
          </section>

          {/* Add Task — prominent */}
          <div className="relative">
            <input value={addTaskInput} onChange={e => setAddTaskInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addQuickTask()}
              placeholder="Add a task to Today..."
              className="w-full h-14 pl-12 pr-4 bg-white border border-[#CBD5E1] rounded-xl focus:ring-2 focus:ring-[#B8960B]/30 focus:border-[#B8960B] shadow-[0_2px_12px_rgba(0,0,0,0.05)] text-sm font-medium text-[#091426] placeholder:text-[#94A3B8]" />
            <Plus size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B8960B]" strokeWidth={2} />
          </div>

          {/* This Week */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={18} className="text-[#64748B]" strokeWidth={1.8} />
              <h2 className="font-bold text-lg text-[#091426] font-[Manrope]">This Week</h2>
              <span className="text-sm text-[#64748B]">{weekTasks.length}</span>
            </div>
            {weekTasks.length === 0 ? (
              <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] p-6 text-center">
                <p className="text-sm text-[#64748B]">No upcoming tasks this week</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] overflow-hidden divide-y divide-[#E2E8F0]">
                {weekTasks.map(t => <TaskRow key={t.id} task={t} showDate />)}
              </div>
            )}
          </section>

          {/* My Notes — colorful sticky notes */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg text-[#091426] font-[Manrope] flex items-center gap-2">
                <Pencil size={18} className="text-[#14B8A6]" strokeWidth={1.8} /> My Notes
              </h2>
              <span className="text-xs text-[#94A3B8]">{activeDailyTasks.length} notes</span>
            </div>

            {/* Add note input */}
            <div className="flex gap-2 mb-4">
              <input value={noteInput} onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                placeholder="Add a quick note..."
                className="flex-1 text-sm bg-white border border-[#E2E8F0] rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#14B8A6]/30 focus:border-[#14B8A6] placeholder:text-[#94A3B8] shadow-[0_2px_12px_rgba(0,0,0,0.05)]" />
              <select value={noteProject} onChange={e => setNoteProject(e.target.value)}
                className="text-xs bg-white border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#64748B] focus:ring-2 focus:ring-[#14B8A6]/30 w-36 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            {/* Notes as colorful sticky cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeDailyTasks.map(t => {
                const bgColor = getNoteColor(t.id)
                const pName = t.project_id ? projects.find(p => p.id === t.project_id)?.name : null
                return (
                  <div key={t.id} className="rounded-xl p-4 relative group transition-all hover:-translate-y-0.5 hover:shadow-md"
                    style={{ backgroundColor: bgColor }}>
                    <button onClick={() => deleteDaily(t.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[#64748B] hover:text-red-500 transition">
                      <X size={14} strokeWidth={1.8} />
                    </button>
                    <div className="flex items-start gap-2">
                      <button onClick={() => toggleDaily(t.id, t.status)} className="mt-0.5 shrink-0">
                        <Circle size={16} className="text-[#64748B] hover:text-emerald-500 transition" strokeWidth={1.8} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#091426] leading-relaxed">{t.title}</p>
                        {pName && (
                          <p className="text-[11px] text-[#64748B] mt-1.5 font-medium flex items-center gap-1">
                            <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: getProjectColor(t.project_id) }} />
                            {pName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Done notes — collapsed */}
            {doneDailyTasks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                <p className="text-xs text-[#94A3B8] mb-2">Done ({doneDailyTasks.length})</p>
                {doneDailyTasks.slice(0, 3).map(t => (
                  <div key={t.id} className="flex items-center gap-2 py-1 opacity-40">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" strokeWidth={1.8} />
                    <span className="text-xs text-[#091426] line-through">{t.title}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Right Panel ── */}
        <div className="lg:w-[40%] space-y-6">
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
                const IconComp = getProjectIcon(p.id)
                const c = projectTaskCounts[p.id] || { total: 0, done: 0, overdue: 0, dueSoon: 0 }
                const pct = c.total > 0 ? Math.round(c.done / c.total * 100) : 0
                return (
                  <div key={p.id}
                    className="bg-white p-4 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all cursor-pointer"
                    onClick={() => onOpenProject && onOpenProject(p.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-[10px] flex items-center justify-center text-white shrink-0" style={{ backgroundColor: color }}>
                        <IconComp size={24} strokeWidth={1.8} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-[15px] text-[#091426] truncate">{p.name}</h4>
                          <span className="text-[12px] font-bold text-[#64748B] shrink-0 ml-2">{pct}%</span>
                        </div>
                        {c.overdue > 0 ? (
                          <p className="text-[12px] text-red-500 font-medium">{c.overdue} tasks overdue</p>
                        ) : c.dueSoon > 0 ? (
                          <p className="text-[12px] font-medium" style={{ color }}>{c.dueSoon} tasks due soon</p>
                        ) : (
                          <p className="text-[12px] text-emerald-600 font-medium">On schedule</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-[#F3F3F3] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          {/* Weekly Overview */}
          <section>
            <h2 className="font-bold text-lg text-[#091426] font-[Manrope] mb-4">Weekly Overview</h2>
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] border border-[#E2E8F0] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 rounded-lg"><ListChecks size={18} className="text-purple-600" strokeWidth={1.8} /></div>
                  <span className="text-sm text-[#091426]">Tasks Completed</span>
                </div>
                <span className="font-bold text-[#091426]">{weeklyDone}/{weeklyTotal}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-lg"><Zap size={18} className="text-amber-600" strokeWidth={1.8} /></div>
                  <span className="text-sm text-[#091426]">Efficiency</span>
                </div>
                <span className={`font-bold ${efficiency >= 75 ? 'text-emerald-600' : efficiency >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {efficiency}%
                </span>
              </div>
              <div className="h-2 w-full bg-[#F3F3F3] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${efficiency >= 75 ? 'bg-emerald-500' : efficiency >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${efficiency}%` }} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
