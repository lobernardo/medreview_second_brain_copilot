'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Plus, Edit2, Trash2, X, Upload, Eye, Code, BookOpen,
  Loader2, Search, AlertCircle, FileText, Mic, Pencil,
} from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { VERTICALS } from '@/lib/utils/constants'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'

const KB_CATEGORIES = [
  { value: 'produto',           label: 'Produto',             color: '#3B82F6', bg: '#EFF6FF' },
  { value: 'playbook',          label: 'Playbook',            color: '#8B5CF6', bg: '#F5F3FF' },
  { value: 'objeção-resposta',  label: 'Objeção & Resposta',  color: '#F59E0B', bg: '#FFFBEB' },
  { value: 'regra-comercial',   label: 'Regra Comercial',     color: '#6366F1', bg: '#EEF2FF' },
  { value: 'diferencial',       label: 'Diferencial',         color: '#10B981', bg: '#ECFDF5' },
  { value: 'faq',               label: 'FAQ',                 color: '#06B6D4', bg: '#ECFEFF' },
  { value: 'template-followup', label: 'Template Follow-up',  color: '#F97316', bg: '#FFF7ED' },
  { value: 'case-sucesso',      label: 'Case de Sucesso',     color: '#EC4899', bg: '#FDF2F8' },
  { value: 'script-copy',       label: 'Script / Copy',       color: '#6B7280', bg: '#F3F4F6' },
]

const MEDIA_ACCEPT = '.mp3,.m4a,.wav,.webm,.mpga,.mp4,.mpeg'
const MAX_MEDIA_MB = 25

interface KbDoc {
  id: string
  title: string
  category: string
  vertical: string | null
  content: string
  tags: string[] | null
  source_type: string
  is_active: boolean
  updated_at: string
  updated_by: string | null
}

interface KbForm {
  title: string
  category: string
  vertical: string
  content: string
  tags: string[]
}

type InputTab  = 'write' | 'import' | 'transcribe'
type EditorTab = 'write' | 'preview'

const EMPTY_FORM: KbForm = { title: '', category: '', vertical: '', content: '', tags: [] }

