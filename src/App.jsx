import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import PublicWorkLog from './pages/PublicWorkLog'
import SignaturePage from './pages/SignaturePage'
import Login from './pages/Login'

function App() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadRole(session.user.email)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadRole(session.user.email)
      } else {
        setUser(null)
        setUserRole(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadRole(email) {
    const { data, error } = await supabase.from('user_roles').select('role, name').eq('email', email).maybeSingle()
    // If table doesn't exist or no row found, default to admin
    setUserRole(data || { role: 'admin', name: email.split('@')[0] })
    setLoading(false)
  }

  async function handleLogin(u) {
    setUser(u)
    await loadRole(u.email)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setUserRole(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#091426] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#B8960B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages — no auth */}
        <Route path="/worklog-public" element={<PublicWorkLog />} />
        <Route path="/sign/:token" element={<SignaturePage />} />

        {/* Protected pages */}
        <Route path="/*" element={
          user ? (
            <Dashboard userRole={userRole} onLogout={handleLogout} />
          ) : (
            <Login onLogin={handleLogin} />
          )
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
