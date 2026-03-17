import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronRight, ChevronDown, Check, Building2 } from 'lucide-react'

const PROPOSAL_STATUS = {
  draft:    { label: 'טיוטה',       chip: 'bg-slate-100 text-slate-500' },
  sent:     { label: 'נשלח ללקוח',  chip: 'bg-amber-100 text-amber-700' },
  approved: { label: 'מאושר ✓',     chip: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'נדחה',        chip: 'bg-red-100 text-red-600' },
}

// בניית עץ תכולות לבחירה
function buildTree(items) {
  const phases = items.filter(i => i.level === 'phase').sort((a, b) => a.sort_order - b.sort_order)
  return phases.map(phase => ({
    ...phase,
    tasks: items
      .filter(i => i.level === 'task' && i.parent_id === phase.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(task => ({
        ...task,
        subtasks: items
          .filter(i => i.level === 'subtask' && i.parent_id === task.id)
          .sort((a, b) => a.sort_order - b.sort_order)
      }))
  }))
}

// קומפוננטת בחירת תכולות (שלב 2)
function ScopeSelector({ tree, selected, onChange }) {
  const [expanded, setExpanded] = useState({})

  function toggle(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  function isSelected(id) { return selected.has(id) }

  // מצב אינדטרמינט: חלק מהילדים נבחרו
  function isPartial(ids) {
    const sel = ids.filter(id => selected.has(id))
    return sel.length > 0 && sel.length < ids.length
  }

  function togglePhase(phase) {
    const allIds = [
      phase.id,
      ...phase.tasks.map(t => t.id),
      ...phase.tasks.flatMap(t => t.subtasks.map(s => s.id))
    ]
    const allSelected = allIds.every(id => selected.has(id))
    const next = new Set(selected)
    allIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
    onChange(next)
  }

  function toggleTask(task, phaseId) {
    const allIds = [task.id, ...task.subtasks.map(s => s.id)]
    const allSelected = allIds.every(id => selected.has(id))
    const next = new Set(selected)
    allIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
    onChange(next)
  }

  function toggleSub(subId) {
    const next = new Set(selected)
    next.has(subId) ? next.delete(subId) : next.add(subId)
    onChange(next)
  }

  if (tree.length === 0) return (
    <div className="text-center py-8 text-slate-400 text-sm">אין תכולות בקטלוג — הוסיפי תחילה ב"קטלוג תכולות"</div>
  )

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pl-1">
      {tree.map(phase => {
        const phaseTaskIds = phase.tasks.map(t => t.id)
        const phaseSubIds = phase.tasks.flatMap(t => t.subtasks.map(s => s.id))
        const allPhaseIds = [phase.id, ...phaseTaskIds, ...phaseSubIds]
        const phaseAll = allPhaseIds.every(id => selected.has(id))
        const phaseSome = allPhaseIds.some(id => selected.has(id)) && !phaseAll

        return (
          <div key={phase.id} className="border border-slate-200 rounded-xl overflow-hidden">
            {/* שלב */}
            <div className={`flex items-center gap-3 px-3 py-2.5 ${phaseAll ? 'bg-indigo-600' : phaseSome ? 'bg-indigo-50' : 'bg-slate-50'} cursor-pointer`}
              onClick={() => togglePhase(phase)}>
              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                phaseAll ? 'bg-white border-white' : phaseSome ? 'border-indigo-400 bg-white' : 'border-slate-300 bg-white'
              }`}>
                {phaseAll && <Check size={10} className="text-indigo-600" />}
                {phaseSome && <div className="w-2 h-0.5 bg-indigo-400 rounded" />}
              </div>
              <span className={`font-semibold text-sm flex-1 ${phaseAll ? 'text-white' : 'text-slate-700'}`}>{phase.name}</span>
              <button onClick={e => { e.stopPropagation(); toggle(phase.id) }}
                className={`${phaseAll ? 'text-indigo-200' : 'text-slate-400'}`}>
                {expanded[phase.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            {/* משימות */}
            {expanded[phase.id] && (
              <div className="divide-y divide-slate-100">
                {phase.tasks.map(task => {
                  const taskIds = [task.id, ...task.subtasks.map(s => s.id)]
                  const taskAll = taskIds.every(id => selected.has(id))
                  const taskSome = taskIds.some(id => selected.has(id)) && !taskAll

                  return (
                    <div key={task.id}>
                      <div className="flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-slate-50"
                        onClick={() => toggleTask(task)}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          taskAll ? 'bg-indigo-500 border-indigo-500' : taskSome ? 'border-indigo-400 bg-white' : 'border-slate-300 bg-white'
                        }`}>
                          {taskAll && <Check size={10} className="text-white" />}
                          {taskSome && <div className="w-2 h-0.5 bg-indigo-400 rounded" />}
                        </div>
                        <span className="text-sm text-slate-700 flex-1">{task.name}</span>
                        {task.subtasks.length > 0 && (
                          <>
                            <span className="text-xs text-slate-400">{task.subtasks.length}</span>
                            <button onClick={e => { e.stopPropagation(); toggle(task.id) }} className="text-slate-400">
                              {expanded[task.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          </>
                        )}
                      </div>

                      {/* תת-משימות */}
                      {expanded[task.id] && task.subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-3 px-9 py-1.5 cursor-pointer hover:bg-slate-50"
                          onClick={() => toggleSub(sub.id)}>
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                            isSelected(sub.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected(sub.id) && <Check size={9} className="text-white" />}
                          </div>
                          <span className="text-xs text-slate-600">{sub.name}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Clients() {
  const [clients, setClients] = useState([])
  const [proposals, setProposals] = useState([]) // { id, client_id, status }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // מודאל לקוח חדש/עריכה
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [step, setStep] = useState(1) // 1 = פרטים, 2 = תכולות
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' })

  // תכולות לבחירה
  const [contentsTree, setContentsTree] = useState([])
  const [selectedScope, setSelectedScope] = useState(new Set())

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [{ data: c }, { data: p }, { data: ct }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('proposals').select('id, client_id, status, created_at').order('created_at', { ascending: false }),
      supabase.from('contents').select('*').order('sort_order'),
    ])
    setClients(c || [])
    setProposals(p || [])
    setContentsTree(buildTree(ct || []))
    setLoading(false)
  }

  function clientProposal(clientId) {
    return proposals.find(p => p.client_id === clientId) || null
  }

  function openNew() {
    setForm({ name: '', phone: '', email: '', address: '', notes: '' })
    setSelectedScope(new Set())
    setEditClient(null)
    setStep(1)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' })
    setEditClient(c)
    setStep(1)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return

    let clientId = editClient?.id

    if (editClient) {
      await supabase.from('clients').update(form).eq('id', editClient.id)
    } else {
      const { data } = await supabase.from('clients').insert(form).select().single()
      clientId = data.id

      // יצירת הצעה עם תכולות נבחרות
      if (selectedScope.size > 0) {
        const { data: proposal } = await supabase
          .from('proposals')
          .insert({ client_id: clientId, status: 'draft' })
          .select()
          .single()

        const items = [...selectedScope].map(contentId => ({
          proposal_id: proposal.id,
          content_id: contentId,
        }))
        await supabase.from('proposal_items').insert(items)
      }
    }

    setShowForm(false)
    fetchAll()
  }

  async function remove(id) {
    if (!confirm('למחוק לקוח זה?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchAll()
  }

  // אישור הצעה ויצירת פרויקט אוטומטית
  async function approveProposal(client, proposal) {
    if (!confirm(`לאשר את ההצעה של ${client.name} וליצור פרויקט?`)) return

    await supabase.from('proposals').update({ status: 'approved' }).eq('id', proposal.id)

    const { data: propItems } = await supabase
      .from('proposal_items')
      .select('*, contents(*)')
      .eq('proposal_id', proposal.id)

    const today = new Date().toISOString().split('T')[0]

    const { data: project } = await supabase
      .from('projects')
      .insert({
        client_id: client.id,
        proposal_id: proposal.id,
        name: `פרויקט ${client.name}`,
        status: 'active',
        start_date: today,
      })
      .select()
      .single()

    await createTasksFromScope(project.id, propItems, today)

    fetchAll()
    alert(`✅ הפרויקט נפתח! עברי לטאב "פרויקטים" לראות אותו.`)
  }

  async function createTasksFromScope(projectId, propItems, projectStartDate) {
    if (!propItems?.length) return

    const { data: allContents } = await supabase.from('contents').select('*')
    const getContent = id => allContents?.find(c => c.id === id)

    const taskMap = {}

    // שלב 1: יצור משימות-מאקרו (level=task) עם תזמון אוטומטי
    const taskItems = propItems.filter(pi => getContent(pi.content_id)?.level === 'task')

    // קיבוץ לפי שלב לתזמון סדרתי — שמירת סדר לפי sort_order של השלב
    const phaseMap = {}
    taskItems.forEach(pi => {
      const c = getContent(pi.content_id)
      if (!c) return
      const phase = getContent(c.parent_id)
      const phaseKey = phase?.id || 'general'
      if (!phaseMap[phaseKey]) phaseMap[phaseKey] = { phase, tasks: [] }
      phaseMap[phaseKey].tasks.push({ pi, c, phase })
    })
    // מיון שלבים לפי sort_order
    const byPhase = Object.values(phaseMap).sort((a, b) =>
      (a.phase?.sort_order || 0) - (b.phase?.sort_order || 0)
    )
    // מיון משימות בתוך כל שלב לפי sort_order
    byPhase.forEach(p => p.tasks.sort((a, b) => (a.c.sort_order || 0) - (b.c.sort_order || 0)))

    const pStart = projectStartDate ? new Date(projectStartDate) : new Date()
    let phaseCursor = new Date(pStart)

    for (const { phase, tasks: phTasks } of byPhase) {
      const phaseName = phase?.name || 'כללי'
      let taskCursor = new Date(phaseCursor)
      let phaseEnd = new Date(taskCursor)

      for (const { pi, c } of phTasks) {
        const days = c.estimated_days || 7
        const startDate = taskCursor.toISOString().split('T')[0]
        const endDate = new Date(taskCursor)
        endDate.setDate(endDate.getDate() + days)
        const dueDate = endDate.toISOString().split('T')[0]

        const { data: t } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            name: c.name,
            status: 'pending',
            level: 'task',
            phase_name: phaseName,
            content_ref_id: c.id,
            sort_order: (phase?.sort_order || 0) * 100 + (c.sort_order || 0),
            estimated_days: days,
            start_date: startDate,
            due_date: dueDate,
          })
          .select()
          .single()
        if (t) taskMap[c.id] = t.id

        taskCursor = new Date(endDate)
        if (endDate > phaseEnd) phaseEnd = new Date(endDate)
      }
      phaseCursor = new Date(phaseEnd)
    }

    // שלב 2: יצור תת-משימות (level=subtask)
    const subItems = propItems.filter(pi => getContent(pi.content_id)?.level === 'subtask')
    for (const pi of subItems) {
      const c = getContent(pi.content_id)
      if (!c) continue
      const parentContent = getContent(c.parent_id)
      let resolvedParentId = taskMap[parentContent?.id]

      if (!resolvedParentId && parentContent) {
        const phase = getContent(parentContent.parent_id)
        const { data: parentTask } = await supabase
          .from('tasks')
          .insert({
            project_id: projectId,
            name: parentContent.name,
            status: 'pending',
            level: 'task',
            phase_name: phase?.name || '',
            content_ref_id: parentContent.id,
            sort_order: parentContent.sort_order,
            estimated_days: parentContent.estimated_days || 7,
          })
          .select()
          .single()
        if (parentTask) {
          taskMap[parentContent.id] = parentTask.id
          resolvedParentId = parentTask.id
        }
      }

      await supabase.from('tasks').insert({
        project_id: projectId,
        name: c.name,
        status: 'pending',
        level: 'subtask',
        parent_task_id: resolvedParentId || null,
        phase_name: getContent(getContent(c.parent_id)?.parent_id)?.name || '',
        content_ref_id: c.id,
        sort_order: c.sort_order,
      })
    }
  }

  const filtered = clients.filter(c =>
    c.name.includes(search) || (c.phone || '').includes(search) || (c.email || '').includes(search)
  )

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">לקוחות</h1>
          <p className="text-sm text-slate-400 mt-0.5">{clients.length} לקוחות במערכת</p>
        </div>
        <button onClick={openNew}
          className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2">
          <span>+</span> לקוח חדש
        </button>
      </div>

      {/* חיפוש */}
      <div className="relative mb-5">
        <span className="absolute right-3 top-2.5 text-slate-400 text-sm">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, טלפון או אימייל..."
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 pr-9 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={28} className="text-slate-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">
            {search ? 'לא נמצאו תוצאות' : 'אין לקוחות עדיין'}
          </h3>
          {!search && (
            <button onClick={openNew} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
              + לקוח חדש
            </button>
          )}
        </div>
      )}

      {/* רשימה */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map(c => {
          const proposal = clientProposal(c.id)
          const propMeta = proposal ? PROPOSAL_STATUS[proposal.status] : null
          const colors = ['bg-indigo-100 text-indigo-600', 'bg-purple-100 text-purple-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600']
          const color = colors[c.name.charCodeAt(0) % colors.length]

          return (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-base shrink-0 ${color}`}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm">{c.name}</h3>
                      {propMeta && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${propMeta.chip}`}>
                          {propMeta.label}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      {c.phone && <span className="text-xs text-slate-400">📞 {c.phone}</span>}
                      {c.email && <span className="text-xs text-slate-400">✉️ {c.email}</span>}
                      {c.address && <span className="text-xs text-slate-400">📍 {c.address}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-slate-400 mt-0.5 italic">{c.notes}</p>}
                  </div>
                </div>

                <div className="flex gap-2 mr-4 shrink-0 flex-wrap justify-end">
                  {/* כפתורי פעולה לפי סטטוס הצעה */}
                  {proposal?.status === 'draft' && (
                    <button onClick={() => approveProposal(c, proposal)}
                      className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition font-medium">
                      ✅ אשר פרויקט
                    </button>
                  )}
                  {proposal?.status === 'approved' && (
                    <span className="text-xs text-emerald-600 font-medium px-2 py-1.5">פרויקט פתוח</span>
                  )}
                  <button onClick={() => openEdit(c)} className="text-xs text-slate-500 hover:text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition">עריכה</button>
                  <button onClick={() => remove(c.id)} className="text-xs text-slate-400 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition">מחיקה</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal - לקוח חדש / עריכה */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* כותרת + שלבים */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-semibold text-slate-800">
                  {editClient ? 'עריכת לקוח' : 'לקוח חדש'}
                </h2>
                {!editClient && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>1 פרטים</span>
                    <span className="text-slate-300 text-xs">←</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2 תכולות</span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
            </div>

            {/* שלב 1: פרטי לקוח */}
            {step === 1 && (
              <div className="px-6 py-5 space-y-4">
                {[
                  { key: 'name', label: 'שם מלא', placeholder: 'שם הלקוח', required: true },
                  { key: 'phone', label: 'טלפון', placeholder: '050-0000000' },
                  { key: 'email', label: 'אימייל', placeholder: 'email@example.com' },
                  { key: 'address', label: 'כתובת', placeholder: 'רחוב, עיר' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{f.label}{f.required && ' *'}</label>
                    <input value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                      placeholder={f.placeholder} />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">הערות</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
                    rows={2} />
                </div>
              </div>
            )}

            {/* שלב 2: בחירת תכולות */}
            {step === 2 && (
              <div className="px-6 py-5">
                <p className="text-sm text-slate-500 mb-3">
                  בחרי את התכולות שהלקוח{selectedScope.size > 0 ? ` — ${selectedScope.size} פריטים נבחרו` : ''}
                </p>
                <ScopeSelector
                  tree={contentsTree}
                  selected={selectedScope}
                  onChange={setSelectedScope}
                />
              </div>
            )}

            {/* פעולות */}
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              {editClient ? (
                <>
                  <button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">שמירה</button>
                  <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
                </>
              ) : step === 1 ? (
                <>
                  <button onClick={() => { if (form.name.trim()) setStep(2) }}
                    disabled={!form.name.trim()}
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    הבא: בחירת תכולות →
                  </button>
                  <button onClick={() => setShowForm(false)} className="border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
                </>
              ) : (
                <>
                  <button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
                    שמור לקוח {selectedScope.size > 0 ? `+ ${selectedScope.size} תכולות` : '(ללא תכולות)'}
                  </button>
                  <button onClick={() => setStep(1)} className="border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">← חזור</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