export default function KbPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  const profile   = useProfile()
  const [userId, setUserId]       = useState<string | null>(null)
  const [docs, setDocs]           = useState<KbDoc[]>([])
  const [loading, setLoading]     = useState(true)
  const [filterCat, setFilterCat]   = useState('')
  const [filterVert, setFilterVert] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

  // Modal
  const [modalOpen, setModalOpen]       = useState(false)
  const [editingDoc, setEditingDoc]     = useState<KbDoc | null>(null)
  const [form, setForm]                 = useState<KbForm>(EMPTY_FORM)
  const [tagInput, setTagInput]         = useState('')
  const [inputTab, setInputTab]         = useState<InputTab>('write')
  const [editorTab, setEditorTab]       = useState<EditorTab>('write')
  const [sourceType, setSourceType]     = useState<string>('texto')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toast, setToast]               = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Import tab
  const [importedFileName, setImportedFileName] = useState('')

  // Transcribe tab
  const [transcribing, setTranscribing]     = useState(false)
  const [transcribeFile, setTranscribeFile] = useState<string>('')
  const [transcribeDone, setTranscribeDone] = useState(false)

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)

  // ── Auth ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    }).catch(() => {})
  }, [supabase])

  // ── Load docs ───────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadDocs() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('knowledge_base')
          .select('id,title,category,vertical,content,tags,source_type,is_active,updated_at,updated_by')
          .eq('is_active', true)
          .order('updated_at', { ascending: false })
        setDocs((data ?? []) as KbDoc[])
      } catch { setDocs([]) } finally { setLoading(false) }
    }
    loadDocs()
  }, [supabase])

  // ── Filters ─────────────────────────────────────────────────────────────────

  const filtered = docs.filter(d => {
    if (filterCat && d.category !== filterCat) return false
    if (filterVert && d.vertical !== filterVert) return false
    if (filterSearch && !d.title.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  })

  const grouped = KB_CATEGORIES
    .map(cat => ({ ...cat, docs: filtered.filter(d => d.category === cat.value) }))
    .filter(g => g.docs.length > 0)

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function resetModalState() {
    setInputTab('write')
    setEditorTab('write')
    setSourceType('texto')
    setTagInput('')
    setSaveError('')
    setImportedFileName('')
    setTranscribeFile('')
    setTranscribeDone(false)
    setTranscribing(false)
  }

  function openCreate() {
    setEditingDoc(null)
    setForm(EMPTY_FORM)
    resetModalState()
    setModalOpen(true)
  }

  function openEdit(doc: KbDoc) {
    setEditingDoc(doc)
    setForm({ title: doc.title, category: doc.category, vertical: doc.vertical ?? '', content: doc.content, tags: doc.tags ?? [] })
    resetModalState()
    setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditingDoc(null) }

  function addTag(tag: string) {
    const t = tag.trim().toLowerCase()
    if (t && !form.tags.includes(t)) setForm(p => ({ ...p, tags: [...p.tags, t] }))
    setTagInput('')
  }

  // ── Import file (.md / .txt) ─────────────────────────────────────────────────

  function handleFileUpload(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'txt' && ext !== 'md' && ext !== 'markdown') {
      setSaveError('Aceita apenas .txt e .md.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setForm(p => ({ ...p, content: text, title: p.title || file.name.replace(/\.[^.]+$/, '') }))
      setImportedFileName(file.name)
      setSaveError('')
    }
    reader.readAsText(file)
  }

  // ── Transcribe media ─────────────────────────────────────────────────────────

  async function handleMediaUpload(file: File) {
    const limitBytes = MAX_MEDIA_MB * 1024 * 1024
    if (file.size > limitBytes) {
      setSaveError(`Arquivo muito grande. Limite: ${MAX_MEDIA_MB} MB.`)
      return
    }
    setTranscribing(true)
    setTranscribeDone(false)
    setTranscribeFile(file.name)
    setSaveError('')

    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/transcribe', { method: 'POST', body })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Erro na transcrição.')
      }
      const { text } = await res.json() as { text: string }
      const isVideo = file.type.startsWith('video/')
      setSourceType(isVideo ? 'video' : 'audio')
      setForm(p => ({ ...p, content: text, title: p.title || file.name.replace(/\.[^.]+$/, '') }))
      setTranscribeDone(true)
      setEditorTab('write')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Erro na transcrição.')
      setTranscribeFile('')
    } finally {
      setTranscribing(false)
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!form.title.trim() || !form.category) { setSaveError('Título e categoria são obrigatórios.'); return }
    setSaving(true); setSaveError('')
    try {
      const payload = {
        title:      form.title.trim(),
        category:   form.category,
        vertical:   form.vertical || null,
        content:    form.content,
        tags:       form.tags.length > 0 ? form.tags : null,
        source_type: sourceType,
        is_active:  true,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      }
      let savedId: string
      if (editingDoc) {
        await supabase.from('knowledge_base').update(payload).eq('id', editingDoc.id)
        savedId = editingDoc.id
        setDocs(prev => prev.map(d => d.id === editingDoc.id ? { ...d, ...payload } : d))
      } else {
        const { data, error } = await supabase.from('knowledge_base').insert(payload).select('id').single()
        if (error) throw error
        savedId = data.id
        setDocs(prev => [{ ...payload, id: savedId } as KbDoc, ...prev])
      }
      fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'knowledge_base', id: savedId, content: `${form.title}\n\n${form.content}` }),
      }).catch(() => {})
      closeModal()
      setToast({ type: 'success', message: editingDoc ? 'Documento atualizado.' : 'Documento criado.' })
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from('knowledge_base').update({ is_active: false }).eq('id', id)
      setDocs(prev => prev.filter(d => d.id !== id))
      setToast({ type: 'success', message: 'Documento removido.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao remover documento.' })
    }
    setConfirmDeleteId(null)
  }

  const isGestor = profile?.role === 'gestor'

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {docs.length} documento{docs.length !== 1 ? 's' : ''} · {isGestor ? 'Você pode editar' : 'Leitura apenas'}
          </p>
        </div>
        {isGestor && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.01]"
            style={{ background: '#6366F1' }}
          >
            <Plus size={16} /> Novo Documento
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" value={filterSearch} onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Buscar por título…"
            className="pl-9 pr-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            style={{ borderColor: '#E5E7EB', minWidth: '200px' }}
          />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
          style={{ borderColor: '#E5E7EB' }}>
          <option value="">Todas as categorias</option>
          {KB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={filterVert} onChange={(e) => setFilterVert(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
          style={{ borderColor: '#E5E7EB' }}>
          <option value="">Todas as verticais</option>
          {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {(filterSearch || filterCat || filterVert) && (
          <button onClick={() => { setFilterSearch(''); setFilterCat(''); setFilterVert('') }}
            className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 bg-white"
            style={{ borderColor: '#E5E7EB' }}>Limpar</button>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {loading && <SkeletonGrid count={6} />}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#EEF2FF' }}>
            <BookOpen size={24} className="text-indigo-400" strokeWidth={1.5} />
          </div>
          <p className="text-gray-500 text-sm">Nenhum documento encontrado.</p>
          {isGestor && !loading && (
            <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">
              Adicionar primeiro documento
            </button>
          )}
        </div>
      )}

      {!loading && grouped.map(group => (
        <section key={group.value} className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide"
              style={{ color: group.color, background: group.bg }}>
              {group.label}
            </span>
            <span className="text-xs text-gray-400">{group.docs.length} doc{group.docs.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.docs.map(doc => (
              <div key={doc.id}
                className="bg-white border rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
                style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1 line-clamp-2">{doc.title}</h3>
                  {isGestor && (
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => openEdit(doc)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <Edit2 size={13} />
                      </button>
                      {confirmDeleteId === doc.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(doc.id)} className="px-2 py-0.5 text-[11px] text-white rounded font-medium" style={{ background: '#EF4444' }}>Sim</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(doc.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {doc.vertical && <VerticalBadge vertical={doc.vertical} />}
                  {doc.tags?.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">#{tag}</span>
                  ))}
                </div>
                <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
                  {doc.content.replace(/[#*`_~[\]]/g, '').slice(0, 150)}{doc.content.length > 150 ? '…' : ''}
                </p>
                <p className="text-[11px] text-gray-400 mt-auto">
                  Atualizado em {new Date(doc.updated_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">
                {editingDoc ? 'Editar documento' : 'Novo documento'}
              </h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Input method tabs */}
              {!editingDoc && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Como você quer adicionar o conteúdo?</p>
                  <div className="flex gap-2">
                    {([
                      { id: 'write'      as InputTab, icon: Pencil,   label: 'Escrever' },
                      { id: 'import'     as InputTab, icon: FileText,  label: 'Importar arquivo' },
                      { id: 'transcribe' as InputTab, icon: Mic,       label: 'Transcrever mídia' },
                    ] as const).map(t => (
                      <button
                        key={t.id}
                        onClick={() => { setInputTab(t.id); setSaveError('') }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all"
                        style={inputTab === t.id
                          ? { borderColor: '#6366F1', background: '#EEF2FF', color: '#4338CA' }
                          : { borderColor: '#E5E7EB', background: '#FFFFFF', color: '#6B7280' }
                        }
                      >
                        <t.icon size={15} strokeWidth={1.8} />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Import arquivo ──────────────────────────────── */}
              {inputTab === 'import' && !editingDoc && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file" accept=".txt,.md,.markdown" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = '' }}
                  />
                  {importedFileName ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                      <FileText size={16} className="text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-800 truncate">{importedFileName}</p>
                        <p className="text-xs text-emerald-600">Conteúdo carregado — edite abaixo se necessário</p>
                      </div>
                      <button
                        onClick={() => { setImportedFileName(''); setForm(p => ({ ...p, content: '' })) }}
                        className="text-emerald-500 hover:text-emerald-700 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <Upload size={24} strokeWidth={1.5} />
                      <span className="text-sm font-medium">Clique para selecionar um arquivo .md ou .txt</span>
                      <span className="text-xs">O conteúdo preencherá o editor automaticamente</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── Tab: Transcrever mídia ───────────────────────────── */}
              {inputTab === 'transcribe' && !editingDoc && (
                <div>
                  <input
                    ref={mediaInputRef}
                    type="file" accept={MEDIA_ACCEPT} className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleMediaUpload(f); e.target.value = '' }}
                  />
                  {transcribing ? (
                    <div className="space-y-3 px-4 py-5 rounded-xl" style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
                      <div className="flex items-center gap-3">
                        <Loader2 size={18} className="animate-spin text-indigo-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-indigo-800">Transcrevendo{transcribeFile ? ` "${transcribeFile}"` : ''}…</p>
                          <p className="text-xs text-indigo-500 mt-0.5">Isso pode levar alguns segundos</p>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#C7D2FE' }}>
                        <div className="h-full rounded-full bg-indigo-500 animate-pulse" style={{ width: '60%' }} />
                      </div>
                    </div>
                  ) : transcribeDone ? (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
                      style={{ background: '#ECFDF5', border: '1px solid #6EE7B7' }}>
                      <Mic size={16} className="text-emerald-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-emerald-800 truncate">Transcrição concluída · {transcribeFile}</p>
                        <p className="text-xs text-emerald-600">Revise o texto no editor abaixo antes de salvar</p>
                      </div>
                      <button
                        onClick={() => { setTranscribeDone(false); setTranscribeFile(''); setForm(p => ({ ...p, content: '' })); setSourceType('texto') }}
                        className="text-emerald-500 hover:text-emerald-700 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => mediaInputRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed text-gray-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors"
                      style={{ borderColor: '#E5E7EB' }}
                    >
                      <Mic size={24} strokeWidth={1.5} />
                      <span className="text-sm font-medium">Clique para selecionar um áudio ou vídeo</span>
                      <span className="text-xs text-gray-400">
                        MP3, M4A, WAV, WEBM, MP4 · máx. {MAX_MEDIA_MB} MB
                      </span>
                      <span className="text-xs text-gray-400">O sistema transcreverá automaticamente para a base de conhecimento</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── Content editor (sempre visível) ─────────────────── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Conteúdo</label>
                  <div className="flex items-center gap-1">
                    {(['write', 'preview'] as const).map(tab => (
                      <button key={tab} onClick={() => setEditorTab(tab)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${editorTab === tab ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
                        {tab === 'write' ? <><Code size={12} /> Escrever</> : <><Eye size={12} /> Preview</>}
                      </button>
                    ))}
                  </div>
                </div>
                {editorTab === 'write' ? (
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm(p => ({ ...p, content: e.target.value }))}
                    placeholder={inputTab === 'transcribe' && !transcribeDone ? 'O texto transcrito aparecerá aqui após o upload…' : 'Escreva em Markdown…'}
                    className="w-full h-48 px-3 py-2.5 border rounded-lg text-sm text-gray-800 font-mono focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                ) : (
                  <div className="w-full h-48 overflow-y-auto px-3 py-2.5 border rounded-lg bg-gray-50" style={{ borderColor: '#E5E7EB' }}>
                    {form.content ? (
                      <div className="prose prose-sm max-w-none text-gray-800">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm">Preview aparece aqui.</p>
                    )}
                  </div>
                )}
              </div>

              {/* ── Common fields ─────────────────────────────────────── */}
              <div className="pt-1 border-t space-y-4" style={{ borderColor: '#F3F4F6' }}>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Título *</label>
                  <input
                    type="text" value={form.title}
                    onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Nome do documento…"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria *</label>
                    <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                      style={{ borderColor: '#E5E7EB' }}>
                      <option value="">Selecionar…</option>
                      {KB_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical</label>
                    <select value={form.vertical} onChange={(e) => setForm(p => ({ ...p, vertical: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                      style={{ borderColor: '#E5E7EB' }}>
                      <option value="">Todas</option>
                      {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tags</label>
                  <div className="flex flex-wrap gap-1.5 p-2 border rounded-lg min-h-[40px]" style={{ borderColor: '#E5E7EB' }}>
                    {form.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-[12px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        #{tag}
                        <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(t => t !== tag) }))} className="hover:text-red-500"><X size={10} /></button>
                      </span>
                    ))}
                    <input
                      type="text" value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
                        if (e.key === 'Backspace' && !tagInput && form.tags.length > 0) {
                          setForm(p => ({ ...p, tags: p.tags.slice(0, -1) }))
                        }
                      }}
                      placeholder={form.tags.length === 0 ? 'Adicionar tag (Enter)…' : ''}
                      className="flex-1 text-sm text-gray-800 outline-none min-w-[120px] bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />{saveError}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E5E7EB' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving || transcribing}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: '#6366F1' }}>
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando…</>
                  : (editingDoc ? 'Salvar alterações' : 'Criar documento')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
