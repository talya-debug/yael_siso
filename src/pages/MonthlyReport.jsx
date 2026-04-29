import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Download, FileText, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

const now = new Date()

function statusIcon(status) {
  if (status === 'done')        return <CheckCircle2 size={14} className="text-emerald-500 shrink-0" strokeWidth={1.8} />
  if (status === 'in_progress') return <Clock size={14} className="text-[#091426] shrink-0" strokeWidth={1.8} />
  if (status === 'blocked')     return <AlertCircle size={14} className="text-red-500 shrink-0" strokeWidth={1.8} />
  return <Clock size={14} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
}

export default function MonthlyReport() {
  const [projects,  setProjects]  = useState([])
  const [projectId, setProjectId] = useState('')
  const [month,     setMonth]     = useState(now.getMonth())
  const [year,      setYear]      = useState(now.getFullYear())
  const [report,    setReport]    = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [sent,      setSent]      = useState(false)

  useEffect(() => {
    supabase.from('projects').select('id, name, status, start_date, clients(name, email)').order('name')
      .then(({ data }) => setProjects(data || []))
  }, [])

  const project = projects.find(p => p.id === projectId)

  async function generateReport() {
    if (!projectId) { alert('Please select a project'); return }
    setLoading(true)
    setSent(false)

    const from = new Date(year, month, 1).toISOString()
    const to   = new Date(year, month + 1, 0, 23, 59, 59).toISOString()

    // חודש הבא — למשימות "צעדים הבאים"
    const nextFrom = new Date(year, month + 1, 1).toISOString()
    const nextTo   = new Date(year, month + 2, 0, 23, 59, 59).toISOString()

    const [{ data: tasks }, { data: nextTasks }, { data: allTasks }, { data: payments }] = await Promise.all([
      supabase.from('tasks')
        .select('id,name,status,due_date,phase_name')
        .eq('project_id', projectId)
        .gte('due_date', from)
        .lte('due_date', to)
        .order('sort_order'),
      supabase.from('tasks')
        .select('id,name,status,due_date,phase_name')
        .eq('project_id', projectId)
        .gte('due_date', nextFrom)
        .lte('due_date', nextTo)
        .neq('status', 'done')
        .order('sort_order'),
      supabase.from('tasks')
        .select('id,name,status,due_date,phase_name')
        .eq('project_id', projectId)
        .order('sort_order'),
      supabase.from('payments')
        .select('id,name,amount,status,due_date')
        .eq('project_id', projectId)
        .order('due_date'),
    ])

    const doneTasks    = (tasks || []).filter(t => t.status === 'done')
    const activeTasks  = (tasks || []).filter(t => t.status === 'in_progress' || t.status === 'blocked')
    const pendingTasks = (tasks || []).filter(t => t.status === 'pending')
    const totalTasks   = (allTasks || []).length
    const totalDone    = (allTasks || []).filter(t => t.status === 'done').length

    // משימות שמחכות ללקוח — כל מה שיש בו "approval" או "client" או "sign"
    const waitingOnClient = (allTasks || []).filter(t =>
      t.status !== 'done' && (
        /approv|client|sign|חתימ|אישור/i.test(t.name)
      )
    )

    const totalBilled = (payments || []).reduce((s, p) => s + (p.amount || 0), 0)
    const totalPaid   = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0)
    const pending$    = (payments || []).filter(p => p.status === 'pending' || p.status === 'sent')

    setReport({
      tasks: tasks || [], doneTasks, activeTasks, pendingTasks, totalTasks, totalDone,
      nextSteps: nextTasks || [], waitingOnClient,
      payments: payments || [], totalBilled, totalPaid, pending$
    })
    setLoading(false)
  }

  function buildEmailBody() {
    if (!report || !project) return ''
    const monthLabel = `${MONTHS[month]} ${year}`
    const progress = report.totalTasks ? Math.round((report.doneTasks.length / report.totalTasks) * 100) : 0

    let body = `Hello,\n\nPlease find the monthly progress report for project "${project.name}" — ${monthLabel}.\n\n`
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    body += `General Summary\n`
    body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    body += `• Overall progress: ${progress}%\n`
    body += `• Tasks completed: ${report.doneTasks.length} out of ${report.totalTasks}\n`
    body += `• Currently in progress: ${report.activeTasks.length}\n\n`

    if (report.doneTasks.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `Completed This Month\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.doneTasks.forEach(t => { body += `• ${t.name}\n` })
      body += '\n'
    }

    if (report.activeTasks.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `In Progress\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.activeTasks.forEach(t => { body += `• ${t.name}\n` })
      body += '\n'
    }

    if (report.nextSteps.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `Next Steps — ${MONTHS[(month + 1) % 12]}\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.nextSteps.forEach(t => { body += `• ${t.name}\n` })
      body += '\n'
    }

    if (report.waitingOnClient.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `Action Required From You\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.waitingOnClient.forEach(t => { body += `• ${t.name}\n` })
      body += '\n'
    }

    if (report.pending$.length > 0) {
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      body += `Pending Payments\n`
      body += `━━━━━━━━━━━━━━━━━━━━━━━━━\n`
      report.pending$.forEach(p => {
        const due = p.due_date ? `(${new Date(p.due_date).toLocaleDateString('en-US')})` : ''
        body += `• ${p.name} — ₪${p.amount?.toLocaleString('en-US')} ${due}\n`
      })
      body += '\n'
    }

    body += `Best regards,\nYael Siso | Interior Design\n`
    return body
  }

  function handleSendEmail() {
    if (!project?.clients?.email) { alert('No email address for the client on this project'); return }
    const subject = encodeURIComponent(`Progress Report — ${project.name} — ${MONTHS[month]} ${year}`)
    const body    = encodeURIComponent(buildEmailBody())
    window.open(`mailto:${project.clients?.email}?subject=${subject}&body=${body}`)
    setSent(true)
  }

  function handleExport() {
    if (!report) return
    const content = buildEmailBody()
    const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    Object.assign(document.createElement('a'), {
      href: url,
      download: `report-${project?.name}-${MONTHS[month]}-${year}.txt`
    }).click()
  }

  const progress = report?.totalTasks
    ? Math.round(((report.totalDone || report.doneTasks.length) / report.totalTasks) * 100)
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Monthly Client Report</h1>
        <p className="text-sm text-[#6B7A90] mt-0.5">Generate a progress report and send via email</p>
      </div>

      <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Project</label>
            <select value={projectId} onChange={e => { setProjectId(e.target.value); setReport(null) }}
              className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition">
              <option value="">— Select Project —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Month</label>
            <select value={month} onChange={e => { setMonth(+e.target.value); setReport(null) }}
              className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition">
              {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Year</label>
            <select value={year} onChange={e => { setYear(+e.target.value); setReport(null) }}
              className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition">
              {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <button onClick={generateReport} disabled={loading || !projectId}
          className="mt-4 flex items-center gap-2 bg-[#091426] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-50">
          <FileText size={15} strokeWidth={1.8} />
          {loading ? 'Generating report...' : 'Generate Report'}
        </button>
      </div>

      {report && project && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 text-center">
              <p className="text-3xl font-bold text-[#091426]">{progress}%</p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-1">Overall Progress</p>
            </div>
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 text-center">
              <p className="text-3xl font-bold text-emerald-600">{report.doneTasks.length}</p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-1">Tasks Completed</p>
            </div>
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 text-center">
              <p className="text-3xl font-bold text-[#091426]">{report.activeTasks.length}</p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-1">In Progress</p>
            </div>
            <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 text-center">
              <p className="text-2xl font-bold text-[#091426]">₪{report.totalPaid.toLocaleString('en-US')}</p>
              <p className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] mt-1">Paid So Far</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h2 className="font-semibold text-[#091426] font-[Manrope] tracking-tight">
                Report {MONTHS[month]} {year} — {project.name}
              </h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleExport}
                  className="flex items-center gap-1.5 text-xs bg-[#F3F3F3] px-3 py-2 rounded-xl text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">
                  <Download size={13} strokeWidth={1.8} /> Export
                </button>
                <button onClick={handleSendEmail}
                  className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-medium transition-all ${
                    sent
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-[#091426] text-white hover:bg-[#1E293B]'
                  }`}>
                  <Mail size={13} strokeWidth={1.8} /> {sent ? '✓ Sent' : 'Send to Client Email'}
                </button>
              </div>
            </div>

            <div className="mb-5">
              <div className="flex justify-between text-xs text-[#6B7A90] mb-1.5">
                <span>Overall Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2.5 bg-[#F3F3F3] rounded-full overflow-hidden">
                <div className="h-full bg-[#091426] rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="space-y-4">
              {report.doneTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-emerald-600 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} strokeWidth={1.8} /> Completed ({report.doneTasks.length})
                  </h3>
                  <div className="space-y-1">
                    {report.doneTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-[#091426] bg-emerald-50/50 rounded-xl px-3 py-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" strokeWidth={1.8} />
                        <span>{t.name}</span>
                        {t.phase_name && <span className="text-xs text-[#6B7A90] ml-auto">{t.phase_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.activeTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#091426] mb-2 flex items-center gap-1.5">
                    <Clock size={14} strokeWidth={1.8} /> In Progress ({report.activeTasks.length})
                  </h3>
                  <div className="space-y-1">
                    {report.activeTasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-[#091426] bg-[#F9F9F9] rounded-xl px-3 py-1.5">
                        {statusIcon(t.status)}
                        <span>{t.name}</span>
                        {t.phase_name && <span className="text-xs text-[#6B7A90] ml-auto">{t.phase_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.pending$.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-amber-600 mb-2 flex items-center gap-1.5">
                    <TrendingUp size={14} strokeWidth={1.8} /> Pending Payments ({report.pending$.length})
                  </h3>
                  <div className="space-y-1">
                    {report.pending$.map(p => (
                      <div key={p.id} className="flex items-center justify-between text-sm text-[#091426] bg-amber-50/50 rounded-xl px-3 py-1.5">
                        <span>{p.name}</span>
                        <span className="font-semibold text-amber-700">₪{p.amount?.toLocaleString('en-US')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps — planned for next month */}
              {report.nextSteps.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-[#7B5800] mb-2 flex items-center gap-1.5">
                    <TrendingUp size={14} strokeWidth={1.8} /> Next Steps — {MONTHS[(month + 1) % 12]} ({report.nextSteps.length})
                  </h3>
                  <div className="space-y-1">
                    {report.nextSteps.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-[#091426] bg-[#F9F9F9] rounded-xl px-3 py-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B5800] shrink-0" />
                        <span>{t.name}</span>
                        {t.phase_name && <span className="text-xs text-[#6B7A90] ml-auto">{t.phase_name}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Waiting on Client */}
              {report.waitingOnClient.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} strokeWidth={1.8} /> Waiting on Client ({report.waitingOnClient.length})
                  </h3>
                  <div className="space-y-1">
                    {report.waitingOnClient.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm text-[#091426] bg-red-50/50 rounded-xl px-3 py-1.5">
                        <AlertCircle size={13} className="text-red-400 shrink-0" strokeWidth={1.8} />
                        <span>{t.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.doneTasks.length === 0 && report.activeTasks.length === 0 && report.nextSteps.length === 0 && (
                <p className="text-sm text-[#6B7A90] text-center py-6">No data for this month for this project</p>
              )}
            </div>

            {(project.clients?.name || project.clients?.email) && (
              <div className="mt-5 pt-4 border-t border-[#F3F3F3] flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs text-[#6B7A90]">
                {project.clients?.name  && <span>Client: <strong className="text-[#091426]">{project.clients.name}</strong></span>}
                {project.clients?.email && <span>Email: <strong className="text-[#091426]">{project.clients.email}</strong></span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
