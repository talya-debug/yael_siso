import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Users, FolderKanban, Boxes, Wallet, BookOpen, CalendarDays, TrendingUp, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

export default function Home({ onNavigate }) {
  const [stats, setStats] = useState({ clients: 0, projects: 0, tasks: 0, doneTasks: 0, pendingBilling: 0, paidBilling: 0 })
  const [recentProjects, setRecentProjects] = useState([])
  const [upcomingTasks, setUpcomingTasks] = useState([])
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
      supabase.from('tasks').select('status'),
      supabase.from('billing_clients').select('amount, status'),
      supabase.from('projects').select('*, clients(name)').eq('status', 'active').order('created_at', { ascending: false }).limit(4),
      supabase.from('tasks').select('*, projects(name)').neq('status', 'done').order('due_date').limit(5),
    ])

    const doneTasks = (tasks || []).filter(t => t.status === 'done').length
    const totalTasks = (tasks || []).length
    const paidBilling = (billing || []).filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount || 0), 0)
    const pendingBilling = (billing || []).filter(b => b.status !== 'paid').reduce((s, b) => s + Number(b.amount || 0), 0)

    setStats({ clients: clients || 0, projects: projects || 0, tasks: totalTasks, doneTasks, pendingBilling, paidBilling })
    setRecentProjects(recent || [])
    setUpcomingTasks(upcoming || [])
    setLoading(false)
  }

  const kpis = [
    { label: 'לקוחות',         value: stats.clients,   icon: Users,         color: 'bg-blue-50 text-blue-600',    nav: 'clients' },
    { label: 'פרויקטים פעילים', value: stats.projects,  icon: FolderKanban,  color: 'bg-purple-50 text-purple-600', nav: 'projects' },
    { label: 'גבייה ממתינה',   value: `₪${stats.pendingBilling.toLocaleString()}`, icon: Wallet, color: 'bg-amber-50 text-amber-600', nav: 'billing' },
    { label: 'משימות שהושלמו', value: `${stats.doneTasks}/${stats.tasks}`, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', nav: 'projects' },
  ]

  const STATUS_META = {
    active:    { label: 'פעיל',  dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700' },
    completed: { label: 'הושלם', dot: 'bg-slate-400',   chip: 'bg-slate-50 text-slate-600' },
    on_hold:   { label: 'מושהה', dot: 'bg-amber-500',   chip: 'bg-amber-50 text-amber-700' },
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-2 text-slate-400 text-sm">
        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        טוען...
      </div>
    </div>
  )

  return (
    <div>
      {/* כותרת */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">שלום, טליה 👋</h1>
        <p className="text-sm text-slate-400 mt-1">הנה סיכום מה שקורה היום</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(k => (
          <button key={k.label} onClick={() => onNavigate(k.nav)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 text-right hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color} group-hover:scale-110 transition-transform`}>
                <k.icon size={20} />
              </div>
              <TrendingUp size={14} className="text-slate-200 group-hover:text-indigo-400 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-0.5">{k.value}</p>
            <p className="text-xs text-slate-400 font-medium">{k.label}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* פרויקטים פעילים */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">פרויקטים פעילים</h3>
            </div>
            <button onClick={() => onNavigate('projects')} className="text-xs text-indigo-600 hover:underline font-medium">הצג הכל</button>
          </div>
          {recentProjects.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">אין פרויקטים פעילים</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {recentProjects.map(p => {
                const meta = STATUS_META[p.status] || STATUS_META.active
                return (
                  <div key={p.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer"
                    onClick={() => onNavigate('projects')}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                        <FolderKanban size={14} className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.clients?.name}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${meta.chip}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* משימות קרובות */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-800 text-sm">משימות קרובות</h3>
            </div>
            <button onClick={() => onNavigate('projects')} className="text-xs text-indigo-600 hover:underline font-medium">הצג הכל</button>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">אין משימות ממתינות</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {upcomingTasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date()
                return (
                  <div key={task.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-blue-400'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-800">{task.name}</p>
                        {task.projects?.name && <p className="text-xs text-slate-400">{task.projects.name}</p>}
                      </div>
                    </div>
                    {task.due_date && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isOverdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {isOverdue && <AlertCircle size={10} className="inline ml-1" />}
                        {task.due_date}
                      </span>
                    )}
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
