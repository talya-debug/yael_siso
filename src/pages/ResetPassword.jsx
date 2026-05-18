import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleReset(e) {
    e.preventDefault()
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) { setError(err.message) } else { setDone(true) }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#091426] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✓</div>
          <h2 className="text-white text-lg font-bold font-[Manrope] mb-2">Password Updated</h2>
          <p className="text-[#6B7A90] text-sm mb-6">You can now sign in with your new password.</p>
          <a href="/" className="inline-block bg-gradient-to-r from-[#7B5800] to-[#B8960B] text-white py-3 px-8 rounded-xl text-sm font-semibold hover:opacity-90 transition-all">
            Go to Sign In
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#091426] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7B5800] to-[#B8960B] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl font-[Manrope]">YS</span>
          </div>
          <h1 className="text-white text-xl font-bold font-[Manrope] tracking-tight">Set New Password</h1>
        </div>

        <form onSubmit={handleReset} className="bg-[#0F1D32] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">New Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoFocus
              className="w-full bg-[#1E293B] rounded-xl px-4 py-3 text-sm text-white border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/40 placeholder:text-[#4A5568]" />
          </div>
          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Confirm Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#1E293B] rounded-xl px-4 py-3 text-sm text-white border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/40 placeholder:text-[#4A5568]" />
          </div>

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button type="submit" disabled={loading || !password || !confirm}
            className="w-full bg-gradient-to-r from-[#7B5800] to-[#B8960B] text-white py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
