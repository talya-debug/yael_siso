import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Download, FileText, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'

const MONTHS = [
  'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
  'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
]

const now = new Date()

// ── עזר ──
function statusIcon(status) {
  if (status === 'done')        return <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
  if (status === 'in_progress') return <Clock size={14} className="text-blue-500 shrink-0" />
  if (status === 'blocked')     return <AlertCircle size={14} className="text-red-500 shrink-0" />
  return <Clock size={14} className="text-slate-400 shrink-0" />
}

export default function MonthlyReport() {
  const [projects,  setProjects]  = useState([])
  const [projectId, setProjectId] = useState('')
  const [month,     setMonth]     = useState(now.getMonth())      // 0-based
  const [year,      setYear]      = useState(now.getFullYear())
  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)

  useEffect(() => {
    supabase.from('projects').select('id,name,client_name,client_email,budget,status').order('name')
      .then(({ data }) => setProjects(data || []))
  }, [])

  const project = projects.find(p => p.id === projectId)

  async function generateReport() {
    if (!projectId) { alert('יש לבחור פרויקט'); return }
    setLoading(true)
    setSent(false)

    // תחילת וסוף חודש
    const from = new Date(year, month, 1).toISOString()
    const to   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    // טעינת משימות + תשלומים
    const [{ data: tasks }, { data: payments }] = await Promise.all([
      supabase.from('tasks')
        .select('id,title,status,due_date,phase')
        .eq('project_id', projectId)
        .order('phase').order('sort_order'),
      supabase.from('payments')
        .select('id,title,amount,status,due_date')
        .eq('project_id', projectId)
        .order('due_date'),
    ])

    // משימות שהושלמו החודש (לפי due_date בחודש) + כל הפעילות
    const doneTasks    = (tasks || []).filter(t => t.status === 'done')
    const activeTasks  = (tasks || []).filter(t => t.status === 'in_progress' || t.status === 'blocked')
    const pendingTasks = (tasks || []).filter(t => t.status === 'pending')
    const totalTasks   = (tasks || []).length

    // תשלומים
    const totalBilled = (payments || []).reduce((s, p) => s + (p.amount || 0), 0)
    const totalPaid   = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
    const pending$    = (payments || []).filter(p => p.status === 'pending' || p.status === 'sent')

    setReport({ tasks: tasks || [], doneTasks, activeTasks, pendingTasks, totalTasks, payments: payments || [], totalBilled, totalPaid, pending$ })
    setLoading(false)
  }

  // ── בניית גוף מייל ──
  function buildEmailBody() {
    if (!report || !project) return ''
    const monthLabel = `${MONTHS[month]} ${year}`
    const progress = report.totalTasks ? Math.round((report.doneTasks.length / report.totalTasks) * 100) : 0

    let body = `שלום,\n\nמצ"ב דוח התקדמות חודשי לפרויקט "${project.name}" — ${monthLabel}.\n\n`
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    body += `סיכום כללי\n`
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    body += `• התקדמות כוללת: ${progress}%\n`
    body += `• משימות שהושלמו: ${report.doneTasks.length} מתוך ${report.totalTasks}\n`
    body += `• בביצוע כעת: ${report.activeTasks.length}\n\n`

    if (report.doneTasks.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `✅ הושלם החודש\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.doneTasks.forEach(t => { body += `• ${t.title}\n` })
      body += '\n'
    }

    if (report.activeTasks.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `🔄 בתהליך\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.activeTasks.forEach(t => { body += `• ${t.title}\n` })
      body += '\n'
    }

    if (report.pending$.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `💳 תשלומים ממתינים\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.pending$.forEach(p => {
        const due = p.due_date ? `(${new Date(p.due_date).toLocaleDateString('he-IL')})` : ''
        body += `• ${p.title} — ₪${p.amount?.toLocaleString('he-IL')} ${due}\n`
      })
      body += '\n'
    }

    body += `בברכה,\nיעל סיסו | עיצוב פנים\n`
    return body
  }

  function handleSendEmail() {
    if (!project?.client_email) { alert('אין כתובת מייל ללקוח בפרויקט זה'); return }
    const subject = encodeURIComponent(`דוח התקדמות — ${project.name} — ${MONTHS[month]} ${year}`)
    const body    = encodeURIComponent(buildEmailBody())
    window.open(`mailto:${project.client_email}?subject=${subject}&body=${body}`)
    setSent(true)
  }

  // ייצוא טקסט
  function handleExport() {
    if (!report) return
    const content = buildEmailBody()
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `דוח-${project?.name}-${MONTHS[month]}-${year}.txt`
    }).click()
  }

  const progress = report?.totalTasks
    ? Math.round((report.doneTasks.length / report.totalTasks) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* כותרת */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">דוח חודשי ללקוח</h1>
        <p className="text-sm text-slate-400 mt-0.5">הפקת דוח התקדמות ושליחה במייל</p>
      </div>

      {/* בחירת פרויקט + חודש */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* פרויקט */}
          <div className="md:col-span-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">פרויקט</label>
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setReport(null) }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition">
              <option value="">— בחר פרויקט —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* חודש */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">חודש</label>
            <select value={month} onChange={e => { setMonth(+e.target.value); setReport(null) }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>

          {/* שנה */}
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-1.5">שנה</label>
            <select value={year} onChange={e => { setYear(+e.target.value); setReport(null) }}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <button onClick={generateReport} disabled={loading || !projectId}
          className="mt-4 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm">
          <FileText size={15} />
          {loading ? 'מייצר דוח...' : 'הפק דוח'}
        </button>
      </div>

      {/* תצוגת דוח */}
      {report && project && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-indigo-600">{progress}%</p>
              <p className="text-xs text-slate-400 mt-1">התקדמות כוללת</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{report.doneTasks.length}</p>
              <p className="text-xs text-slate-400 mt-1">משימות הושלמו</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{report.activeTasks.length}</p>
              <p className="text-xs text-slate-400 mt-1">בביצוע</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-slate-700">₪{report.totalPaid.toLocaleString('he-IL')}</p>
              <p className="text-xs text-slate-400 mt-1">שולם עד כה</p>
            </div>
          </div>

          {/* גוף הדוח */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800">
                דוח {MONTHS[month]} {year} — {project.name}
              </h2>
              <div className="flex gap-2">
                <button onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs border border-slate-200 px-3 py-2 rounded-xl text-slate-600 hover:bg-slate-50 transition">
                  <Download size={13} /> ייצוא
                </button>
                <button onClick={handleSendEmail}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition ${
                    sent
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}>
                  <Mail size={13} /> {sent ? '✓ נשלח' : 'שלח למייל לקוח'}
                </button>
              </div>
            </div>

            {/* בר התקדמות */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>התקדמות כוללת</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* רשימות */}
            <div className="space-y-4">
              {/* הושלם */}
              {report.doneTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> הושלם ({report.doneTasks.length})
                  </h3>
                  <div className="space-y-1">
                    {report.doneTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-slate-600 bg-emerald-50/50 rounded-lg px-3 py-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>{t.title}</span>
                        {t.phase && <span className="text-xs text-slate-400 mr-auto">{t.phase}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* בביצוע */}
              {report.activeTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-1.5">
                    <Clock size={14} /> בתהליך ({report.activeTasks.length})
                  </h3>
                  <div className="space-y-1">
                    {report.activeTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-slate-600 bg-blue-50/50 rounded-lg px-3 py-1.5">
                        {statusIcon(t.status)}
                        <span>{t.title}</span>
                        {t.phase && <span className="text-xs text-slate-400 mr-auto">{t.phase}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* תשלומים ממתינים */}
              {report.pending$.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
                    <TrendingUp size={14} /> תשלומים ממתינים ({report.pending$.length})
                  </h3>
                  <div className="space-y-1">
                    {report.pending$.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm text-slate-600 bg-amber-50/50 rounded-lg px-3 py-1.5">
                        <span>{p.title}</span>
                        <span className="font-semibold text-amber-700">₪{p.amount?.toLocaleString('he-IL')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.doneTasks.length === 0 && report.activeTasks.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">אין נתונים לחודש זה עבור פרויקט זה</p>
              )}
            </div>

            {/* פרטי לקוח */}
            {(project.client_name || project.client_email) && (
              <div className="mt-5 pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-400">
                {project.client_name  && <span>לקוח: <strong className="text-slate-600">{project.client_name}</strong></span>}
                {project.client_email && <span>מייל: <strong className="text-slate-600">{project.client_email}</strong></span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
