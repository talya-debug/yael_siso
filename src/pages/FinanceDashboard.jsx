import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, DollarSign, CheckCircle2, Clock, Plus, X, Save, Pencil, Trash2, Target, ChevronDown, ChevronRight } from 'lucide-react'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return '₪' + Math.round(Number(n)).toLocaleString('en-US')
}

export default function FinanceDashboard() {
  const [projects, setProjects]       = useState([])
  const [payments, setPayments]       = useState([])
  const [supplierPay, setSupplierPay] = useState([])
  const [expenses, setExpenses]       = useState([])
  const [workLogs, setWorkLogs]       = useState([])
  const [rates, setRates]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState('active')
  const [expanded, setExpanded]       = useState({})
  const [editPrice, setEditPrice]     = useState(null)
  const [priceVal, setPriceVal]       = useState('')
  const [showExpenseForm, setShowExpenseForm] = useState(null)
  const [expForm, setExpForm]         = useState({ name: '', amount: '', category: 'general', notes: '' })
  const [showRates, setShowRates]     = useState(false)
  const [rateOverrides, setRateOverrides] = useState([])
  const [showProjectRates, setShowProjectRates] = useState(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [
      { data: proj },
      { data: pay },
      { data: sp },
      { data: exp },
      { data: wl },
      { data: hr },
    ] = await Promise.all([
      supabase.from('projects').select('id, name, status, project_price, profit_target_pct, adi_pct').order('created_at', { ascending: false }),
      supabase.from('payments').select('id, project_id, amount, status'),
      supabase.from('supplier_payments').select('id, project_id, amount, commission_pct'),
      supabase.from('project_expenses').select('*').order('created_at'),
      supabase.from('work_log').select('id, project_id, worker_name, hours, role'),
      supabase.from('hourly_rates').select('*'),
    ])
    setProjects(proj || [])
    setPayments(pay || [])
    setSupplierPay(sp || [])
    // Separate rate overrides from regular expenses
    const allExp = exp || []
    setRateOverrides(allExp.filter(e => e.category === 'rate_override'))
    setExpenses(allExp.filter(e => e.category !== 'rate_override'))
    setWorkLogs(wl || [])
    setRates(hr || [])
    setLoading(false)
  }

  function getRate(role, projectId) {
    // Check for project-specific rate override first
    if (projectId) {
      const override = rateOverrides.find(o => o.project_id === projectId && o.name === `RATE:${role}`)
      if (override) return Number(override.amount)
    }
    const r = rates.find(r => r.role === role)
    return r ? Number(r.rate) : 0
  }

  // Save per-project rate override
  async function saveProjectRate(projectId, role, newRate) {
    const existing = rateOverrides.find(o => o.project_id === projectId && o.name === `RATE:${role}`)
    if (existing) {
      await supabase.from('project_expenses').update({ amount: Number(newRate) }).eq('id', existing.id)
    } else {
      await supabase.from('project_expenses').insert({
        project_id: projectId,
        name: `RATE:${role}`,
        amount: Number(newRate),
        category: 'rate_override',
        notes: 'Per-project hourly rate override',
      })
    }
    fetchAll()
  }

  // Reset project rate to global
  async function resetProjectRate(projectId, role) {
    const existing = rateOverrides.find(o => o.project_id === projectId && o.name === `RATE:${role}`)
    if (existing) {
      await supabase.from('project_expenses').delete().eq('id', existing.id)
      fetchAll()
    }
  }

  // חישוב פיננסי מלא לפרויקט
  function projectFinance(p) {
    const price = Number(p.project_price || 0)
    const adiPct = Number(p.adi_pct || 30) / 100
    const targetPct = Number(p.profit_target_pct || 40) / 100

    // הכנסות — אבני דרך ששולמו
    const pPay = payments.filter(pm => pm.project_id === p.id)
    const revenue = pPay.filter(pm => pm.status === 'paid').reduce((s, pm) => s + Number(pm.amount || 0), 0)
    const pendingRev = pPay.filter(pm => pm.status !== 'paid').reduce((s, pm) => s + Number(pm.amount || 0), 0)

    // הוצאות שעתיות
    const logs = workLogs.filter(l => l.project_id === p.id)
    const hoursByRole = {}
    logs.forEach(l => {
      const role = l.role || 'Other'
      if (!hoursByRole[role]) hoursByRole[role] = { hours: 0, rate: getRate(role, p.id) }
      hoursByRole[role].hours += Number(l.hours || 0)
    })
    const hoursCost = Object.values(hoursByRole).reduce((s, r) => s + (r.hours * r.rate), 0)

    // הוצאות ישירות
    const projExpenses = expenses.filter(e => e.project_id === p.id)
    const directCost = projExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)

    // עמלות ספקים (הוצאה לא ישירה — זה הכנסה ליעל, לא הוצאה)
    const supplierCommissions = supplierPay
      .filter(sp => sp.project_id === p.id && sp.commission_pct)
      .reduce((s, sp) => s + (Number(sp.amount || 0) * Number(sp.commission_pct || 0) / 100), 0)

    // סה"כ הוצאות
    const totalExpenses = hoursCost + directCost

    // חלק עדי: 30% מההכנסות פחות 30% מההוצאות
    const adiFromRevenue = price * adiPct
    const adiExpenseShare = totalExpenses * adiPct
    const adiPayment = price === 0 ? 0 : adiFromRevenue - adiExpenseShare

    // רווח גולמי: הכנסות - הוצאות - חלק עדי
    const grossProfit = price === 0 ? -totalExpenses : price - totalExpenses - adiPayment

    // יעד רווחיות
    const profitTarget = price * targetPct
    const metTarget = grossProfit >= profitTarget

    return {
      price, revenue, pendingRev,
      hoursCost, hoursByRole, directCost, projExpenses,
      totalExpenses, supplierCommissions,
      adiPct: p.adi_pct || 30, adiFromRevenue, adiExpenseShare, adiPayment,
      grossProfit, profitTarget, targetPct: p.profit_target_pct || 40, metTarget,
    }
  }

  // שמירת מחיר פרויקט
  async function savePrice(projectId) {
    await supabase.from('projects').update({ project_price: Number(priceVal) || 0 }).eq('id', projectId)
    setEditPrice(null)
    fetchAll()
  }

  // הוספת הוצאה ישירה
  async function addExpense(projectId) {
    if (!expForm.name.trim() || !expForm.amount) return
    await supabase.from('project_expenses').insert({
      project_id: projectId,
      name: expForm.name,
      amount: Number(expForm.amount),
      category: expForm.category,
      notes: expForm.notes,
    })
    setShowExpenseForm(null)
    setExpForm({ name: '', amount: '', category: 'general', notes: '' })
    fetchAll()
  }

  async function deleteExpense(id) {
    if (!confirm('Delete this expense?')) return
    await supabase.from('project_expenses').delete().eq('id', id)
    fetchAll()
  }

  // שמירת תעריף
  async function saveRate(id, newRate) {
    await supabase.from('hourly_rates').update({ rate: Number(newRate) }).eq('id', id)
    fetchAll()
  }

  // KPIs כלליים
  const allFinance = projects.map(p => projectFinance(p))
  const totalRevenue = allFinance.reduce((s, f) => s + f.revenue, 0)
  const totalExpensesAll = allFinance.reduce((s, f) => s + f.totalExpenses, 0)
  const totalProfit = allFinance.reduce((s, f) => s + f.grossProfit, 0)
  const totalPrices = allFinance.reduce((s, f) => s + f.price, 0)

  const filtered = projects.filter(p => filter === 'all' || p.status === filter)

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Finance Dashboard</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">Project profitability and cost tracking</p>
        </div>
        <button onClick={() => setShowRates(!showRates)}
          className="bg-[#F3F3F3] text-[#091426] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#091426] hover:text-white transition-all">
          Hourly Rates
        </button>
      </div>

      {/* Hourly Rates Editor */}
      {showRates && (
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
          <h3 className="font-semibold text-[#091426] font-[Manrope] tracking-tight mb-3">Hourly Rates by Role</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {rates.map(r => (
              <div key={r.id} className="bg-[#F9F9F9] rounded-xl p-3">
                <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-1.5">{r.role}</p>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-[#6B7A90]">₪</span>
                  <input type="number" defaultValue={r.rate}
                    onBlur={e => saveRate(r.id, e.target.value)}
                    className="w-full bg-white rounded-lg px-2 py-1.5 text-sm font-semibold text-[#091426] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
                  <span className="text-xs text-[#6B7A90]">/hr</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'TOTAL PROJECT VALUE', value: fmt(totalPrices), icon: DollarSign, iconBg: 'bg-[#F3F3F3]', iconColor: 'text-[#091426]' },
          { label: 'REVENUE COLLECTED', value: fmt(totalRevenue), icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'TOTAL EXPENSES', value: fmt(totalExpensesAll), icon: TrendingDown, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
          { label: 'GROSS PROFIT', value: fmt(totalProfit), icon: Target, iconBg: totalProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50', iconColor: totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
            <div className={`w-8 h-8 rounded-xl ${k.iconBg} flex items-center justify-center mb-2`}>
              <k.icon size={16} className={k.iconColor} strokeWidth={1.8} />
            </div>
            <p className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">{k.value}</p>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['active', 'completed', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
              filter === f ? 'bg-[#091426] text-white' : 'bg-white text-[#6B7A90] hover:bg-[#F3F3F3]'
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#6B7A90] text-sm">No projects</div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => {
            const f = projectFinance(p)
            const isOpen = expanded[p.id]
            return (
              <div key={p.id} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
                {/* Header row */}
                <button onClick={() => setExpanded(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                  className="w-full px-4 md:px-6 py-4 flex items-center gap-3 md:gap-4 hover:bg-[#F9F9F9] transition-colors text-left">
                  {isOpen ? <ChevronDown size={16} className="text-[#6B7A90] shrink-0" /> : <ChevronRight size={16} className="text-[#6B7A90] shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-[#091426] font-[Manrope] tracking-tight text-sm md:text-base">{p.name}</span>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 shrink-0 text-sm">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Price</p>
                      <p className="font-bold text-[#091426]">{f.price ? fmt(f.price) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Profit</p>
                      <p className={`font-bold ${f.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{f.price ? fmt(f.grossProfit) : '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Target</p>
                      {f.price ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${f.metTarget ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                          {f.metTarget ? '✓ MET' : '✗ BELOW'}
                        </span>
                      ) : <span className="text-[#6B7A90]">—</span>}
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-4 md:px-6 pb-6 border-t border-[#F3F3F3]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-5">

                      {/* Left — Revenue breakdown */}
                      <div className="space-y-4">
                        {/* Project Price */}
                        <div className="bg-[#F9F9F9] rounded-xl p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Project Price</span>
                            {editPrice === p.id ? (
                              <div className="flex gap-1">
                                <input type="number" value={priceVal} onChange={e => setPriceVal(e.target.value)}
                                  className="w-28 bg-white rounded-lg px-2 py-1 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" autoFocus />
                                <button onClick={() => savePrice(p.id)} className="text-emerald-600 p-1"><Save size={14} /></button>
                                <button onClick={() => setEditPrice(null)} className="text-[#6B7A90] p-1"><X size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditPrice(p.id); setPriceVal(p.project_price || '') }}
                                className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-lg hover:bg-white transition"><Pencil size={13} /></button>
                            )}
                          </div>
                          <p className="text-2xl font-bold text-[#091426] font-[Manrope]">{f.price ? fmt(f.price) : 'Set price →'}</p>
                        </div>

                        {/* Revenue */}
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-2">Revenue (Milestones Paid)</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-emerald-600">{fmt(f.revenue)}</span>
                            {f.pendingRev > 0 && <span className="text-xs text-amber-600 font-medium">{fmt(f.pendingRev)} pending</span>}
                          </div>
                          {f.price > 0 && (
                            <div className="h-2 bg-[#F3F3F3] rounded-full mt-2 overflow-hidden">
                              <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${Math.min(100, f.revenue / f.price * 100)}%` }} />
                            </div>
                          )}
                        </div>

                        {/* Adi's Share */}
                        <div className="bg-amber-50/50 rounded-xl p-4">
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-amber-700 mb-2">Adi's Share ({f.adiPct}%)</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-[#6B7A90]">{f.adiPct}% of project price</span><span className="text-[#091426]">{fmt(f.adiFromRevenue)}</span></div>
                            <div className="flex justify-between"><span className="text-[#6B7A90]">- {f.adiPct}% of expenses</span><span className="text-red-500">-{fmt(f.adiExpenseShare)}</span></div>
                            <div className="flex justify-between font-bold border-t border-amber-200 pt-1 mt-1"><span className="text-[#091426]">Payment to Adi</span><span className="text-[#091426]">{fmt(f.adiPayment)}</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Right — Expenses */}
                      <div className="space-y-4">
                        {/* Hours Cost */}
                        <div>
                          <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mb-2">Labor Cost (from Work Log)</p>
                          {Object.keys(f.hoursByRole).length === 0 ? (
                            <p className="text-sm text-[#6B7A90]">No hours logged</p>
                          ) : (
                            <div className="space-y-1.5">
                              {Object.entries(f.hoursByRole).map(([role, data]) => (
                                <div key={role} className="flex items-center justify-between bg-[#F9F9F9] rounded-lg px-3 py-2 text-sm">
                                  <div>
                                    <span className="text-[#091426] font-medium">{role}</span>
                                    <span className="text-[#6B7A90] ml-2">{data.hours}h × ₪{data.rate}</span>
                                  </div>
                                  <span className="font-semibold text-[#091426]">{fmt(data.hours * data.rate)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between px-3 py-1 text-sm font-bold">
                                <span className="text-[#6B7A90]">Total Labor</span>
                                <span className="text-[#091426]">{fmt(f.hoursCost)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Direct Expenses */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Direct Expenses</p>
                            <button onClick={() => { setShowExpenseForm(p.id); setExpForm({ name: '', amount: '', category: 'general', notes: '' }) }}
                              className="text-xs text-[#7B5800] hover:text-[#B8960B] font-medium flex items-center gap-1">
                              <Plus size={12} /> Add
                            </button>
                          </div>
                          {f.projExpenses.length === 0 && showExpenseForm !== p.id && (
                            <p className="text-sm text-[#6B7A90]">No direct expenses</p>
                          )}
                          {f.projExpenses.map(e => (
                            <div key={e.id} className="flex items-center justify-between bg-[#F9F9F9] rounded-lg px-3 py-2 text-sm mb-1.5 group">
                              <span className="text-[#091426]">{e.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#091426]">{fmt(e.amount)}</span>
                                <button onClick={() => deleteExpense(e.id)}
                                  className="opacity-0 group-hover:opacity-100 text-[#6B7A90] hover:text-red-500 transition p-0.5">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {showExpenseForm === p.id && (
                            <div className="bg-[#F9F9F9] rounded-xl p-3 space-y-2 mt-2">
                              <input value={expForm.name} onChange={e => setExpForm({...expForm, name: e.target.value})}
                                placeholder="Expense name (e.g. Carpentry plans)" className={inp} />
                              <div className="flex gap-2">
                                <input type="number" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})}
                                  placeholder="Amount" className={inp} />
                                <button onClick={() => addExpense(p.id)}
                                  className="shrink-0 bg-[#091426] text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">Add</button>
                              </div>
                            </div>
                          )}
                          {f.directCost > 0 && (
                            <div className="flex justify-between px-3 py-1 text-sm font-bold mt-1">
                              <span className="text-[#6B7A90]">Total Direct</span>
                              <span className="text-[#091426]">{fmt(f.directCost)}</span>
                            </div>
                          )}
                        </div>

                        {/* Per-Project Hourly Rates */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Project Hourly Rates</p>
                            <button onClick={() => setShowProjectRates(showProjectRates === p.id ? null : p.id)}
                              className="text-xs text-[#7B5800] hover:text-[#B8960B] font-medium">
                              {showProjectRates === p.id ? 'Hide' : 'Customize'}
                            </button>
                          </div>
                          {showProjectRates === p.id && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {rates.map(r => {
                                const override = rateOverrides.find(o => o.project_id === p.id && o.name === `RATE:${r.role}`)
                                const isOverridden = !!override
                                return (
                                  <div key={r.id} className={`rounded-xl p-2.5 ${isOverridden ? 'bg-amber-50' : 'bg-[#F9F9F9]'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">{r.role}</p>
                                      {isOverridden && (
                                        <button onClick={() => resetProjectRate(p.id, r.role)}
                                          className="text-[10px] text-amber-600 hover:text-amber-800 font-medium">Reset</button>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm text-[#6B7A90]">₪</span>
                                      <input type="number" defaultValue={isOverridden ? override.amount : r.rate}
                                        key={`${p.id}-${r.role}-${isOverridden ? override.amount : r.rate}`}
                                        onBlur={e => {
                                          const val = Number(e.target.value)
                                          if (val !== Number(r.rate)) saveProjectRate(p.id, r.role, val)
                                          else if (isOverridden && val === Number(r.rate)) resetProjectRate(p.id, r.role)
                                        }}
                                        className="w-full bg-white rounded-lg px-2 py-1.5 text-sm font-semibold text-[#091426] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20" />
                                      <span className="text-xs text-[#6B7A90]">/hr</span>
                                    </div>
                                    {!isOverridden && <p className="text-[9px] text-[#6B7A90] mt-0.5">Global rate</p>}
                                    {isOverridden && <p className="text-[9px] text-amber-600 mt-0.5">Custom (global: ₪{r.rate})</p>}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>

                        {/* Summary */}
                        <div className="bg-[#091426] rounded-xl p-4 text-white">
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-[#6B7A90]">Total Expenses</span><span>{fmt(f.totalExpenses)}</span></div>
                            <div className="flex justify-between"><span className="text-[#6B7A90]">Adi's Payment</span><span>{fmt(f.adiPayment)}</span></div>
                            <div className="flex justify-between font-bold text-base border-t border-white/20 pt-2 mt-1">
                              <span>Gross Profit (Yael)</span>
                              <span className={f.grossProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(f.grossProfit)}</span>
                            </div>
                            {f.price > 0 && (
                              <div className="flex justify-between text-xs mt-1">
                                <span className="text-[#6B7A90]">Target: {f.targetPct}% = {fmt(f.profitTarget)}</span>
                                <span className={f.metTarget ? 'text-emerald-400' : 'text-red-400'}>
                                  {f.metTarget ? '✓ Target met' : '✗ Below target'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
