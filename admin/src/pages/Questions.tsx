import { useEffect, useState, useRef } from 'react'
import { Plus, Search, Upload, Download, Edit2, Trash2, ToggleLeft, ToggleRight, X } from 'lucide-react'
import clsx from 'clsx'
import api from '../api'

const DIFFS  = ['EASY', 'MEDIUM', 'HARD']
const LANGS  = ['en', 'az', 'ru']
const KEYS   = ['A', 'B', 'C', 'D'] as const
const DIFF_COLOR: Record<string, string> = {
  EASY: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD: 'bg-red-100 text-red-700',
}

const emptyForm = {
  categoryId: '', language: 'en', difficulty: 'MEDIUM',
  questionText: '', optionA: '', optionB: '', optionC: '', optionD: '',
  correctAnswer: 'A', explanation: '', familyId: '',
}

export default function Questions() {
  const [questions, setQuestions] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [total, setTotal]    = useState(0)
  const [page, setPage]      = useState(1)
  const [search, setSearch]  = useState('')
  const [fCat, setFCat]      = useState('')
  const [fDiff, setFDiff]    = useState('')
  const [fLang, setFLang]    = useState('')
  const [loading, setLoading] = useState(false)
  const [modal, setModal]    = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm]      = useState({ ...emptyForm })
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) p.set('search', search)
      if (fCat)   p.set('categoryId', fCat)
      if (fDiff)  p.set('difficulty',  fDiff)
      if (fLang)  p.set('language',    fLang)
      const { data } = await api.get(`/admin/questions?${p}`)
      setQuestions(data.questions)
      setTotal(data.total)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [page, fCat, fDiff, fLang])
  useEffect(() => { const t = setTimeout(load, 400); return () => clearTimeout(t) }, [search])
  useEffect(() => { api.get('/admin/categories').then(r => setCategories(r.data)) }, [])

  const openCreate = () => { setForm({ ...emptyForm }); setEditing(null); setModal('create') }
  const openEdit = (q: any) => {
    const opts: any[] = Array.isArray(q.answerOptions) ? q.answerOptions : (q.answerOptions?.options ?? [])
    setForm({
      categoryId: q.categoryId, language: q.language, difficulty: q.difficulty,
      questionText: q.questionText,
      optionA: opts.find((o: any) => o.key === 'A')?.text ?? '',
      optionB: opts.find((o: any) => o.key === 'B')?.text ?? '',
      optionC: opts.find((o: any) => o.key === 'C')?.text ?? '',
      optionD: opts.find((o: any) => o.key === 'D')?.text ?? '',
      correctAnswer: q.correctAnswer ?? 'A',
      explanation: q.explanation ?? '',
      familyId: q.familyId ?? '',
    })
    setEditing(q); setModal('edit')
  }

  const buildPayload = () => ({
    categoryId: form.categoryId, language: form.language, difficulty: form.difficulty,
    questionText: form.questionText,
    answerOptions: [
      { key: 'A', text: form.optionA },
      { key: 'B', text: form.optionB },
      { key: 'C', text: form.optionC },
      { key: 'D', text: form.optionD },
    ],
    correctAnswer: form.correctAnswer,
    explanation: form.explanation || undefined,
    familyId: form.familyId || undefined,
  })

  const save = async () => {
    try {
      if (modal === 'create') await api.post('/admin/questions', buildPayload())
      else await api.put(`/admin/questions/${editing.id}`, buildPayload())
      setModal(null); load()
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to save') }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this question?')) return
    await api.delete(`/admin/questions/${id}`); load()
  }

  const toggle = async (id: string) => { await api.patch(`/admin/questions/${id}/toggle`); load() }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true); setImportResult(null)
    const fd = new FormData(); fd.append('file', file)
    try {
      const { data } = await api.post('/admin/questions/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(data); load()
    } catch { alert('Import failed') }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  const canSave = form.categoryId && form.questionText && form.optionA && form.optionB && form.optionC && form.optionD

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Questions</h1>
          <p className="text-sm text-gray-500">{total.toLocaleString()} total</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary flex items-center gap-1.5">
            <Upload size={14} />{importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button onClick={() => window.open('/api/admin/questions/export', '_blank')} className="btn-secondary flex items-center gap-1.5">
            <Download size={14} />Export
          </button>
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5">
            <Plus size={14} />Add Question
          </button>
        </div>
      </div>

      {/* CSV format hint */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
        <strong>CSV columns:</strong> question_text, option_a, option_b, option_c, option_d, correct_option (A/B/C/D), category (slug e.g. "science"), difficulty (EASY/MEDIUM/HARD), language (en/az/ru), explanation, image_url, question_family_id
      </div>

      {importResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-700">
              Import complete: {importResult.imported} imported, {importResult.skipped} skipped
            </p>
            {importResult.errors?.slice(0, 3).map((e: string, i: number) => (
              <p key={i} className="text-xs text-red-600 mt-1">{e}</p>
            ))}
          </div>
          <button onClick={() => setImportResult(null)}><X size={14} className="text-gray-400" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-8" placeholder="Search questions…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={fCat} onChange={e => setFCat(e.target.value)}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-auto" value={fDiff} onChange={e => setFDiff(e.target.value)}>
          <option value="">All difficulties</option>
          {DIFFS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className="input w-auto" value={fLang} onChange={e => setFLang(e.target.value)}>
          <option value="">All languages</option>
          {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="th">Question</th>
              <th className="th">Category</th>
              <th className="th">Diff</th>
              <th className="th">Lang</th>
              <th className="th">Plays</th>
              <th className="th">Status</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="td text-center text-gray-400 py-10">Loading…</td></tr>
            ) : questions.length === 0 ? (
              <tr><td colSpan={7} className="td text-center text-gray-400 py-10">No questions found</td></tr>
            ) : questions.map(q => (
              <tr key={q.id} className="hover:bg-gray-50">
                <td className="td max-w-xs">
                  <p className="text-sm font-medium text-gray-900 truncate">{q.questionText}</p>
                  {q.familyId && <p className="text-xs text-gray-400 font-mono">family: {q.familyId.slice(0,8)}</p>}
                </td>
                <td className="td text-sm text-gray-600">{q.category?.icon} {q.category?.name}</td>
                <td className="td">
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', DIFF_COLOR[q.difficulty])}>
                    {q.difficulty}
                  </span>
                </td>
                <td className="td">
                  <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{q.language}</span>
                </td>
                <td className="td text-sm text-gray-500">{q.playCount ?? 0}</td>
                <td className="td">
                  <button onClick={() => toggle(q.id)}
                    className={clsx('flex items-center gap-1 text-xs font-semibold', q.isActive ? 'text-emerald-600' : 'text-gray-400')}>
                    {q.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    {q.isActive ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="td">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openEdit(q)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                    <button onClick={() => del(q.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > 20 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Showing {Math.min((page - 1) * 20 + 1, total)}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary py-1.5 text-xs" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button>
            <button className="btn-secondary py-1.5 text-xs" onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total}>Next</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h2 className="font-bold text-gray-900">{modal === 'create' ? 'Add Question' : 'Edit Question'}</h2>
              <button onClick={() => setModal(null)}><X size={18} className="text-gray-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Category *</label>
                  <select className="input" value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                    <option value="">Select…</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Difficulty</label>
                  <select className="input" value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}>
                    {DIFFS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Language</label>
                  <select className="input" value={form.language} onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
                    {LANGS.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Question Text *</label>
                <textarea className="input resize-none" rows={3} placeholder="Enter your question…"
                  value={form.questionText} onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {KEYS.map(key => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2 mb-1">
                      Option {key} *
                      <button type="button" onClick={() => setForm(f => ({ ...f, correctAnswer: key }))}
                        className={clsx('w-4 h-4 rounded-full border-2 transition-all flex-shrink-0',
                          form.correctAnswer === key ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300')} />
                      {form.correctAnswer === key && <span className="text-emerald-600 text-[10px] font-medium">Correct</span>}
                    </label>
                    <input className="input" placeholder={`Option ${key}…`}
                      value={(form as any)[`option${key}`]}
                      onChange={e => setForm(f => ({ ...f, [`option${key}`]: e.target.value }))} />
                  </div>
                ))}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Explanation (optional)</label>
                <textarea className="input resize-none" rows={2} placeholder="Why is the answer correct?"
                  value={form.explanation} onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))} />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">Family ID (optional)</label>
                <input className="input" placeholder="Group related variant questions together"
                  value={form.familyId} onChange={e => setForm(f => ({ ...f, familyId: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
              <button className="btn-secondary flex-1" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn-primary flex-1" onClick={save} disabled={!canSave}>
                {modal === 'create' ? 'Create Question' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
