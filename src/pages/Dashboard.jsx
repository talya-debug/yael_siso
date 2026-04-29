import { useState } from 'react'
import { LayoutDashboard, Users, FolderKanban, Boxes, Wallet, CalendarDays, BookOpen, BookUser, Receipt, FileBarChart, BarChart3, Bell, LogOut, Menu, X } from 'lucide-react'
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

// admin = sees everything, team = limited
const allModules = [
  { id: 'home',             label: 'Dashboard',          Icon: LayoutDashboard, access: 'all' },
  { id: 'clients',          label: 'Clients',             Icon: Users,           access: 'admin' },
  { id: 'projects',         label: 'Projects',            Icon: FolderKanban,    access: 'all' },
  { id: 'billing',          label: 'Client Billing',      Icon: Wallet,          access: 'admin' },
  { id: 'supplierbilling',  label: 'Supplier Billing',    Icon: Receipt,         access: 'admin' },
  { id: 'suppliers',        label: 'Supplier Directory',  Icon: BookUser,        access: 'all' },
  { id: 'monthlyreport',    label: 'Monthly Report',      Icon: FileBarChart,    access: 'admin' },
  { id: 'financedashboard', label: 'Finance Dashboard',   Icon: BarChart3,       access: 'admin' },
  { id: 'worklog',          label: 'Work Log',            Icon: CalendarDays,    access: 'all' },
  { id: 'knowledge',        label: 'Knowledge Base',      Icon: BookOpen,        access: 'all' },
  { id: 'contents',         label: 'Scope Templates',     Icon: Boxes,           access: 'admin' },
]

export default function Dashboard({ userRole, onLogout }) {
  const isAdmin = userRole?.role === 'admin'
  const modules = allModules.filter(m => m.access === 'all' || isAdmin)
  const userName = userRole?.name || 'User'
  const initials = userName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()

  const [active, setActive] = useState('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const renderPage = () => {
    // Block non-admin from admin pages
    if (!isAdmin && allModules.find(m => m.id === active)?.access === 'admin') {
      setActive('home')
      return <Home onNavigate={setActive} />
    }
    switch (active) {
      case 'home':      return <Home onNavigate={setActive} />
      case 'clients':   return <Clients />
      case 'projects':  return <Projects />
      case 'contents':  return <Contents />
      case 'billing':    return <Billing />
      case 'suppliers':       return <Suppliers isAdmin={isAdmin} />
      case 'supplierbilling': return <SupplierBilling />
      case 'monthlyreport':   return <MonthlyReport />
      case 'financedashboard': return <FinanceDashboard />
      case 'worklog':         return <WorkLog />
      case 'knowledge': return <Knowledge />
      default:          return <Home onNavigate={setActive} />
    }
  }

  return (
    <div className="flex h-screen bg-[#F9F9F9] overflow-hidden" dir="ltr">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-60 bg-[#091426] flex flex-col shrink-0 fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#7B5800] to-[#B8960B] flex items-center justify-center">
              <span className="text-white font-bold text-sm font-[Manrope]">YS</span>
            </div>
            <div>
              <h1 className="text-white font-bold text-sm font-[Manrope] tracking-tight">Yael Siso</h1>
              <p className="text-[#6B7A90] text-[10px] font-medium tracking-widest uppercase">Interior Design</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-auto" role="navigation" aria-label="Main navigation">
          {modules.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => { setActive(id); setSidebarOpen(false) }}
              aria-current={active === id ? 'page' : undefined}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                active === id
                  ? 'bg-[#1E293B] text-white shadow-lg shadow-black/20'
                  : 'text-[#6B7A90] hover:bg-[#0F1D32] hover:text-[#A0B0C4]'
              }`}>
              <Icon size={17} strokeWidth={1.8} className="shrink-0" />
              <span>{label}</span>
              {active === id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#B8960B]" />
              )}
            </button>
          ))}
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
            <button className="w-9 h-9 rounded-xl bg-white hover:bg-[#F3F3F3] flex items-center justify-center transition-colors" aria-label="Notifications">
              <Bell size={16} className="text-[#6B7A90]" />
            </button>
          </div>
        </div>
        <div className="px-4 md:px-8 pb-8 max-w-6xl">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
