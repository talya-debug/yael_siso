import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Layers, CheckSquare, Minus, Download } from 'lucide-react'
import { SCOPE_TEMPLATE } from '../data/scopeTemplate'

// בניית עץ היררכי מהנתונים הפלוחים
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

export default function Contents() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ name: '', notes_text: '', estimated_days: '', price: '' })
  const [importing, setImporting] = useState(false)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('contents').select('*').order('sort_order')
    setItems(data || [])
    setLoading(false)
  }

  function toggle(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  function openModal(mode, parent = null, edit = null) {
    setForm({ name: edit?.name || '', notes_text: edit?.notes_text || '', estimated_days: edit?.estimated_days ?? '', price: edit?.price ?? '' })
    setModal({ mode, parent, edit })
  }

  async function importTemplate() {
    if (!confirm('Importing will delete all existing scope items and recreate from template. Continue?')) return
    setImporting(true)
    await supabase.from('contents').delete().not('parent_id', 'is', null)
    await supabase.from('contents').delete().is('parent_id', null)

    for (const phase of SCOPE_TEMPLATE) {
      const { data: phaseRow } = await supabase.from('contents').insert({
        name: phase.name, level: 'phase', category: phase.name,
        sort_order: phase.sort_order, estimated_days: null,
      }).select().single()
      if (!phaseRow) continue

      for (const task of phase.tasks) {
        const { data: taskRow } = await supabase.from('contents').insert({
          name: task.name, level: 'task', parent_id: phaseRow.id,
          category: phase.name, sort_order: task.sort_order,
          estimated_days: task.estimated_days,
        }).select().single()
        if (!taskRow) continue

        for (let i = 0; i < task.subtasks.length; i++) {
          await supabase.from('contents').insert({
            name: task.subtasks[i], level: 'subtask', parent_id: taskRow.id,
            category: phase.name, sort_order: i + 1, estimated_days: null,
          })
        }
      }
    }
    setImporting(false)
    fetch()
  }

  async function save() {
    if (!form.name.trim()) return
    const { mode, parent, edit } = modal

    const payload = {
      name: form.name.trim(),
      notes_text: form.notes_text || null,
      level: mode,
      parent_id: parent?.id || null,
      category: mode === 'phase' ? form.name.trim() : (parent?.category || parent?.name || ''),
      sort_order: edit?.sort_order ?? 999,
      estimated_days: form.estimated_days ? parseInt(form.estimated_days) : null,
      price: form.price ? parseFloat(form.price) : null,
    }

    if (edit) {
      await supabase.from('contents').update(payload).eq('id', edit.id)
    } else {
      await supabase.from('contents').insert(payload)
    }
    setModal(null)
    fetch()
  }

  async function remove(item) {
    if (!confirm(`Delete "${item.name}"? All items under it will also be deleted.`)) return
    await supabase.from('contents').delete().eq('id', item.id)
    const children = items.filter(i => i.parent_id === item.id)
    for (const child of children) {
      await supabase.from('contents').delete().eq('parent_id', child.id)
      await supabase.from('contents').delete().eq('id', child.id)
    }
    fetch()
  }

  const tree = buildTree(items)

  const totalTasks = items.filter(i => i.level === 'task').length
  const totalSubtasks = items.filter(i => i.level === 'subtask').length

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Scope Catalog</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">
            {tree.length} phases · {totalTasks} tasks · {totalSubtasks} subtasks
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={importTemplate} disabled={importing}
            className="bg-[#F3F3F3] text-[#091426] px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-[#F9F9F9] transition-all flex items-center gap-2 disabled:opacity-50">
            <Download size={15} strokeWidth={1.8} /> {importing ? 'Importing...' : 'Import Template'}
          </button>
          <button onClick={() => openModal('phase')}
            className="bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-2">
            <Plus size={16} strokeWidth={1.8} /> New Phase
          </button>
        </div>
      </div>

      {/* empty state */}
      {tree.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center mb-4">
            <Layers size={28} className="text-[#6B7A90]" strokeWidth={1.8} />
          </div>
          <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">No scope items yet</h3>
          <p className="text-sm text-[#6B7A90] mb-5">Add phases and tasks to the catalog</p>
          <button onClick={() => openModal('phase')} className="bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
            + First Phase
          </button>
        </div>
      )}

      {/* עץ תכולות */}
      <div className="space-y-3">
        {tree.map(phase => (
          <div key={phase.id} className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden">
            {/* כותרת שלב */}
            <div className="bg-[#091426] rounded-t-2xl px-4 py-3 flex items-center justify-between">
              <button onClick={() => toggle(phase.id)} className="flex items-center gap-2 flex-1 text-left">
                {expanded[phase.id]
                  ? <ChevronDown size={16} className="text-[#6B7A90]" strokeWidth={1.8} />
                  : <ChevronRight size={16} className="text-[#6B7A90]" strokeWidth={1.8} />
                }
                <span className="font-semibold text-white text-sm">{phase.name}</span>
                <span className="text-xs text-[#6B7A90] ml-1">
                  ({phase.tasks.length} tasks)
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => { toggle(phase.id); openModal('task', phase) }}
                  className="text-[#6B7A90] hover:text-white px-2 py-1 rounded-xl text-xs hover:bg-white/10 transition flex items-center gap-1">
                  <Plus size={12} strokeWidth={1.8} /> Task
                </button>
                <button onClick={() => openModal('phase', null, phase)}
                  className="text-[#6B7A90] hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition">
                  <Pencil size={13} strokeWidth={1.8} />
                </button>
                <button onClick={() => remove(phase)}
                  className="text-[#6B7A90] hover:text-red-300 p-1.5 rounded-xl hover:bg-white/10 transition">
                  <Trash2 size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>

            {/* משימות תחת השלב */}
            {expanded[phase.id] && (
              <div className="divide-y divide-[#F3F3F3]">
                {phase.tasks.length === 0 && (
                  <div className="px-6 py-4 text-sm text-[#6B7A90] italic">No tasks yet</div>
                )}
                {phase.tasks.map(task => (
                  <div key={task.id}>
                    {/* שורת משימה */}
                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F9F9F9] group transition-colors">
                      <div className="flex items-center gap-2 flex-1">
                        <button onClick={() => toggle(task.id)}
                          className="text-[#6B7A90] hover:text-[#091426] transition shrink-0">
                          {task.subtasks.length > 0
                            ? (expanded[task.id]
                              ? <ChevronDown size={14} strokeWidth={1.8} />
                              : <ChevronRight size={14} strokeWidth={1.8} />)
                            : <Minus size={14} className="opacity-30" strokeWidth={1.8} />
                          }
                        </button>
                        <CheckSquare size={14} className="text-[#6B7A90] shrink-0" strokeWidth={1.8} />
                        <div>
                          <span className="text-sm font-medium text-[#091426]">{task.name}</span>
                          {task.notes_text && (
                            <p className="text-xs text-[#6B7A90] mt-0.5">{task.notes_text}</p>
                          )}
                        </div>
                        {task.price && (
                          <span className="text-xs bg-amber-50 text-[#7B5800] px-2 py-0.5 rounded-full ml-1 font-medium">
                            {task.price.toLocaleString()} &#8362;
                          </span>
                        )}
                        {task.subtasks.length > 0 && (
                          <span className="text-xs bg-[#F3F3F3] text-[#091426] px-2 py-0.5 rounded-full ml-1">
                            {task.subtasks.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => { toggle(task.id); openModal('subtask', task) }}
                          className="text-[#6B7A90] hover:text-[#091426] px-2 py-1 rounded-xl text-xs hover:bg-[#F3F3F3] transition flex items-center gap-1">
                          <Plus size={11} strokeWidth={1.8} /> Subtask
                        </button>
                        <button onClick={() => openModal('task', phase, task)}
                          className="text-[#6B7A90] hover:text-[#091426] p-1.5 rounded-xl hover:bg-[#F3F3F3] transition">
                          <Pencil size={12} strokeWidth={1.8} />
                        </button>
                        <button onClick={() => remove(task)}
                          className="text-[#6B7A90] hover:text-red-500 p-1.5 rounded-xl hover:bg-red-50 transition">
                          <Trash2 size={12} strokeWidth={1.8} />
                        </button>
                      </div>
                    </div>

                    {/* תת-משימות */}
                    {expanded[task.id] && task.subtasks.length > 0 && (
                      <div className="bg-[#F9F9F9] divide-y divide-[#F3F3F3]">
                        {task.subtasks.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between px-10 py-2.5 group hover:bg-[#F3F3F3] transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-[#6B7A90]" />
                              <span className="text-xs text-[#091426]">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => openModal('subtask', task, sub)}
                                className="text-[#6B7A90] hover:text-[#091426] p-1 rounded-xl hover:bg-[#F3F3F3] transition">
                                <Pencil size={11} strokeWidth={1.8} />
                              </button>
                              <button onClick={() => remove(sub)}
                                className="text-[#6B7A90] hover:text-red-500 p-1 rounded-xl hover:bg-red-50 transition">
                                <Trash2 size={11} strokeWidth={1.8} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal הוספה/עריכה */}
      {modal && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
              <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">
                {modal.edit ? 'Edit' : modal.mode === 'phase' ? '+ New Phase' : modal.mode === 'task' ? '+ New Task' : '+ New Subtask'}
                {modal.parent && <span className="text-[#6B7A90] font-normal text-sm ml-2">under {modal.parent.name}</span>}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  autoFocus onKeyDown={e => e.key === 'Enter' && save()}
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
                  placeholder={modal.mode === 'phase' ? 'e.g.: Initial Planning' : modal.mode === 'task' ? 'Task name' : 'Subtask name'} />
              </div>
              {modal.mode !== 'phase' && modal.mode !== 'subtask' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Estimated Duration (days)</label>
                    <input type="number" min="1" value={form.estimated_days} onChange={e => setForm({ ...form, estimated_days: e.target.value })}
                      placeholder="e.g.: 7"
                      className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Price &#8362;</label>
                    <input type="number" min="0" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="e.g.: 5000"
                      className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition" />
                  </div>
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5">Notes (optional)</label>
                <textarea value={form.notes_text} onChange={e => setForm({ ...form, notes_text: e.target.value })}
                  className="w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition resize-none"
                  rows={2} placeholder="Notes, instructions or additional details" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
              <button onClick={save} className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">Save</button>
              <button onClick={() => setModal(null)} className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
