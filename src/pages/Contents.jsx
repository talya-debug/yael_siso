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
  const [expanded, setExpanded] = useState({}) // { id: true/false }
  const [modal, setModal] = useState(null) // { mode: 'phase'|'task'|'subtask', parent: obj|null, edit: obj|null }
  const [form, setForm] = useState({ name: '', notes_text: '', estimated_days: '' })
  const [importing, setImporting] = useState(false)

  useEffect(() => { fetch() }, [])

  async function fetch() {
    const { data } = await supabase.from('contents').select('*').order('sort_order')
    setItems(data || [])
    setLoading(false)
  }

  function toggle(id) { setExpanded(p => ({ ...p, [id]: !p[id] })) }

  function openModal(mode, parent = null, edit = null) {
    setForm({ name: edit?.name || '', notes_text: edit?.notes_text || '', estimated_days: edit?.estimated_days ?? '' })
    setModal({ mode, parent, edit })
  }

  async function importTemplate() {
    if (!confirm('ייבוא יימחק את כל התכולות הקיימות וייצור מחדש לפי התבנית. להמשיך?')) return
    setImporting(true)
    // מחיקה לפי parent_id: ילדים (tasks+subtasks) לפני הורים (phases) — מונע FK errors
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
    if (!confirm(`למחוק "${item.name}"? כל הפריטים תחתיו יימחקו גם.`)) return
    await supabase.from('contents').delete().eq('id', item.id)
    // מחיקה רקורסיבית של ילדים
    const children = items.filter(i => i.parent_id === item.id)
    for (const child of children) {
      await supabase.from('contents').delete().eq('parent_id', child.id) // subtasks of task
      await supabase.from('contents').delete().eq('id', child.id)
    }
    fetch()
  }

  const tree = buildTree(items)

  // ספירת כל המשימות ותת-המשימות
  const totalTasks = items.filter(i => i.level === 'task').length
  const totalSubtasks = items.filter(i => i.level === 'subtask').length

  if (loading) return <div className="text-slate-400 p-8 text-sm">טוען...</div>

  return (
    <div>
      {/* כותרת */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">קטלוג תכולות</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {tree.length} שלבים · {totalTasks} משימות · {totalSubtasks} תת-משימות
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={importTemplate} disabled={importing}
            className="border border-indigo-300 text-indigo-600 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-50 transition flex items-center gap-2 disabled:opacity-50">
            <Download size={15} /> {importing ? 'מייבא...' : 'ייבא תבנית'}
          </button>
          <button onClick={() => openModal('phase')}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2">
            <Plus size={16} /> שלב חדש
          </button>
        </div>
      </div>

      {/* empty state */}
      {tree.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
            <Layers size={28} className="text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-slate-700 mb-1">אין תכולות עדיין</h3>
          <p className="text-sm text-slate-400 mb-5">הוסיפי שלבים ומשימות לקטלוג</p>
          <button onClick={() => openModal('phase')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">
            + שלב ראשון
          </button>
        </div>
      )}

      {/* עץ תכולות */}
      <div className="space-y-3">
        {tree.map(phase => (
          <div key={phase.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* כותרת שלב */}
            <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between">
              <button onClick={() => toggle(phase.id)} className="flex items-center gap-2 flex-1 text-left">
                {expanded[phase.id]
                  ? <ChevronDown size={16} className="text-indigo-200" />
                  : <ChevronRight size={16} className="text-indigo-200" />
                }
                <span className="font-semibold text-white text-sm">{phase.name}</span>
                <span className="text-xs text-indigo-200 mr-1">
                  ({phase.tasks.length} משימות)
                </span>
              </button>
              <div className="flex items-center gap-1">
                <button onClick={() => { toggle(phase.id); openModal('task', phase) }}
                  className="text-indigo-200 hover:text-white px-2 py-1 rounded text-xs hover:bg-indigo-500 transition flex items-center gap-1">
                  <Plus size={12} /> משימה
                </button>
                <button onClick={() => openModal('phase', null, phase)}
                  className="text-indigo-200 hover:text-white p-1.5 rounded hover:bg-indigo-500 transition">
                  <Pencil size={13} />
                </button>
                <button onClick={() => remove(phase)}
                  className="text-indigo-300 hover:text-red-300 p-1.5 rounded hover:bg-indigo-500 transition">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* משימות תחת השלב */}
            {expanded[phase.id] && (
              <div className="divide-y divide-slate-50">
                {phase.tasks.length === 0 && (
                  <div className="px-6 py-4 text-sm text-slate-400 italic">אין משימות עדיין</div>
                )}
                {phase.tasks.map(task => (
                  <div key={task.id}>
                    {/* שורת משימה */}
                    <div className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 group">
                      <div className="flex items-center gap-2 flex-1">
                        <button onClick={() => toggle(task.id)}
                          className="text-slate-400 hover:text-indigo-500 transition shrink-0">
                          {task.subtasks.length > 0
                            ? (expanded[task.id]
                              ? <ChevronDown size={14} />
                              : <ChevronRight size={14} />)
                            : <Minus size={14} className="opacity-30" />
                          }
                        </button>
                        <CheckSquare size={14} className="text-indigo-400 shrink-0" />
                        <div>
                          <span className="text-sm font-medium text-slate-700">{task.name}</span>
                          {task.notes_text && (
                            <p className="text-xs text-slate-400 mt-0.5">{task.notes_text}</p>
                          )}
                        </div>
                        {task.subtasks.length > 0 && (
                          <span className="text-xs bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full mr-1">
                            {task.subtasks.length}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => { toggle(task.id); openModal('subtask', task) }}
                          className="text-slate-400 hover:text-indigo-600 px-2 py-1 rounded text-xs hover:bg-indigo-50 transition flex items-center gap-1">
                          <Plus size={11} /> תת-משימה
                        </button>
                        <button onClick={() => openModal('task', phase, task)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5 rounded hover:bg-slate-100 transition">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => remove(task)}
                          className="text-slate-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* תת-משימות */}
                    {expanded[task.id] && task.subtasks.length > 0 && (
                      <div className="bg-slate-50/50 divide-y divide-slate-100">
                        {task.subtasks.map(sub => (
                          <div key={sub.id} className="flex items-center justify-between px-10 py-2.5 group hover:bg-slate-50">
                            <div className="flex items-center gap-2">
                              <div className="w-1 h-1 rounded-full bg-slate-300" />
                              <span className="text-xs text-slate-600">{sub.name}</span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => openModal('subtask', task, sub)}
                                className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-100 transition">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => remove(sub)}
                                className="text-slate-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition">
                                <Trash2 size={11} />
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">
                {modal.edit ? 'עריכה' : modal.mode === 'phase' ? '+ שלב חדש' : modal.mode === 'task' ? '+ משימה חדשה' : '+ תת-משימה חדשה'}
                {modal.parent && <span className="text-slate-400 font-normal text-sm mr-2">תחת {modal.parent.name}</span>}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">שם *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  autoFocus onKeyDown={e => e.key === 'Enter' && save()}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition"
                  placeholder={modal.mode === 'phase' ? 'לדוגמה: תכנון ראשוני' : modal.mode === 'task' ? 'שם המשימה' : 'שם תת-המשימה'} />
              </div>
              {modal.mode !== 'phase' && modal.mode !== 'subtask' && (
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">משך משוער (ימים)</label>
                  <input type="number" min="1" value={form.estimated_days} onChange={e => setForm({ ...form, estimated_days: e.target.value })}
                    placeholder="למשל: 7"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition" />
                </div>
              )}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">הערות (אופציונלי)</label>
                <textarea value={form.notes_text} onChange={e => setForm({ ...form, notes_text: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition resize-none"
                  rows={2} placeholder="הערות, הנחיות או פרטים נוספים" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-slate-100">
              <button onClick={save} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition">שמירה</button>
              <button onClick={() => setModal(null)} className="flex-1 border border-slate-200 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
