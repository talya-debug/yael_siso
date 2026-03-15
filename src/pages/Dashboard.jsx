import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { LayoutDashboard, Users, FolderKanban, Boxes, Wallet, CalendarDays, BookOpen, LogOut } from 'lucide-react'
import Home from './Home'
import Clients from './Clients'
import Projects from './Projects'
import Contents from './Contents'
import Billing from './Billing'
import WorkLog from './WorkLog'
import Knowledge from './Knowledge'

const modules = [
  { id: 'home',      label: 'דשבורד',      Icon: LayoutDashboard },
  { id: 'clients',   label: 'לקוחות',      Icon: Users },
  { id: 'projects',  label: 'פרויקטים',    Icon: FolderKanban },
  { id: 'contents',  label: 'תכולות',      Icon: Boxes },
  { id: 'billing',   label: 'גבייה',       Icon: Wallet },
  { id: 'worklog',   label: 'יומן עבודה',  Icon: CalendarDays },
  { id: 'knowledge', label: 'ריכוז ידע',   Icon: BookOpen },
]

export default function Dashboard({ session }) {
  const [active, setActive] = useState('home')
  const handleLogout = () => supabase.auth.signOut()
  const initials = session.user.email?.charAt(0).toUpperCase() || '?'

  const renderPage = () => {
    switch (active) {
      case 'home':      return <Home onNavigate={setActive} />
      case 'clients':   return <Clients />
      case 'projects':  return <Projects />
      case 'contents':  return <Contents />
      case 'billing':   return <Billing />
      case 'worklog':   return <WorkLog />
      case 'knowledge': return <Knowledge />
      default:          return <Home onNavigate={setActive} />
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir="rtl">

      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 flex flex-col shrink-0">
        {/* לוגו */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">M</div>
            <span className="text-white font-semibold text-lg tracking-tight">Motiv</span>
          </div>
        </div>

        {/* ניווט */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {modules.map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active === id
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}>
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* משתמש */}
        <div className="px-4 py-4 border-t border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{session.user.email}</p>
              <p className="text-xs text-slate-400">מנהל</p>
            </div>
            <button onClick={handleLogout} title="יציאה"
              className="text-slate-500 hover:text-red-400 transition p-1 rounded-lg hover:bg-slate-800">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* תוכן */}
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}
