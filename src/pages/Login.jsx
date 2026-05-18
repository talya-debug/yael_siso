import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Incorrect email or password')
      setLoading(false)
      return
    }

    onLogin(data.user)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#091426] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B5800] to-[#B8960B] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl font-[Manrope]">YS</span>
          </div>
          <h1 className="text-white text-xl font-bold font-[Manrope] tracking-tight">Yael Siso</h1>
          <p className="text-[#6B7A90] text-xs tracking-widest uppercase mt-1">Interior Design Studio</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0F1D32] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" autoFocus
              className="w-full bg-[#1E293B] rounded-xl px-4 py-3 text-sm text-white border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/40 placeholder:text-[#4A5568]" />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1E293B] rounded-xl px-4 py-3 text-sm text-white border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/40 placeholder:text-[#4A5568]" />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button type="submit" disabled={loading || !email || !password}
            className="w-full bg-gradient-to-r from-[#7B5800] to-[#B8960B] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
