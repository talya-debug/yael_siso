import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronRight, ChevronDown, Check, Building2 } from 'lucide-react'

const PROPOSAL_STATUS = {
  draft:    { label: 'Draft',           chip: 'bg-[#F3F3F3] text-[#6B7A90]' },
  sent:     { label: 'Sent to Client',  chip: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved ✓',      chip: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'Rejected',        chip: 'bg-red-50 text-red-600' },
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
    <div className="text-center py-8 text-[#6B7A90] text-sm">No scope items in catalog — add some in "Scope Templates" first</div>
  )

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {tree.map(phase => {
        const phaseTaskIds = phase.tasks.map(t => t.id)
        const phaseSubIds = phase.tasks.flatMap(t => t.subtasks.map(s => s.id))
        const allPhaseIds = [phase.id, ...phaseTaskIds, ...phaseSubIds]
        const phaseAll = allPhaseIds.every(id => selected.has(id))
        const phaseSome = allPhaseIds.some(id => selected.has(id)) && !phaseAll

        return (
          <div key={phase.id} className="rounded-xl overflow-hidden shadow-[0_2px_20px_rgba(9,20,38,0.04)]">
            {/* שלב */}
            <div className={`flex items-center gap-3 px-3 py-2.5 ${phaseAll ? 'bg-[#091426]' : 'bg-[#F3F3F3]'} cursor-pointer`}
              onClick={() => togglePhase(phase)}>
              <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                phaseAll ? 'bg-white border-white' : phaseSome ? 'border-[#6B7A90] bg-white' : 'border-[#6B7A90]/40 bg-white'
              }`}>
                {phaseAll && <Check size={10} className="text-[#091426]" />}
                {phaseSome && <div className="w-2 h-0.5 bg-[#6B7A90] rounded" />}
              </div>
              <span className={`font-semibold text-sm flex-1 ${phaseAll ? 'text-white' : 'text-[#091426]'}`}>{phase.name}</span>
              <button onClick={e => { e.stopPropagation(); toggle(phase.id) }}
                className={`${phaseAll ? 'text-gray-300' : 'text-[#6B7A90]'}`}>
                {expanded[phase.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            </div>

            {/* משימות */}
            {expanded[phase.id] && (
              <div>
                {phase.tasks.map(task => {
                  const taskIds = [task.id, ...task.subtasks.map(s => s.id)]
                  const taskAll = taskIds.every(id => selected.has(id))
                  const taskSome = taskIds.some(id => selected.has(id)) && !taskAll

                  return (
                    <div key={task.id}>
                      <div className="flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-[#F9F9F9] transition"
                        onClick={() => toggleTask(task)}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          taskAll ? 'bg-[#091426] border-[#091426]' : taskSome ? 'border-[#6B7A90] bg-white' : 'border-[#6B7A90]/40 bg-white'
                        }`}>
                          {taskAll && <Check size={10} className="text-white" />}
                          {taskSome && <div className="w-2 h-0.5 bg-[#6B7A90] rounded" />}
                        </div>
                        <span className="text-sm text-[#091426] flex-1">
                          {task.name}
                          {task.price > 0 && (
                            <span className="text-xs text-[#7B5800] bg-amber-50 px-1.5 py-0.5 rounded-full ml-1.5 font-medium">
                              {task.price.toLocaleString()} &#8362;
                            </span>
                          )}
                        </span>
                        {task.subtasks.length > 0 && (
                          <>
                            <span className="text-xs text-[#6B7A90]">{task.subtasks.length}</span>
                            <button onClick={e => { e.stopPropagation(); toggle(task.id) }} className="text-[#6B7A90]">
                              {expanded[task.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                          </>
                        )}
                      </div>

                      {/* תת-משימות */}
                      {expanded[task.id] && task.subtasks.map(sub => (
                        <div key={sub.id} className="flex items-center gap-3 px-9 py-1.5 cursor-pointer hover:bg-[#F9F9F9] transition"
                          onClick={() => toggleSub(sub.id)}>
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border ${
                            isSelected(sub.id) ? 'bg-[#091426] border-[#091426]' : 'border-[#6B7A90]/40 bg-white'
                          }`}>
                            {isSelected(sub.id) && <Check size={9} className="text-white" />}
                          </div>
                          <span className="text-xs text-[#6B7A90]">{sub.name}</span>
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
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // מודאל לקוח חדש/עריכה
  const [showForm, setShowForm] = useState(false)
  const [editClient, setEditClient] = useState(null)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', notes: '', budget: '' })

  // תכולות לבחירה
  const [contentsTree, setContentsTree] = useState([])
  const [selectedScope, setSelectedScope] = useState(new Set())

  // מודאל פתיחת פרויקט (אישור + חלוקת גבייה במודאל אחד)
  const [showOpenProject, setShowOpenProject] = useState(null)
  const [openProjectPrice, setOpenProjectPrice] = useState('')
  const [billingRows, setBillingRows] = useState([])
  const [creatingProject, setCreatingProject] = useState(false)

  // עריכת תכולות ללקוח קיים
  const [showScopeEdit, setShowScopeEdit] = useState(false)
  const [scopeEditClient, setScopeEditClient] = useState(null)
  const [scopeEditProposal, setScopeEditProposal] = useState(null)
  const [savingScope, setSavingScope] = useState(false)

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
    setForm({ name: '', phone: '', email: '', address: '', notes: '', budget: '' })
    setSelectedScope(new Set())
    setEditClient(null)
    setStep(1)
    setShowForm(true)
  }

  function openEdit(c) {
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '', budget: c.budget || '' })
    setEditClient(c)
    setStep(1)
    setShowForm(true)
  }

  async function save() {
    if (!form.name.trim()) return

    let clientId = editClient?.id
    const payload = { ...form, budget: form.budget ? Number(form.budget) : null }

    if (editClient) {
      await supabase.from('clients').update(payload).eq('id', editClient.id)
    } else {
      const { data } = await supabase.from('clients').insert(payload).select().single()
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
    if (!confirm('Delete this client?')) return
    await supabase.from('clients').delete().eq('id', id)
    fetchAll()
  }

  // פתיחת עריכת תכולות ללקוח קיים
  async function openEditScope(client) {
    const proposal = clientProposal(client.id)
    setScopeEditClient(client)

    if (proposal) {
      // טען בחירות קיימות
      const { data: items } = await supabase
        .from('proposal_items')
        .select('content_id')
        .eq('proposal_id', proposal.id)
      const ids = new Set((items || []).map(i => i.content_id))
      setSelectedScope(ids)
      setScopeEditProposal(proposal)
    } else {
      setSelectedScope(new Set())
      setScopeEditProposal(null)
    }
    setShowScopeEdit(true)
  }

  // שמירת תכולות מעודכנות
  async function saveScope() {
    if (!scopeEditClient) return
    setSavingScope(true)

    let proposalId = scopeEditProposal?.id

    if (!proposalId) {
      // יצירת הצעה חדשה אם אין
      const { data: newProp } = await supabase
        .from('proposals')
        .insert({ client_id: scopeEditClient.id, status: 'draft' })
        .select()
        .single()
      proposalId = newProp.id
    } else {
      // מחיקת פריטים ישנים
      await supabase.from('proposal_items').delete().eq('proposal_id', proposalId)
    }

    // הוספת פריטים חדשים
    if (selectedScope.size > 0) {
      const items = [...selectedScope].map(contentId => ({
        proposal_id: proposalId,
        content_id: contentId,
      }))
      await supabase.from('proposal_items').insert(items)
    }

    setSavingScope(false)
    setShowScopeEdit(false)
    fetchAll()
  }

  // פתיחת מודאל פרויקט — טוען תכולות ובונה שורות גבייה
  async function openProjectModal(client, proposal) {
    const { data: propItems } = await supabase
      .from('proposal_items')
      .select('*, contents(*)')
      .eq('proposal_id', proposal.id)

    // שלב phases מהתכולות הנבחרות
    const selectedPhases = [...new Set(
      (propItems || [])
        .map(pi => pi.contents?.category)
        .filter(Boolean)
    )]

    const price = client.budget || 0
    const advanceAmount = Math.round(price * 0.3)

    const rows = [
      { name: 'Advance Payment', amount: advanceAmount, milestone: '__advance__' },
    ]

    setShowOpenProject({ client, proposal, propItems, phases: selectedPhases })
    setOpenProjectPrice(price.toString())
    setBillingRows(rows)
  }

  // חישוב סכום שנותר להקצאה
  function getRemainingAmount() {
    const total = parseFloat(openProjectPrice) || 0
    const allocated = billingRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    return total - allocated
  }

  // הוספת שורת גבייה
  function addBillingRow() {
    setBillingRows([...billingRows, { name: '', amount: 0, milestone: '' }])
  }

  // הסרת שורת גבייה
  function removeBillingRow(index) {
    setBillingRows(billingRows.filter((_, i) => i !== index))
  }

  // עדכון שורת גבייה
  function updateBillingRow(index, field, value) {
    const next = [...billingRows]
    next[index] = { ...next[index], [field]: value }
    setBillingRows(next)
  }

  // יצירת פרויקט + גבייה + משימות — הכל בפעולה אחת
  async function createProject() {
    if (!showOpenProject) return
    const { client, proposal, propItems } = showOpenProject
    const projectPrice = parseFloat(openProjectPrice) || 0

    if (projectPrice <= 0) return
    if (Math.abs(getRemainingAmount()) > 1) return

    setCreatingProject(true)

    try {
      // 1. אישור הצעה
      await supabase.from('proposals').update({ status: 'approved' }).eq('id', proposal.id)

      // 2. יצירת פרויקט
      const today = new Date().toISOString().split('T')[0]
      const { data: project, error: projError } = await supabase
        .from('projects')
        .insert({
          client_id: client.id,
          proposal_id: proposal.id,
          name: `Project ${client.name}`,
          status: 'active',
          start_date: today,
          project_price: projectPrice,
        })
        .select()
        .single()

      if (projError || !project) {
        alert('Error creating project: ' + (projError?.message || 'Unknown error'))
        return
      }

      // 3. יצירת אבני דרך גבייה
      const paymentRows = billingRows
        .filter(r => (parseFloat(r.amount) || 0) > 0)
        .map(r => ({
          project_id: project.id,
          name: r.name,
          amount: parseFloat(r.amount) || 0,
          pct: Math.round(((parseFloat(r.amount) || 0) / projectPrice) * 100),
          status: r.milestone === '__advance__' ? 'sent' : 'pending',
          due_date: null,
        }))

      if (paymentRows.length > 0) {
        await supabase.from('payments').insert(paymentRows)
      }

      // 4. יצירת משימות מתכולות
      if (propItems?.length) {
        await createTasksFromScope(project.id, propItems, today)
      }

      // 5. סגירה ורענון
      setShowOpenProject(null)
      setBillingRows([])
      setOpenProjectPrice('')
      fetchAll()
    } finally {
      setCreatingProject(false)
    }
  }

  async function createTasksFromScope(projectId, propItems, projectStartDate) {
    if (!propItems?.length) return

    const { data: allContents } = await supabase.from('contents').select('*')
    const getContent = id => allContents?.find(c => c.id === id)

    const taskMap = {}

    // שלב 1: יצור משימות-מאקרו (level=task) עם תזמון אוטומטי
    const taskItems = propItems.filter(pi => getContent(pi.content_id)?.level === 'task')

    const phaseMap = {}
    taskItems.forEach(pi => {
      const c = getContent(pi.content_id)
      if (!c) return
      const phase = getContent(c.parent_id)
      const phaseKey = phase?.id || 'general'
      if (!phaseMap[phaseKey]) phaseMap[phaseKey] = { phase, tasks: [] }
      phaseMap[phaseKey].tasks.push({ pi, c, phase })
    })
    const byPhase = Object.values(phaseMap).sort((a, b) =>
      (a.phase?.sort_order || 0) - (b.phase?.sort_order || 0)
    )
    byPhase.forEach(p => p.tasks.sort((a, b) => (a.c.sort_order || 0) - (b.c.sort_order || 0)))

    const pStart = projectStartDate ? new Date(projectStartDate) : new Date()
    let phaseCursor = new Date(pStart)

    for (const { phase, tasks: phTasks } of byPhase) {
      const phaseName = phase?.name || 'General'
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

    // שלב 2: יצור תת-משימות — batch insert לביצועים
    const allSubContents = allContents?.filter(c => c.level === 'subtask') || []
    const subBatch = []

    for (const [contentId, taskId] of Object.entries(taskMap)) {
      const taskSubs = allSubContents.filter(s => s.parent_id === contentId)
      taskSubs.forEach(s => {
        const phase = getContent(getContent(s.parent_id)?.parent_id)
        subBatch.push({
          project_id: projectId,
          name: s.name,
          status: 'pending',
          level: 'subtask',
          parent_task_id: taskId,
          phase_name: phase?.name || '',
          content_ref_id: s.id,
          sort_order: s.sort_order || 0,
        })
      })
    }

    // Insert subtasks in batches of 50
    for (let i = 0; i < subBatch.length; i += 50) {
      await supabase.from('tasks').insert(subBatch.slice(i, i + 50))
    }
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone || '').toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Clients</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">{clients.length} clients in system</p>
        </div>
        <button onClick={openNew} aria-label="Add new client"
          className="bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-2">
          <span>+</span> New Client
        </button>
      </div>

      {/* חיפוש */}
      <div className="relative mb-5">
        <span className="absolute left-3 top-2.5 text-[#6B7A90] text-sm">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone or email..."
          className="w-full bg-[#F3F3F3] rounded-xl px-4 py-2.5 pl-9 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition" />
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center mb-4">
            <Building2 size={28} strokeWidth={1.8} className="text-[#6B7A90]" />
          </div>
          <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">
            {search ? 'No results found' : 'No clients yet'}
          </h3>
          {!search && (
            <button onClick={openNew} className="mt-4 bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
              + New Client
            </button>
          )}
        </div>
      )}

      {/* רשימה */}
      <div className="grid grid-cols-1 gap-3">
        {filtered.map(c => {
          const proposal = clientProposal(c.id)
          const propMeta = proposal ? PROPOSAL_STATUS[proposal.status] : null
          const colors = ['bg-[#F3F3F3] text-[#091426]', 'bg-[#F9F9F9] text-[#091426]', 'bg-emerald-50 text-emerald-700', 'bg-amber-50 text-amber-700']
          const color = colors[c.name.charCodeAt(0) % colors.length]

          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] p-4 hover:scale-[1.02] transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-base shrink-0 ${color}`}>
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#091426] text-sm">{c.name}</h3>
                      {propMeta && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${propMeta.chip}`}>
                          {propMeta.label}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-0.5 flex-wrap items-center">
                      {c.phone && <span className="text-xs text-[#6B7A90]">📞 {c.phone}</span>}
                      {c.email && <span className="text-xs text-[#6B7A90]">✉️ {c.email}</span>}
                      {c.address && <span className="text-xs text-[#6B7A90]">📍 {c.address}</span>}
                    </div>
                    {c.notes && <p className="text-xs text-[#6B7A90] mt-0.5 italic">{c.notes}</p>}
                    {/* Budget — inline editable */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">Budget:</span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-[#6B7A90]">₪</span>
                        <input
                          type="number"
                          defaultValue={c.budget || ''}
                          placeholder="Set budget"
                          onBlur={async e => {
                            const val = e.target.value ? Number(e.target.value) : null
                            if (val !== (c.budget || null)) {
                              await supabase.from('clients').update({ budget: val }).eq('id', c.id)
                              fetchAll()
                            }
                          }}
                          className="w-24 bg-[#F3F3F3] rounded-lg px-2 py-1 text-sm font-semibold text-[#091426] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 sm:ml-4 shrink-0 flex-wrap">
                  {(proposal?.status === 'draft' || proposal?.status === 'sent') && (
                    <button onClick={() => openProjectModal(c, proposal)}
                      className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-xl hover:bg-emerald-600 transition-all font-medium">
                      Approve Project
                    </button>
                  )}
                  {proposal?.status === 'approved' && (
                    <span className="text-xs text-emerald-600 font-medium px-2 py-1.5">Project Open</span>
                  )}
                  <button onClick={() => openEditScope(c)}
                    className="text-xs text-[#7B5800] hover:text-[#B8960B] px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-all font-medium">
                    Edit Scope
                  </button>
                  <button onClick={() => openEdit(c)} className="text-xs text-[#6B7A90] hover:text-[#091426] px-3 py-1.5 rounded-xl hover:bg-[#F9F9F9] transition-all">Edit</button>
                  <button onClick={() => remove(c.id)} className="text-xs text-[#6B7A90] hover:text-red-500 px-3 py-1.5 rounded-xl hover:bg-red-50 transition-all">Delete</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal - לקוח חדש / עריכה */}
      {showForm && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* כותרת + שלבים */}
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">
                  {editClient ? 'Edit Client' : 'New Client'}
                </h2>
                {!editClient && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step === 1 ? 'bg-[#091426] text-white' : 'bg-[#F3F3F3] text-[#6B7A90]'}`}>1 Details</span>
                    <span className="text-[#6B7A90] text-xs">→</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${step === 2 ? 'bg-[#091426] text-white' : 'bg-[#F3F3F3] text-[#6B7A90]'}`}>2 Scope</span>
                  </div>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90] transition-all">✕</button>
            </div>

            {/* שלב 1: פרטי לקוח */}
            {step === 1 && (
              <div className="px-6 py-5 space-y-4">
                {[
                  { key: 'name', label: 'Full Name', placeholder: 'Client name', required: true },
                  { key: 'phone', label: 'Phone', placeholder: '050-0000000' },
                  { key: 'email', label: 'Email', placeholder: 'email@example.com' },
                  { key: 'address', label: 'Address', placeholder: 'Street, City' },
                  { key: 'budget', label: 'Project Budget (₪)', placeholder: '80000', type: 'number' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">{f.label}{f.required && ' *'}</label>
                    <input type={f.type || 'text'} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
                      placeholder={f.placeholder} />
                  </div>
                ))}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                    className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition resize-none"
                    rows={2} />
                </div>
              </div>
            )}

            {/* שלב 2: בחירת תכולות */}
            {step === 2 && (
              <div className="px-6 py-5">
                <p className="text-sm text-[#6B7A90] mb-3">
                  Select scope items for the client{selectedScope.size > 0 ? ` — ${selectedScope.size} items selected` : ''}
                </p>
                <ScopeSelector
                  tree={contentsTree}
                  selected={selectedScope}
                  onChange={setSelectedScope}
                />
              </div>
            )}

            {/* פעולות */}
            <div className="flex flex-wrap gap-2 px-6 py-4">
              {editClient ? (
                <>
                  <button onClick={save} className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">Save</button>
                  <button onClick={() => setShowForm(false)} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
                </>
              ) : step === 1 ? (
                <>
                  <button onClick={() => { if (form.name.trim()) setStep(2) }}
                    disabled={!form.name.trim()}
                    className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    Next: Select Scope →
                  </button>
                  <button onClick={() => setShowForm(false)} className="bg-[#F3F3F3] px-4 py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={save} className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
                    Save Client {selectedScope.size > 0 ? `+ ${selectedScope.size} scope items` : '(no scope)'}
                  </button>
                  <button onClick={() => setStep(1)} className="bg-[#F3F3F3] px-4 py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">← Back</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal — עריכת תכולות ללקוח קיים */}
      {showScopeEdit && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">
                  Edit Scope — {scopeEditClient?.name}
                </h2>
                <p className="text-xs text-[#6B7A90] mt-0.5">
                  {selectedScope.size} items selected
                </p>
              </div>
              <button onClick={() => setShowScopeEdit(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90] transition-all">✕</button>
            </div>

            <div className="px-6 py-4">
              <ScopeSelector
                tree={contentsTree}
                selected={selectedScope}
                onChange={setSelectedScope}
              />
            </div>

            <div className="flex flex-wrap gap-2 px-6 py-4">
              <button onClick={saveScope} disabled={savingScope}
                className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-50">
                {savingScope ? 'Saving...' : `Save Scope (${selectedScope.size} items)`}
              </button>
              <button onClick={() => setShowScopeEdit(false)}
                className="bg-[#F3F3F3] px-4 py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Open Project (Approve + Billing Setup) */}
      {showOpenProject && (() => {
        const totalPrice = parseFloat(openProjectPrice) || 0
        const allocated = billingRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
        const remaining = totalPrice - allocated
        const isBalanced = Math.abs(remaining) <= 1 && totalPrice > 0

        return (
          <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              {/* כותרת */}
              <div className="px-6 py-4 border-b border-[#F3F3F3] sticky top-0 bg-white rounded-t-2xl z-10">
                <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">
                  Open Project — Billing Setup
                </h2>
                <p className="text-sm text-[#6B7A90] mt-0.5">
                  {showOpenProject.client.name}
                </p>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* מחיר פרויקט */}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">
                    TOTAL PROJECT PRICE
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A90] text-lg font-medium">₪</span>
                    <input type="number" value={openProjectPrice}
                      onChange={e => {
                        const newPrice = e.target.value
                        setOpenProjectPrice(newPrice)
                        // עדכון שורת מקדמה ל-30% מהמחיר החדש
                        const p = parseFloat(newPrice) || 0
                        setBillingRows(prev => prev.map((r, i) =>
                          i === 0 && r.milestone === '__advance__'
                            ? { ...r, amount: Math.round(p * 0.3) }
                            : r
                        ))
                      }}
                      placeholder="Enter project price"
                      autoFocus
                      className="w-full bg-[#F3F3F3] rounded-xl pl-8 pr-4 py-3 text-lg font-bold text-[#091426] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition" />
                  </div>
                </div>

                {/* שורות גבייה */}
                <div>
                  <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-2">
                    BILLING MILESTONES
                  </label>
                  <div className="space-y-2">
                    {billingRows.map((row, i) => (
                      <div key={i} className="bg-[#F9F9F9] rounded-xl px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {/* שם */}
                          <input type="text" value={row.name}
                            onChange={e => updateBillingRow(i, 'name', e.target.value)}
                            placeholder="Payment name"
                            className="flex-1 min-w-[120px] bg-[#F3F3F3] rounded-xl px-3 py-2 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition" />
                          {/* סכום */}
                          <div className="relative shrink-0">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#6B7A90] text-xs">₪</span>
                            <input type="number" value={row.amount}
                              onChange={e => updateBillingRow(i, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-24 bg-[#F3F3F3] rounded-xl pl-6 pr-2 py-2 text-sm font-semibold text-[#091426] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition text-right" />
                          </div>
                          {/* שלב */}
                          <select value={row.milestone}
                            onChange={e => updateBillingRow(i, 'milestone', e.target.value)}
                            className="bg-[#F3F3F3] rounded-xl px-2 py-2 text-sm text-[#091426] border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition shrink-0 max-w-[160px]">
                            <option value="__advance__">Advance (immediate)</option>
                            {(showOpenProject.phases || []).map(phase => (
                              <option key={phase} value={phase}>{phase}</option>
                            ))}
                          </select>
                          {/* מחיקה */}
                          {billingRows.length > 1 && (
                            <button onClick={() => removeBillingRow(i)}
                              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#6B7A90] hover:text-red-500 transition-all shrink-0 text-sm">
                              x
                            </button>
                          )}
                        </div>
                        {/* אחוז מהסכום */}
                        {totalPrice > 0 && (
                          <div className="text-[10px] text-[#6B7A90] mt-1 text-right">
                            {Math.round(((parseFloat(row.amount) || 0) / totalPrice) * 100)}% of total
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* הוספת שורה */}
                  <button onClick={addBillingRow}
                    className="mt-2 text-xs text-[#7B5800] hover:text-[#B8960B] font-medium px-3 py-1.5 rounded-xl hover:bg-amber-50 transition-all">
                    + Add Payment Row
                  </button>
                </div>

                {/* סיכום */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F9F9F9] rounded-xl flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">ALLOCATED</span>
                    <div className="text-sm font-bold text-[#091426]">₪{allocated.toLocaleString()}</div>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">CONTRACT</span>
                    <div className="text-sm font-bold text-[#091426]">₪{totalPrice.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90]">REMAINING</span>
                    <div className={`text-sm font-bold ${isBalanced ? 'text-emerald-600' : remaining > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                      {isBalanced ? 'Balanced' : `₪${remaining.toLocaleString()}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* פעולות */}
              <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-[#F3F3F3] sticky bottom-0 bg-white rounded-b-2xl">
                <button onClick={createProject}
                  disabled={!isBalanced || creatingProject}
                  className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-[#1E293B] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
                <button onClick={() => setShowOpenProject(null)}
                  disabled={creatingProject}
                  className="bg-[#F3F3F3] px-4 py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all disabled:opacity-40">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
