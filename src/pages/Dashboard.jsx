import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Clients from './Clients'
import Projects from './Projects'
import Contents from './Contents'
import Billing from './Billing'
import WorkLog from './WorkLog'
import Knowledge from './Knowledge'

// מודולים בסרגל הצד
const modules = [
  { id: 'clients',   label: 'לקוחות',       icon: '👥' },
  { id: 'projects',  label: 'פרויקטים',      icon: '📋' },
  { id: 'contents',  label: 'תכולות',        icon: '📦' },
  { id: 'billing',   label: 'גבייה',         icon: '💰' },
  { id: 'worklog',   label: 'יומן עבודה',    icon: '📅' },
  { id: 'knowledge', label: 'ריכוז ידע',     icon: '📚' },
]

export default function Dashboard({ session }) {
  const [active, setActive] = useState('clients')

  const handleLogout = () => supabase.auth.signOut()

  const renderPage = () => {
    switch (active) {
      case 'clients':   return <Clients />
      case 'projects':  return <Projects />
      case 'contents':  return <Contents />
      case 'billing':   return <Billing />
      case 'worklog':   return <WorkLog />
      case 'knowledge': return <Knowledge />
      default:          return <Clients />
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* סרגל צד */}
      <aside className="w-56 bg-white shadow-md flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Motiv</h2>
          <p className="text-xs text-gray-500">{session.user.email}</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => setActive(m.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-right transition ${
                active === m.id
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-500 hover:text-red-500 py-2"
          >
            יציאה
          </button>
        </div>
      </aside>

      {/* תוכן ראשי */}
      <main className="flex-1 overflow-auto p-6">
        {renderPage()}
      </main>
    </div>
  )
}
