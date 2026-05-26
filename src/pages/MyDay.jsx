import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle2, Circle, Clock, AlertCircle, Plus, X, ChevronRight, Calendar, Pencil } from 'lucide-react'

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
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
}

// צבעי פרויקט
const PROJECT_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#DB2777']
function getProjectColor(projectId) {
  if (!projectId) return '#6B7A90'
  let hash = 0
  for (let i = 0; i < projectId.length; i++) hash = projectId.charCodeAt(i) + ((hash << 5) - hash)
  return PROJECT_COLORS[Math.abs(hash) % PROJECT_COLORS.length]
}

export default function MyDay({ userRole, onOpenProject }) {
  const [projectTasks, setProjectTasks] = useState([])
  const [dailyTasks, setDailyTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [myProjects, setMyProjects] = useState([])
  const [projectTaskCounts, setProjectTaskCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [tab, setTab] = useState('upcoming')
  const [noteInput, setNoteInput] = useState('')

  const userName = userRole?.name || 'User'
  const userEmail = userRole?.email || ''

  useEffect(() => { fetchAll(); checkGoogleConnection() }, [])

  async function checkGoogleConnection() {
    if (!userEmail) return
    const { data } = await supabase.from('google_task_tokens').select('id').eq('user_email', userEmail).maybeSingle()
    setGoogleConnected(!!data)
  }

  async function fetchAll() {
    const [{ data: tasks }, { data: daily }, { data: proj }, { data: allTasks }] = await Promise.all([
      supabase.from('tasks').select('*, projects(name)').eq('assigned_to', userName).neq('status', 'done').order('due_date'),
      supabase.from('daily_tasks').select('*').eq('user_email', userEmail).order('due_date'),
      supabase.from('projects').select('id, name, status, default_assignee').eq('status', 'active').order('name'),
      supabase.from('tasks').select('id, project_id, status, due_date, level').eq('assigned_to', userName),
    ])
    setProjectTasks(tasks || [])
    setDailyTasks(daily || [])
    setProjects(proj || [])

    // פרויקטים שלי (מנהלת)
    const mine = (proj || []).filter(p => p.default_assignee === userName)
    setMyProjects(mine)

    // ספירת משימות פר פרויקט
    const counts = {}
    const today = new Date(); today.setHours(0,0,0,0)
    ;(allTasks || []).forEach(t => {
      if (!t.project_id || t.level === 'subtask') return
      if (!counts[t.project_id]) counts[t.project_id] = { total: 0, done: 0, overdue: 0, dueSoon: 0 }
      counts[t.project_id].total++
      if (t.status === 'done') counts[t.project_id].done++
      if (t.status !== 'done' && t.due_date && new Date(t.due_date) < today) counts[t.project_id].overdue++
      if (t.status !== 'done' && t.due_date) {
        const due = new Date(t.due_date)
        const inWeek = new Date(today); inWeek.setDate(inWeek.getDate() + 7)
        if (due >= today && due <= inWeek) counts[t.project_id].dueSoon++
      }
    })
    setProjectTaskCounts(counts)
    setLoading(false)
  }

  const today = new Date(); today.setHours(0,0,0,0)

  // חלוקה: overdue / upcoming
  const overdue = projectTasks.filter(t => t.due_date && new Date(t.due_date) < today)
  const upcoming = projectTasks.filter(t => !overdue.includes(t))

  const shownTasks = tab === 'overdue' ? overdue : upcoming
  const totalTasks = projectTasks.length
  const doneTodayCount = dailyTasks.filter(t => t.status === 'done' && t.due_date === today.toISOString().split('T')[0]).length

  // סנכרון Google Tasks
  async function syncToGoogle(action, taskId, taskData) {
    if (!googleConnected) return
    try {
      await fetch('/api/sync-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, user_email: userEmail, task_id: taskId, task_data: taskData }),
      })
    } catch {}
  }

  async function toggleProjectTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    await syncToGoogle(newStatus === 'done' ? 'complete' : 'uncomplete', taskId)
    fetchAll()
  }

  async function toggleDailyTask(taskId, currentStatus) {
    const newStatus = currentStatus === 'done' ? 'pending' : 'done'
    await supabase.from('daily_tasks').update({ status: newStatus }).eq('id', taskId)
    await syncToGoogle(newStatus === 'done' ? 'complete' : 'uncomplete', taskId)
    fetchAll()
  }

  async function addNote() {
    if (!noteInput.trim()) return
    const { data } = await supabase.from('daily_tasks').insert({
      user_email: userEmail,
      title: noteInput.trim(),
      due_date: today.toISOString().split('T')[0],
    }).select().single()
    if (data) {
      await syncToGoogle('create', data.id, { name: noteInput.trim(), due_date: today.toISOString().split('T')[0] })
    }
    setNoteInput('')
    fetchAll()
  }

  async function deleteDailyTask(id) {
    await supabase.from('daily_tasks').delete().eq('id', id)
    setDailyTasks(prev => prev.filter(t => t.id !== id))
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  const activeDailyTasks = dailyTasks.filter(t => t.status !== 'done')
  const doneDailyTasks = dailyTasks.filter(t => t.status === 'done')

  return (
    <div className="flex gap-6 items-start">
      {/* ── פאנל שמאל — המשימות שלי ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase text-[#64748B]">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()}
              </p>
              <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">
                {greeting}, {userName.split(' ')[0]}
              </h1>
            </div>
            <div className="text-xs text-[#64748B] bg-[#F3F3F3] px-3 py-1.5 rounded-lg font-semibold">
              {projectTasks.length - overdue.length}/{totalTasks} done
            </div>
          </div>
          <div className="flex items-center gap-2">
            {googleConnected ? (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl font-medium flex items-center gap-1.5">
                <CheckCircle2 size={14} strokeWidth={1.8} /> Google Tasks
              </span>
            ) : (
              <a href={`/api/google-tasks-auth?email=${encodeURIComponent(userEmail)}`}
                className="text-xs text-[#6B7A90] bg-[#F3F3F3] hover:bg-[#E2E8F0] px-3 py-2 rounded-xl font-medium transition flex items-center gap-1.5">
                Connect Google Tasks
              </a>
            )}
          </div>
        </div>

        {/* You have X tasks + tabs */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#091426] font-[Manrope]">
            You have {upcoming.length} tasks {tab === 'overdue' ? '' : 'today'}
          </h2>
          <div className="flex bg-[#F3F3F3] rounded-xl p-0.5">
            <button onClick={() => setTab('upcoming')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'upcoming' ? 'bg-white text-[#091426] shadow-sm' : 'text-[#6B7A90]'}`}>
              Upcoming
            </button>
            <button onClick={() => setTab('overdue')}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition ${tab === 'overdue' ? 'bg-white text-red-600 shadow-sm' : 'text-[#6B7A90]'}`}>
              Overdue{overdue.length > 0 && ` (${overdue.length})`}
            </button>
          </div>
        </div>

        {/* רשימת משימות */}
        <div className="space-y-2">
          {shownTasks.length === 0 && (
            <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-8 text-center">
              <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-[#6B7A90]">{tab === 'overdue' ? 'No overdue tasks!' : 'No upcoming tasks right now'}</p>
            </div>
          )}
          {shownTasks.map(task => {
            const projectName = task.projects?.name
            const projectColor = getProjectColor(task.project_id)
            const isOverdue = task.due_date && new Date(task.due_date) < today
            return (
              <div key={task.id} className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] px-5 py-4 flex items-center gap-3 group hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all"
                style={{ borderLeft: `3px solid ${isOverdue ? '#EF4444' : projectColor}` }}>
                <button onClick={() => toggleProjectTask(task.id, task.status)} className="shrink-0">
                  <Circle size={22} className="text-[#d1d5db] hover:text-emerald-500 transition" strokeWidth={1.8} />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#091426]">{task.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-3 h-3 rounded shrink-0" style={{ backgroundColor: projectColor }} />
                    <span className="text-xs text-[#64748B]">{projectName}</span>
                    <span className="text-xs text-[#64748B]">·</span>
                    <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-[#64748B]'}`}>
                      {fmtDay(task.due_date)}
                    </span>
                  </div>
                </div>
                <button onClick={() => onOpenProject && onOpenProject(task.project_id)}
                  className="opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-[#091426] p-1.5 rounded-lg hover:bg-[#F3F3F3] shrink-0">
                  <ChevronRight size={16} strokeWidth={1.8} />
                </button>
              </div>
            )
          })}
        </div>

        {/* My Notes — inline */}
        <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#E2E8F0] bg-[#F8F9FC] flex items-center gap-2">
            <Pencil size={15} className="text-[#14B8A6]" strokeWidth={1.8} />
            <span className="text-xs font-bold tracking-wider uppercase text-[#64748B]">My Notes</span>
            <span className="text-xs text-[#94A3B8] ml-auto">{activeDailyTasks.length}</span>
          </div>

          {/* Inline input */}
          <div className="px-5 py-3 border-b border-[#E2E8F0] flex items-center gap-3">
            <Circle size={20} className="text-[#d1d5db] shrink-0" strokeWidth={1.8} />
            <input
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addNote()}
              placeholder="Add a quick note or personal reminder..."
              className="flex-1 text-sm bg-transparent border-0 focus:outline-none placeholder:text-[#94A3B8] text-[#091426]"
            />
            {noteInput && (
              <span className="text-[10px] text-[#94A3B8] font-semibold tracking-wider uppercase shrink-0">Press Enter to save</span>
            )}
          </div>

          {/* משימות יומיומיות */}
          {activeDailyTasks.map(t => (
            <div key={t.id} className="px-5 py-3 border-b border-[#E2E8F0] flex items-center gap-3 group hover:bg-[#F8F9FC] transition">
              <button onClick={() => toggleDailyTask(t.id, t.status)} className="shrink-0">
                <Circle size={20} className="text-[#d1d5db] hover:text-emerald-500 transition" strokeWidth={1.8} />
              </button>
              <span className="flex-1 text-sm text-[#091426]">{t.title}</span>
              {t.project_id && (() => {
                const pName = projects.find(p => p.id === t.project_id)?.name
                return pName ? <span className="text-xs text-[#94A3B8]">{pName}</span> : null
              })()}
              <button onClick={() => deleteDailyTask(t.id)}
                className="opacity-0 group-hover:opacity-100 transition text-[#6B7A90] hover:text-red-500 shrink-0">
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>
          ))}

          {/* Done */}
          {doneDailyTasks.length > 0 && (
            <div className="px-5 py-2 bg-[#F8F9FC]">
              {doneDailyTasks.slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center gap-3 py-1.5 opacity-40">
                  <CheckCircle2 size={18} className="text-emerald-500 shrink-0" strokeWidth={1.8} />
                  <span className="text-sm text-[#091426] line-through">{t.title}</span>
                </div>
              ))}
              {doneDailyTasks.length > 3 && (
                <p className="text-xs text-[#94A3B8] py-1">+ {doneDailyTasks.length - 3} more completed</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── פאנל ימין — הפרויקטים שלי ── */}
      <div className="w-80 shrink-0 space-y-4 hidden lg:block">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[#091426] font-[Manrope]">My Projects</h3>
          <button onClick={() => onOpenProject && onOpenProject(null)}
            className="text-xs text-[#7B5800] hover:text-[#B8960B] font-medium transition">
            View All
          </button>
        </div>

        {myProjects.length === 0 && (
          <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-6 text-center">
            <p className="text-sm text-[#94A3B8]">No projects assigned to you yet</p>
          </div>
        )}

        {myProjects.map(p => {
          const color = getProjectColor(p.id)
          const counts = projectTaskCounts[p.id] || { total: 0, done: 0, overdue: 0, dueSoon: 0 }
          const progress = counts.total > 0 ? Math.round(counts.done / counts.total * 100) : 0

          return (
            <div key={p.id}
              className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5 cursor-pointer hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all"
              onClick={() => onOpenProject && onOpenProject(p.id)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm"
                  style={{ backgroundColor: color }}>
                  {p.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[#091426] text-sm truncate">{p.name}</h4>
                  {counts.overdue > 0 ? (
                    <p className="text-xs text-red-500 font-medium">{counts.overdue} tasks overdue</p>
                  ) : counts.dueSoon > 0 ? (
                    <p className="text-xs text-[#64748B]">{counts.dueSoon} tasks due soon</p>
                  ) : (
                    <p className="text-xs text-emerald-600">Project on schedule</p>
                  )}
                </div>
              </div>
              <div className="w-full bg-[#F3F3F3] rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${progress}%`, backgroundColor: color }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
