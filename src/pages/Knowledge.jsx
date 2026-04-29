import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, X, ExternalLink, FolderOpen, FileText, CheckSquare, BookOpen, Pencil, Trash2, Link2, Layers } from 'lucide-react'

const FILE_TYPES = {
  article:    { label: 'Article',    icon: FileText,    color: 'bg-blue-50 text-blue-700' },
  template:   { label: 'Template',   icon: Layers,      color: 'bg-[#F3F3F3] text-[#091426]' },
  checklist:  { label: 'Checklist',  icon: CheckSquare, color: 'bg-emerald-50 text-emerald-700' },
  reference:  { label: 'Reference',  icon: BookOpen,    color: 'bg-amber-50 text-amber-700' },
}

const CATEGORIES = ['All', 'Templates', 'Procedures', 'Resources', 'References', 'Materials', 'Presentations']

export default function Knowledge() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [form, setForm] = useState({ title: '', content: '', category: '', drive_link: '', related_task: '', file_type: 'article' })
  const [taskNames, setTaskNames] = useState([])

  useEffect(() => { fetchItems(); fetchTaskNames() }, [])

  async function fetchItems() {
    const { data } = await supabase.from('knowledge').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function fetchTaskNames() {
    const { data } = await supabase.from('contents').select('name').eq('level', 'task').order('sort_order')
    const unique = [...new Set((data || []).map(d => d.name))]
    setTaskNames(unique)
  }

  function openNew() {
    setForm({ title: '', content: '', category: '', drive_link: '', related_task: '', file_type: 'article' })
    setEditItem(null)
    setShowForm(true)
  }

  function openEdit(item) {
    setForm({
      title: item.title || '',
      content: item.content || '',
      category: item.category || '',
      drive_link: item.drive_link || '',
      related_task: item.related_task || '',
      file_type: item.file_type || 'article',
    })
    setEditItem(item)
    setShowForm(true)
  }

  async function save() {
    if (!form.title.trim()) return
    if (editItem) {
      await supabase.from('knowledge').update(form).eq('id', editItem.id)
    } else {
      await supabase.from('knowledge').insert(form)
    }
    setShowForm(false)
    setEditItem(null)
    setForm({ title: '', content: '', category: '', drive_link: '', related_task: '', file_type: 'article' })
    fetchItems()
  }

  async function remove(id) {
    if (!confirm('Delete this item?')) return
    await supabase.from('knowledge').delete().eq('id', id)
    if (viewing?.id === id) setViewing(null)
    fetchItems()
  }

  const filtered = items.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase()) ||
      (i.content || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.related_task || '').toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'All' || i.category === filterCat
    return matchSearch && matchCat
  })

  const inp = "w-full bg-[#F3F3F3] rounded-xl px-3 py-2.5 text-sm border-0 focus:outline-none focus:ring-2 focus:ring-[#7B5800]/20 transition"
  const lbl = "text-[10px] font-semibold tracking-widest uppercase text-[#6B7A90] block mb-1.5"

  if (loading) return <div className="flex items-center justify-center p-8"><div className="w-6 h-6 border-2 border-[#091426] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#091426] font-[Manrope] tracking-tight">Studio Resources</h1>
          <p className="text-sm text-[#6B7A90] mt-0.5">Templates, guides and references for your team</p>
        </div>
        <button onClick={openNew}
          className="bg-[#091426] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all flex items-center gap-2">
          <Plus size={16} strokeWidth={1.8} /> New Resource
        </button>
      </div>

      {/* Search + Category filters */}
      <div className="mb-5 space-y-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search resources, templates, tasks..."
          className={inp} />
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filterCat === cat ? 'bg-[#091426] text-white' : 'bg-white text-[#6B7A90] hover:bg-[#F3F3F3]'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-[#F3F3F3] rounded-2xl flex items-center justify-center mb-4">
            <BookOpen size={28} strokeWidth={1.5} className="text-[#6B7A90]" />
          </div>
          <h3 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight mb-1">
            {search || filterCat !== 'All' ? 'No results found' : 'Build your studio library'}
          </h3>
          <p className="text-sm text-[#6B7A90] mb-4">Add templates, checklists and reference materials</p>
          {!search && filterCat === 'All' && (
            <button onClick={openNew} className="bg-[#091426] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all">
              + New Resource
            </button>
          )}
        </div>
      )}

      {/* Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(item => {
          const ft = FILE_TYPES[item.file_type] || FILE_TYPES.article
          const FtIcon = ft.icon
          return (
            <div key={item.id}
              className="bg-white rounded-2xl shadow-[0_2px_20px_rgba(9,20,38,0.04)] overflow-hidden hover:shadow-[0_8px_30px_rgba(9,20,38,0.08)] transition-all duration-300 group cursor-pointer flex flex-col"
              onClick={() => setViewing(item)}>
              {/* Top accent bar */}
              <div className="h-1 bg-gradient-to-r from-[#091426] to-[#1E293B]" />

              <div className="p-5 flex-1 flex flex-col">
                {/* Type + Category badges */}
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${ft.color}`}>
                    <FtIcon size={11} strokeWidth={2} />
                    {ft.label}
                  </span>
                  {item.category && (
                    <span className="text-[10px] font-semibold tracking-wider text-[#6B7A90] bg-[#F9F9F9] px-2 py-1 rounded-full">
                      {item.category}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-[#091426] font-[Manrope] tracking-tight mb-2 group-hover:text-[#7B5800] transition-colors">
                  {item.title}
                </h3>

                {/* Content preview */}
                {item.content && (
                  <p className="text-sm text-[#6B7A90] line-clamp-2 mb-3 flex-1">{item.content}</p>
                )}

                {/* Related task */}
                {item.related_task && (
                  <div className="flex items-center gap-1.5 text-xs text-[#7B5800] bg-amber-50/50 rounded-lg px-2.5 py-1.5 mb-3">
                    <Layers size={12} strokeWidth={2} />
                    <span className="font-medium">{item.related_task}</span>
                  </div>
                )}

                {/* Footer — drive link + actions */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#F3F3F3]">
                  {item.drive_link ? (
                    <a href={item.drive_link} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#091426] hover:text-[#7B5800] transition-colors">
                      <FolderOpen size={13} strokeWidth={1.8} />
                      Open in Drive
                    </a>
                  ) : (
                    <span className="text-xs text-[#6B7A90]">
                      {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={e => { e.stopPropagation(); openEdit(item) }}
                      className="p-1.5 rounded-lg text-[#6B7A90] hover:text-[#091426] hover:bg-[#F3F3F3] transition">
                      <Pencil size={13} strokeWidth={1.8} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); remove(item.id) }}
                      className="p-1.5 rounded-lg text-[#6B7A90] hover:text-red-500 hover:bg-red-50 transition">
                      <Trash2 size={13} strokeWidth={1.8} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* View Modal */}
      {viewing && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-6 border-b border-[#F3F3F3]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const ft = FILE_TYPES[viewing.file_type] || FILE_TYPES.article
                      const FtIcon = ft.icon
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full ${ft.color}`}>
                          <FtIcon size={11} strokeWidth={2} />
                          {ft.label}
                        </span>
                      )
                    })()}
                    {viewing.category && (
                      <span className="text-[10px] font-semibold tracking-wider text-[#6B7A90] bg-[#F9F9F9] px-2 py-1 rounded-full">
                        {viewing.category}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-[#091426] font-[Manrope] tracking-tight">{viewing.title}</h2>
                </div>
                <button onClick={() => setViewing(null)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90] transition-all shrink-0 ml-4">
                  <X size={16} strokeWidth={1.8} />
                </button>
              </div>

              {/* Related task + Drive link */}
              <div className="flex flex-wrap gap-3 mt-3">
                {viewing.related_task && (
                  <div className="flex items-center gap-1.5 text-xs text-[#7B5800] bg-amber-50 rounded-lg px-3 py-2">
                    <Layers size={13} strokeWidth={2} />
                    <span className="font-medium">Related: {viewing.related_task}</span>
                  </div>
                )}
                {viewing.drive_link && (
                  <a href={viewing.drive_link} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#091426] bg-[#F3F3F3] rounded-lg px-3 py-2 hover:bg-[#091426] hover:text-white transition-all">
                    <ExternalLink size={13} strokeWidth={1.8} />
                    Open in Google Drive
                  </a>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-[#091426] whitespace-pre-wrap leading-relaxed text-sm">{viewing.content}</p>
            </div>

            {/* Footer actions */}
            <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
              <button onClick={() => { setViewing(null); openEdit(viewing) }}
                className="flex items-center gap-2 bg-[#F3F3F3] text-[#091426] px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#091426] hover:text-white transition-all">
                <Pencil size={14} strokeWidth={1.8} /> Edit
              </button>
              <button onClick={() => { remove(viewing.id); setViewing(null) }}
                className="flex items-center gap-2 text-[#6B7A90] px-4 py-2 rounded-xl text-sm hover:text-red-500 hover:bg-red-50 transition-all">
                <Trash2 size={14} strokeWidth={1.8} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-[#091426]/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F3F3]">
              <h2 className="text-base font-semibold text-[#091426] font-[Manrope] tracking-tight">
                {editItem ? 'Edit Resource' : 'New Resource'}
              </h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-xl hover:bg-[#F3F3F3] flex items-center justify-center text-[#6B7A90]">
                <X size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className={lbl}>Title *</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="e.g.: Construction Plan Presentation Guide" className={inp} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Type</label>
                  <select value={form.file_type} onChange={e => setForm({...form, file_type: e.target.value})} className={inp}>
                    {Object.entries(FILE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Category</label>
                  <input value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    placeholder="Templates, Materials..." className={inp}
                    list="cat-suggestions" />
                  <datalist id="cat-suggestions">
                    {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label className={lbl}>Related Task</label>
                <select value={form.related_task} onChange={e => setForm({...form, related_task: e.target.value})} className={inp}>
                  <option value="">— No linked task —</option>
                  {taskNames.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
                <p className="text-[10px] text-[#6B7A90] mt-1">This resource will appear automatically when working on this task in any project</p>
              </div>

              <div>
                <label className={lbl}>Google Drive Link</label>
                <div className="flex gap-2">
                  <input value={form.drive_link} onChange={e => setForm({...form, drive_link: e.target.value})}
                    placeholder="https://drive.google.com/..." className={inp + ' flex-1'} />
                  {form.drive_link && (
                    <a href={form.drive_link} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 w-10 h-10 rounded-xl bg-[#F3F3F3] hover:bg-[#091426] hover:text-white text-[#6B7A90] flex items-center justify-center transition-all">
                      <ExternalLink size={16} strokeWidth={1.8} />
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className={lbl}>Content / Description</label>
                <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})}
                  className={inp + ' resize-none'} rows={5}
                  placeholder="Instructions, guidelines, notes..." />
              </div>
            </div>

            <div className="flex gap-2 px-6 py-4 border-t border-[#F3F3F3]">
              <button onClick={save} disabled={!form.title.trim()}
                className="flex-1 bg-[#091426] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-[#1E293B] transition-all disabled:opacity-40">
                {editItem ? 'Update' : 'Save Resource'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 bg-[#F3F3F3] py-2.5 rounded-xl text-sm font-medium text-[#6B7A90] hover:bg-[#F9F9F9] transition-all">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
