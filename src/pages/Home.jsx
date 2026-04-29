import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, FolderKanban, Wallet, CheckCircle2, Clock, AlertCircle, ArrowUpRight, TrendingUp } from 'lucide-react'

export default function Home({ onNavigate }) {
  const [stats, setStats] = useState({ clients: 0, projects: 0, tasks: 0, doneTasks: 0, pendingBilling: 0, paidBilling: 0 })
  const [recentProjects, setRecentProjects] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])
  const [projectProgress, setProjectProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard() }, [])

  async function fetchDashboard() {
    const [
      { count: clients },
      { count: projects },
      { data: tasks },
      { data: billing },
      { data: recent },
      { data: upcoming },
    ] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('tasks').select('status, project_id'),
      supabase.from('payments').select('amount, status'),
      supabase.from('projects').select('*, clients(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
      supabase.from('tasks').select('*, projects(name)').neq('status', 'done').order('due_date').limit(5),
    ])

    const doneTasks = (tasks || []).filter(t => t.status === 'done').length
    const totalTasks = (tasks || []).length
    const paidBilling = (billing || []).filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount || 0), 0)
    const pendingBilling = (billing || []).filter(b => b.status !== 'paid').reduce((s, b) => s + Number(b.amount || 0), 0)

    setStats({ clients: clients || 0, projects: projects || 0, tasks: totalTasks, doneTasks, pendingBilling, paidBilling })
    setRecentProjects(recent || [])
    setUpcomingTasks(upcoming || [])

    // חישוב התקדמות אמיתית לכל פרויקט
    const progress = {}
    ;(tasks || []).forEach(t => {
      if (!t.project_id) return
      if (!progress[t.project_id]) progress[t.project_id] = { done: 0, total: 0 }
      progress[t.project_id].total++
      if (t.status === 'done') progress[t.project_id].done++
    })
    setProjectProgress(progress)

    setLoading(false)
  }

  const kpis = [
    { label: 'TOTAL CLIENTS',    value: stats.clients,   icon: Users,         nav: 'clients',  accent: false },
    { label: 'ACTIVE PROJECTS',  value: stats.projects,  icon: FolderKanban,  nav: 'projects',  accent: false },
    { label: 'PENDING BILLING',  value: `₪${stats.pendingBilling.toLocaleString()}`, icon: Wallet, nav: 'billing', accent: true },
    { label: 'COMPLETED TASKS',  value: `${stats.doneTasks}/${stats.tasks}`, icon: CheckCircle2, nav: 'projects', accent: false },
  ]

  const STATUS_META = {
    active:    { label: 'ACTIVE',     bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500' },
    completed: { label: 'COMPLETED',  bg: 'bg-[#F3F3F3]',   text: 'text-[#6B7A90]',   dot: 'bg-[#6B7A90]' },
    on_hold:   { label: 'ON HOLD',    bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500' },
  }

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#6B7A90] text-sm">Loading dashboard...</p>
      </div>
    </div>
  )

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#091426] tracking-tight font-[Manrope]">Welcome, Yael</h1>
        <p className="text-sm text-[#6B7A90] mt-1.5">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {kpis.map(k => (
          <button key={k.label} onClick={() => onNavigate(k.nav)}
            className={`relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group ${
              k.accent
                ? 'bg-[#091426] text-white'
                : 'bg-white shadow-[0_2px_20px_rgba(9,20,38,0.04)]'
            }`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                k.accent ? 'bg-[#1E293B]' : 'bg-[#F3F3F3]'
              }`}>
                <k.icon size={18} className={k.accent ? 'text-[#B8960B]' : 'text-[#091426]'} strokeWidth={1.8} />
              </div>
              <ArrowUpRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                k.accent ? 'text-[#B8960B]' : 'text-[#6B7A90]'
              }`} />
            </div>
            <p className="text-2xl font-bold font-[Manrope] tracking-tight mb-1">{k.value}</p>
            <p className={`text-[10px] font-semibold tracking-widest ${
              k.accent ? 'text-[#6B7A90]' : 'text-[#6B7A90]'
            }`}>{k.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Projects — wider column */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <h3 className="font-bold text-[#091426] font-[Manrope]">Recent Projects</h3>
            <button onClick={() => onNavigate('projects')}
              className="text-xs font-semibold text-[#7B5800] hover:text-[#B8960B] transition-colors tracking-wide">
              View All Projects
            </button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="py-16 text-center text-[#6B7A90] text-sm">No active projects yet</div>
          ) : (
            <div className="px-6 pb-4 overflow-x-auto">
              <table className="w-full min-w-[500px]" role="table">
                <thead>
                  <tr className="text-[10px] font-semibold text-[#6B7A90] tracking-widest uppercase">
                    <th className="text-left pb-3 font-semibold">Project Name</th>
                    <th className="text-left pb-3 font-semibold">Client</th>
                    <th className="text-left pb-3 font-semibold">Status</th>
                    <th className="text-right pb-3 font-semibold">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map(p => {
                    const meta = STATUS_META[p.status] || STATUS_META.active
                    return (
                      <tr key={p.id}
                        className="group cursor-pointer hover:bg-[#F9F9F9] transition-colors"
                        onClick={() => onNavigate('projects')}>
                        <td className="py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#F3F3F3] flex items-center justify-center group-hover:bg-[#091426] transition-colors">
                              <FolderKanban size={15} className="text-[#6B7A90] group-hover:text-white transition-colors" strokeWidth={1.8} />
                            </div>
                            <span className="text-sm font-semibold text-[#091426]">{p.name}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-sm text-[#6B7A90]">{p.clients?.name || '—'}</td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wider px-3 py-1 rounded-full ${meta.bg} ${meta.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 bg-[#F3F3F3] rounded-full overflow-hidden">
                              <div className="h-full bg-[#091426] rounded-full" style={{ width: `${projectProgress[p.id] ? Math.round(projectProgress[p.id].done / projectProgress[p.id].total * 100) : 0}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Tasks — narrower column */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
          <div className="px-6 py-5 flex items-center justify-between">
            <h3 className="font-bold text-[#091426] font-[Manrope]">Upcoming Tasks</h3>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="py-16 text-center text-[#6B7A90] text-sm">No pending tasks</div>
          ) : (
            <div className="px-4 pb-4 space-y-2">
              {upcomingTasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                return (
                  <div key={task.id}
                    className={`px-4 py-3.5 rounded-xl transition-all duration-200 hover:bg-[#F9F9F9] cursor-pointer ${
                      isOverdue ? 'border-l-3 border-l-red-400' : ''
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[10px] font-bold tracking-widest mb-1 ${
                          isOverdue ? 'text-red-500' : 'text-[#7B5800]'
                        }`}>
                          {isOverdue ? 'OVERDUE' : 'UPCOMING'}
                        </p>
                        <p className="text-sm font-semibold text-[#091426] truncate">{task.name}</p>
                        {task.projects?.name && (
                          <p className="text-xs text-[#6B7A90] mt-0.5 flex items-center gap-1">
                            <FolderKanban size={10} strokeWidth={2} />
                            {task.projects.name}
                          </p>
                        )}
                      </div>
                      {task.due_date && (
                        <span className={`text-xs font-semibold whitespace-nowrap ${
                          isOverdue ? 'text-red-500' : 'text-[#6B7A90]'
                        }`}>
                          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
