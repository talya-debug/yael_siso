import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown, ChevronRight, Plus, X, Save, Pencil, Target } from 'lucide-react'

function fmt(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 })
}

// ── מודאל תעריפי עובדים ──
function RatesModal({ project, workers, rates, onClose, onSave }) {
  const [localRates, setLocalRates] = useState(
    workers.map(w => ({
      worker_name: w,
      hourly_rate: rates.find(r => r.worker_name === w)?.hourly_rate || ''
    }))
  )

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">תעריפי עובדים — {project.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {workers.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">אין עובדים עם שעות רשומות לפרויקט זה</p>
          )}
          {localRates.map((r, i) => (
            <div key={r.worker_name} className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-slate-700">{r.worker_name}</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={r.hourly_rate}
                  onChange={e => setLocalRates(prev => prev.map((x, idx) => idx === i ? { ...x, hourly_rate: e.target.value } : x))}
                  className="w-28 border border-slate-200 rounded-xl px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                  placeholder="0"
                />
                <span className="text-slate-400 text-xs">₪/שעה</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={() => onSave(localRates)}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2">
            <Save size={14} /> שמור תעריפים
          </button>
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-50 border border-slate-200 transition">ביטול</button>
        </div>
      </div>
    </div>
  )
}

// ── כרטיס פרויקט פיננסי ──
function ProjectFinanceCard({ project, onPriceUpdate }) {
  const [expanded,        setExpanded]        = useState(false)
  const [data,            setData]            = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [showRates,       setShowRates]       = useState(false)
  const [editPrice,       setEditPrice]       = useState(false)
  const [priceInput,      setPriceInput]      = useState(project.project_price || '')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [newExpense,      setNewExpense]      = useState({ description: '', amount: '' })

  async function loadData() {
    setLoading(true)
    const [
      { data: payments },
      { data: workLogs },
      { data: rates },
      { data: expenses },
    ] = await Promise.all([
      supabase.from('payments').select('amount, status').eq('project_id', project.id),
      supabase.from('work_log').select('worker_name, hours').eq('project_id', project.id),
      supabase.from('project_rates').select('*').eq('project_id', project.id),
      supabase.from('project_expenses').select('*').eq('project_id', project.id).order('created_at'),
    ])

    // הכנסות
    const totalRevenue = (payments || [])
      .filter(p => p.status === 'paid')
      .reduce((s, p) => s + Number(p.amount || 0), 0)

    // שעות לפי עובד
    const workerHours = {}
    ;(workLogs || []).forEach(l => {
      if (!l.worker_name) return
      workerHours[l.worker_name] = (workerHours[l.worker_name] || 0) + Number(l.hours || 0)
    })

    // עלויות שעות
    const rateMap = Object.fromEntries((rates || []).map(r => [r.worker_name, Number(r.hourly_rate)]))
    const workerCosts = Object.entries(workerHours).map(([name, hours]) => ({
      name, hours,
      rate: rateMap[name] || 0,
      cost: hours * (rateMap[name] || 0),
    }))
    const totalWorkCost = workerCosts.reduce((s, w) => s + w.cost, 0)

    // הוצאות ישירות
    const totalDirectExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount || 0), 0)
    const totalExpenses = totalWorkCost + totalDirectExpenses

    // חלק עדי
    const price     = Number(project.project_price || 0)
    const adiPct    = Number(project.adi_pct || 30) / 100
    const adiShare  = Math.max(0, (price * adiPct) - (totalExpenses * adiPct))

    // רווח גלמי
    const grossProfit  = price - totalExpenses - adiShare
    const targetPct    = Number(project.profit_target_pct || 40) / 100
    const targetAmount = price * targetPct
    const metTarget    = grossProfit >= targetAmount

    setData({
      totalRevenue, workerCosts,
      workers: Object.keys(workerHours),
      rates: rates || [],
      totalWorkCost,
      expenses: expenses || [],
      totalDirectExpenses, totalExpenses,
      adiShare, adiPct: adiPct * 100,
      grossProfit, targetAmount,
      targetPct: targetPct * 100,
      metTarget, price,
    })
    setLoading(false)
  }

  async function saveRates(localRates) {
    for (const r of localRates) {
      if (!r.hourly_rate) continue
      await supabase.from('project_rates').upsert({
        project_id: project.id,
        worker_name: r.worker_name,
        hourly_rate: Number(r.hourly_rate),
      }, { onConflict: 'project_id,worker_name' })
    }
    setShowRates(false)
    loadData()
  }

  async function savePrice() {
    await supabase.from('projects').update({ project_price: Number(priceInput) }).eq('id', project.id)
    setEditPrice(false)
    onPriceUpdate(project.id, Number(priceInput))
    loadData()
  }

  async function addExpense() {
    if (!newExpense.description || !newExpense.amount) return
    await supabase.from('project_expenses').insert({
      project_id: project.id,
      description: newExpense.description,
      amount: Number(newExpense.amount),
    })
    setNewExpense({ description: '', amount: '' })
    setShowExpenseForm(false)
    loadData()
  }

  async function deleteExpense(id) {
    await supabase.from('project_expenses').delete().eq('id', id)
    loadData()
  }

  function handleExpand() {
    setExpanded(!expanded)
    if (!expanded && !data) loadData()
  }

  const price = Number(project.project_price || 0)
  const inp = "border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

      {/* כותרת */}
      <button onClick={handleExpand}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition text-right">
        {expanded
          ? <ChevronDown  size={16} className="text-slate-400 shrink-0" />
          : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
        <span className="flex-1 font-semibold text-slate-800">{project.name}</span>
        {price > 0 && <span className="text-sm text-slate-400">{fmt(price)}</span>}
        {data && (
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            data.metTarget ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          }`}>
            {data.metTarget ? '✓ עומד ביעד' : '✗ חורג מיעד'}
          </span>
        )}
      </button>

      {/* תוכן */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-5 space-y-5">
          {loading ? (
            <div className="text-slate-400 text-sm text-center py-8">טוען...</div>
          ) : data && (
            <>
              {/* מחיר פרויקט */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">מחיר הפרויקט</span>
                {editPrice ? (
                  <div className="flex items-center gap-2">
                    <input type="number" value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      className={inp + ' w-36 text-left'} placeholder="0" />
                    <button onClick={savePrice}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-indigo-700 transition">שמור</button>
                    <button onClick={() => setEditPrice(false)} className="text-slate-400 hover:text-slate-600 p-1"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-lg">{price > 0 ? fmt(price) : 'לא הוזן'}</span>
                    <button onClick={() => setEditPrice(true)}
                      className="text-slate-300 hover:text-indigo-500 p-1 rounded-lg hover:bg-indigo-50 transition">
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* הכנסות */}
              <div className="bg-emerald-50/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-700">הכנסות שהתקבלו</span>
                  <span className="font-bold text-emerald-700 text-lg">{fmt(data.totalRevenue)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">אבני דרך ששולמו בפועל</p>
              </div>

              {/* הוצאות שעות */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">הוצאות שעות עבודה</span>
                  <button onClick={() => setShowRates(true)}
                    className="text-xs text-indigo-600 font-medium border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition">
                    עריכת תעריפים
                  </button>
                </div>
                {data.workerCosts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-3">אין שעות עבודה רשומות לפרויקט זה</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.workerCosts.map(w => (
                      <div key={w.name} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2.5">
                        <span className="text-slate-600 font-medium">{w.name}</span>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{w.hours}ש'</span>
                          <span>×</span>
                          <span>{w.rate ? `₪${w.rate}/ש'` : <span className="text-amber-500">ללא תעריף</span>}</span>
                          <span className="font-semibold text-slate-700 text-sm min-w-[60px] text-left">
                            {w.rate ? fmt(w.cost) : '—'}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-slate-100 px-1">
                      <span className="text-slate-500">סה"כ שעות</span>
                      <span className="text-slate-800">{fmt(data.totalWorkCost)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* הוצאות ישירות */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">הוצאות ישירות</span>
                  <button onClick={() => setShowExpenseForm(!showExpenseForm)}
                    className="text-xs text-indigo-600 font-medium border border-indigo-200 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition flex items-center gap-1">
                    <Plus size={12} /> הוסף
                  </button>
                </div>
                {showExpenseForm && (
                  <div className="flex gap-2 mb-3">
                    <input value={newExpense.description}
                      onChange={e => setNewExpense(p => ({ ...p, description: e.target.value }))}
                      className={inp + ' flex-1'} placeholder="תיאור (תוכניות נגרות...)" />
                    <input type="number" value={newExpense.amount}
                      onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                      className={inp + ' w-28 text-left'} placeholder="₪" />
                    <button onClick={addExpense}
                      className="bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-medium hover:bg-indigo-700 transition">הוסף</button>
                  </div>
                )}
                {data.expenses.length === 0 && !showExpenseForm ? (
                  <p className="text-xs text-slate-400 text-center py-3">אין הוצאות ישירות</p>
                ) : (
                  <div className="space-y-1.5">
                    {data.expenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-xl px-3 py-2.5 group">
                        <span className="text-slate-600">{e.description}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{fmt(e.amount)}</span>
                          <button onClick={() => deleteExpense(e.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition">
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {data.expenses.length > 0 && (
                      <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-slate-100 px-1">
                        <span className="text-slate-500">סה"כ ישירות</span>
                        <span className="text-slate-800">{fmt(data.totalDirectExpenses)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* חלק עדי */}
              <div className="bg-indigo-50/60 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-indigo-700">חלק עדי ({data.adiPct}%)</span>
                  <span className="font-bold text-indigo-700 text-lg">{fmt(data.adiShare)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {fmt(data.price * data.adiPct / 100)} ממחיר הפרויקט
                  {' '}פחות{' '}
                  {fmt(data.totalExpenses * data.adiPct / 100)} מהוצאות
                </p>
              </div>

              {/* סיכום רווח */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>סה"כ הוצאות</span>
                  <span className="font-medium text-red-500">- {fmt(data.totalExpenses + data.adiShare)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span className="flex items-center gap-1"><Target size={13} /> יעד רווח ({data.targetPct}%)</span>
                  <span>{fmt(data.targetAmount)}</span>
                </div>
                <div className={`flex items-center justify-between rounded-xl p-4 mt-1 ${
                  data.metTarget ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'
                }`}>
                  <span className={`font-semibold ${data.metTarget ? 'text-emerald-700' : 'text-red-600'}`}>
                    רווח גלמי
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xl font-bold ${data.metTarget ? 'text-emerald-700' : 'text-red-600'}`}>
                      {fmt(data.grossProfit)}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      data.metTarget ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {data.metTarget ? '✓ עומד ביעד' : '✗ חורג מיעד'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {showRates && data && (
        <RatesModal
          project={project}
          workers={data.workers}
          rates={data.rates}
          onClose={() => setShowRates(false)}
          onSave={saveRates}
        />
      )}
    </div>
  )
}

// ── דף ראשי ──
export default function FinanceDashboard() {
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [filter,   setFilter]   = useState('active')

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, status, project_price, profit_target_pct, adi_pct')
      .order('created_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  function handlePriceUpdate(id, price) {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, project_price: price } : p))
  }

  const filtered = projects.filter(p => filter === 'all' || p.status === filter)

  if (loading) return <div className="text-slate-400 text-sm p-8">טוען...</div>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">דשבורד ניהולי</h1>
        <p className="text-sm text-slate-400 mt-0.5">מעקב פיננסי לפרויקטים — לשימוש פנימי בלבד</p>
      </div>

      {/* פילטר */}
      <div className="flex gap-2">
        {[
          { value: 'active',    label: 'פעילים'   },
          { value: 'completed', label: 'הושלמו'   },
          { value: 'all',       label: 'הכל'      },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
              filter === f.value
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
            }`}>
            {f.label}
          </button>
        ))}
        <span className="text-sm text-slate-400 self-center mr-2">{filtered.length} פרויקטים</span>
      </div>

      {/* רשימה */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">אין פרויקטים להצגה</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <ProjectFinanceCard
              key={p.id}
              project={p}
              onPriceUpdate={handlePriceUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
