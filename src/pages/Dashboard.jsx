import { useState, useEffect } from 'react'
import { LayoutDashboard, Users, FolderKanban, Boxes, Wallet, CalendarDays, BookOpen, BookUser, Receipt, FileBarChart, BarChart3, Bell, LogOut, Menu, X, HelpCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Home from './Home'
import Clients from './Clients'
import Projects from './Projects'
import Contents from './Contents'
import Billing from './Billing'
import WorkLog from './WorkLog'
import Knowledge from './Knowledge'
import Suppliers from './Suppliers'
import SupplierBilling from './SupplierBilling'
import MonthlyReport from './MonthlyReport'
import FinanceDashboard from './FinanceDashboard'
import MyDay from './MyDay'

// צבעי אייקונים לסיידבר
const ICON_COLORS = {
  home:             { text: 'text-blue-400',   bg: 'bg-blue-500/12',   active: 'bg-blue-600',   border: 'border-blue-400' },
  myday:            { text: 'text-blue-400',   bg: 'bg-blue-500/12',   active: 'bg-blue-600',   border: 'border-blue-400' },
  clients:          { text: 'text-amber-400',  bg: 'bg-amber-500/12',  active: 'bg-amber-600',  border: 'border-amber-400' },
  projects:         { text: 'text-purple-400', bg: 'bg-purple-500/12', active: 'bg-purple-600', border: 'border-purple-400' },
  billing:          { text: 'text-green-400',  bg: 'bg-green-500/12',  active: 'bg-green-600',  border: 'border-green-400' },
  supplierbilling:  { text: 'text-green-400',  bg: 'bg-green-500/12',  active: 'bg-green-600',  border: 'border-green-400' },
  suppliers:        { text: 'text-pink-400',   bg: 'bg-pink-500/12',   active: 'bg-pink-600',   border: 'border-pink-400' },
  financedashboard: { text: 'text-cyan-400',   bg: 'bg-cyan-500/12',   active: 'bg-cyan-600',   border: 'border-cyan-400' },
  worklog:          { text: 'text-teal-400',   bg: 'bg-teal-500/12',   active: 'bg-teal-600',   border: 'border-teal-400' },
  knowledge:        { text: 'text-indigo-400', bg: 'bg-indigo-500/12', active: 'bg-indigo-600', border: 'border-indigo-400' },
  contents:         { text: 'text-violet-400', bg: 'bg-violet-500/12', active: 'bg-violet-600', border: 'border-violet-400' },
}

// סקשנים בסיידבר
const SECTIONS = [
  { label: 'WORK', items: ['home', 'myday', 'projects'] },
  { label: 'MANAGE', items: ['clients', 'billing', 'supplierbilling', 'suppliers'] },
  { label: 'TOOLS', items: ['financedashboard', 'worklog', 'knowledge', 'contents'] },
]

// admin = sees everything, team = limited
const allModules = [
  { id: 'home',             label: 'Dashboard',          Icon: LayoutDashboard, access: 'admin' },
  { id: 'myday',            label: 'My Day',             Icon: CalendarDays,    access: 'team' },
  { id: 'clients',          label: 'Clients',             Icon: Users,           access: 'admin' },
  { id: 'projects',         label: 'Projects',            Icon: FolderKanban,    access: 'all' },
  { id: 'billing',          label: 'Client Billing',      Icon: Wallet,          access: 'admin' },
  { id: 'supplierbilling',  label: 'Supplier Billing',    Icon: Receipt,         access: 'admin' },
  { id: 'suppliers',        label: 'Supplier Directory',  Icon: BookUser,        access: 'all' },
  { id: 'financedashboard', label: 'Finance Dashboard',   Icon: BarChart3,       access: 'admin' },
  { id: 'worklog',          label: 'Work Log',            Icon: CalendarDays,    access: 'all' },
  { id: 'knowledge',        label: 'Knowledge Base',      Icon: BookOpen,        access: 'all' },
  { id: 'contents',         label: 'Scope Templates',     Icon: Boxes,           access: 'admin' },
]

export default function Dashboard({ userRole, onLogout }) {
  const isAdmin = userRole?.role === 'admin'
  const modules = allModules.filter(m => m.access === 'all' || (m.access === 'team' && !isAdmin) || (m.access === 'admin' && isAdmin))
  const userName = userRole?.name || 'User'
  const initials = userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const [active, setActive] = useState(isAdmin ? 'home' : 'myday')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [openProjectId, setOpenProjectId] = useState(null)
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0)

  // ספירת תשלומים ממתינים לאישור
  useEffect(() => {
    if (!isAdmin) return
    async function checkPending() {
      const { count } = await supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending_approval')
      setPendingApprovalCount(count || 0)
    }
    checkPending()
    const interval = setInterval(checkPending, 60000)
    return () => clearInterval(interval)
  }, [isAdmin])

  const renderPage = () => {
    // Block non-admin from admin pages
    if (!isAdmin && allModules.find(m => m.id === active)?.access === 'admin') {
      setActive('myday')
      return <MyDay userRole={userRole} />
    }
    switch (active) {
      case 'home':      return <Home onNavigate={setActive} isAdmin={isAdmin} />
      case 'myday':     return <MyDay userRole={userRole} onOpenProject={(pid) => { setOpenProjectId(pid); setActive('projects') }} />
      case 'clients':   return <Clients />
      case 'projects':  return <Projects openProjectId={openProjectId} onProjectOpened={() => setOpenProjectId(null)} />
      case 'contents':  return <Contents />
      case 'billing':    return <Billing />
      case 'suppliers':       return <Suppliers isAdmin={isAdmin} />
      case 'supplierbilling': return <SupplierBilling />
      case 'monthlyreport':   return <MonthlyReport />
      case 'financedashboard': return <FinanceDashboard />
      case 'worklog':         return <WorkLog isAdmin={isAdmin} userRole={userRole} />
      case 'knowledge': return <Knowledge />
      default:          return <Home onNavigate={setActive} isAdmin={isAdmin} />
    }
  }

  return (
    <div className="flex h-screen bg-[#F8F9FC] overflow-hidden" dir="ltr">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-[280px] bg-[#091426] flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:relative md:translate-x-0 shadow-2xl shadow-black/20 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#7B5800] to-[#B8960B] flex items-center justify-center">
              <span className="text-white font-bold text-sm font-[Manrope]">YS</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm font-[Manrope] tracking-tight">Yael Siso Studio</h1>
              <p className="text-[#6B7A90] text-[9px] font-medium tracking-widest uppercase">Interior Design</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-auto" role="navigation" aria-label="Main navigation">
          {SECTIONS.map(section => {
            const sectionModules = section.items
              .map(id => modules.find(m => m.id === id))
              .filter(Boolean)
            if (sectionModules.length === 0) return null
            return (
              <div key={section.label} className="mb-4">
                <div className="px-6 mb-2">
                  <span className="text-[9px] font-bold text-[#6B7A90]/50 uppercase tracking-[0.1em]">{section.label}</span>
                </div>
                <div className="space-y-1">
                  {sectionModules.map(({ id, label, Icon }) => {
                    const colors = ICON_COLORS[id] || ICON_COLORS.home
                    const isActive = active === id
                    return (
                      <button key={id} onClick={() => { setActive(id); setSidebarOpen(false) }}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center gap-3 px-6 py-2.5 transition-all duration-200 ${
                          isActive
                            ? `${colors.active} text-white border-l-[3px] ${colors.border}`
                            : 'text-[#6B7A90]/70 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'
                        }`}>
                        <div className={`w-9 h-9 rounded-full ${isActive ? 'bg-white/12' : colors.bg} flex items-center justify-center shrink-0`}>
                          <Icon size={22} strokeWidth={1.8} className={isActive ? 'text-white' : colors.text} />
                        </div>
                        <span className="flex-1 text-left font-semibold text-[14px]">{label}</span>
                        {id === 'billing' && pendingApprovalCount > 0 && (
                          <span className="bg-violet-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                            {pendingApprovalCount}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-[#1E293B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1E293B] flex items-center justify-center">
              <span className="text-[#B8960B] text-xs font-bold font-[Manrope]">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{userName}</p>
              <p className="text-[#6B7A90] text-[10px] tracking-wider uppercase">{isAdmin ? 'Admin' : 'Team'}</p>
            </div>
            <button onClick={onLogout} className="text-[#6B7A90] hover:text-white p-1.5 rounded-lg hover:bg-[#1E293B] transition" title="Sign Out">
              <LogOut size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto" role="main">
        <div className="sticky top-0 z-10 bg-[#F9F9F9]/80 backdrop-blur-xl px-4 md:px-8 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden w-9 h-9 rounded-xl bg-white hover:bg-[#F3F3F3] flex items-center justify-center transition-colors" aria-label="Open menu">
              <Menu size={18} className="text-[#091426]" />
            </button>
            <p className="text-[11px] font-semibold text-[#7B5800] tracking-widest uppercase font-[Manrope]">
              {modules.find(m => m.id === active)?.label || 'Dashboard'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.open(isAdmin ? '/guide-admin.html' : '/guide-team.html', '_blank')}
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#F3F3F3] flex items-center justify-center transition-colors" aria-label="Help Guide">
              <HelpCircle size={16} className="text-[#6B7A90]" />
            </button>
            <button onClick={() => { if (pendingApprovalCount > 0) setActive('billing') }}
              className="w-9 h-9 rounded-xl bg-white hover:bg-[#F3F3F3] flex items-center justify-center transition-colors relative" aria-label="Notifications">
              <Bell size={16} className="text-[#6B7A90]" />
              {pendingApprovalCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-violet-500 text-white text-[9px] font-bold min-w-[16px] h-[16px] rounded-full flex items-center justify-center px-0.5">
                  {pendingApprovalCount}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="px-4 md:px-8 pb-8">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
