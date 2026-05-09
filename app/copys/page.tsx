'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Copy, Edit2, Trash2, X, Eye, Search, Check, Loader2, AlertCircle } from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import type { Profile } from '@/lib/utils/types'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'

const COPY_CATEGORIES = [
  { value: 'abertura', label: 'Abertura' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'apresentacao', label: 'Apresentação' },
  { value: 'negociacao', label: 'Negociação' },
  { value: 'fechamento', label: 'Fechamento' },
  { value: 'pos-venda', label: 'Pós-venda' },
  { value: 'follow-up-aberto', label: 'Follow-up Aberto' },
  { value: 'follow-up-template', label: 'Follow-up Template' },
  { value: 'comparativo', label: 'Comparativo' },
  { value: 'orcamento', label: 'Orçamento' },
  { value: 'outro', label: 'Outro' },
]

const VERTICALS_COPY = ['R1', 'Anest', 'Oft', 'Ortop', 'Geral']

const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  abertura: { color: '#10B981', bg: '#ECFDF5' },
  diagnostico: { color: '#6366F1', bg: '#EEF2FF' },
  apresentacao: { color: '#3B82F6', bg: '#EFF6FF' },
  negociacao: { color: '#F59E0B', bg: '#FFFBEB' },
  fechamento: { color: '#EC4899', bg: '#FDF2F8' },
  'pos-venda': { color: '#8B5CF6', bg: '#F5F3FF' },
  'follow-up-aberto': { color: '#06B6D4', bg: '#ECFEFF' },
  'follow-up-template': { color: '#F97316', bg: '#FFF7ED' },
  comparativo: { color: '#6B7280', bg: '#F3F4F6' },
  orcamento: { color: '#EF4444', bg: '#FEF2F2' },
  outro: { color: '#9CA3AF', bg: '#F9FAFB' },
}

interface CopyItem {
  id: string
  title: string
  category: string
  vertical: string | null
  message_text: string
  user_id: string
  user_name: string
  when_to_use: string | null
  when_not_to_use: string | null
  notes: string | null
  is_shared: boolean
  is_active: boolean
}

interface CopyForm {
  title: string
  category: string
  vertical: string
  message_text: string
  when_to_use: string
  when_not_to_use: string
  notes: string
  is_shared: boolean
}

const EMPTY_FORM: CopyForm = {
  title: '', category: '', vertical: '', message_text: '',
  when_to_use: '', when_not_to_use: '', notes: '', is_shared: true,
}

function substituteVars(text: string, profile: Profile | null): string {
  const vars: Record<string, string> = {
    nome: profile?.name ?? 'Seu Nome',
    vertical: profile?.vertical_focus ?? 'Vertical',
    telefone: profile?.phone ?? 'Telefone',
    whatsapp: profile?.whatsapp_link ?? 'WhatsApp',
    saudacao: profile?.default_greeting ?? 'Olá',
    data: new Date().toLocaleDateString('pt-BR'),
  }
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key.toLowerCase()] ?? match)
}

export default function CopysPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  const profile = useProfile()
  const role = profile?.role ?? null
  const [activeTab, setActiveTab] = useState<'minhas' | 'time' | 'buscar'>('minhas')
  const [myCopys, setMyCopys] = useState<CopyItem[]>([])
  const [teamCopys, setTeamCopys] = useState<CopyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingCopy, setEditingCopy] = useState<CopyItem | null>(null)
  const [form, setForm] = useState<CopyForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [previewCopy, setPreviewCopy] = useState<CopyItem | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function loadMy() {
      if (!profile) {
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('user_copys').select('*')
          .eq('user_id', profile.id).eq('is_active', true)
          .order('updated_at', { ascending: false })
        if (error) console.error('[copys] loadMy error:', error)
        setMyCopys((data ?? []) as CopyItem[])
      } catch (e) {
        console.error('[copys] loadMy catch:', e)
        setMyCopys([])
      } finally {
        setLoading(false)
      }
    }
    loadMy()
  }, [supabase, profile])

  useEffect(() => {
    async function loadTeam() {
      try {
        const { data, error } = await supabase
          .from('user_copys').select('*')
          .eq('is_shared', true).eq('is_active', true)
          .order('user_name', { ascending: true })
        if (error) console.error('[copys] loadTeam error:', error)
        setTeamCopys((data ?? []) as CopyItem[])
      } catch (e) {
        console.error('[copys] loadTeam catch:', e)
        setTeamCopys([])
      }
    }
    loadTeam()
  }, [supabase])

  const searchResults = useMemo(() => {
    if (!searchText.trim()) return []
    const q = searchText.toLowerCase()
    const all = [...myCopys, ...teamCopys.filter(t => t.user_id !== profile?.id)]
    const seen = new Set<string>()
    return all.filter(c => {
      if (seen.has(c.id)) return false
      seen.add(c.id)
      return c.title.toLowerCase().includes(q) || c.message_text.toLowerCase().includes(q)
    })
  }, [searchText, myCopys, teamCopys, profile])

  const teamByAuthor = useMemo(() => {
    const map: Record<string, CopyItem[]> = {}
    for (const c of teamCopys) { if (!map[c.user_name]) map[c.user_name] = []; map[c.user_name].push(c) }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b))
  }, [teamCopys])

  function openCreate() { setEditingCopy(null); setForm(EMPTY_FORM); setSaveError(''); setModalOpen(true) }

  function openEdit(copy: CopyItem) {
    setEditingCopy(copy)
    setForm({
      title: copy.title, category: copy.category, vertical: copy.vertical ?? '',
      message_text: copy.message_text, when_to_use: copy.when_to_use ?? '',
      when_not_to_use: copy.when_not_to_use ?? '', notes: copy.notes ?? '', is_shared: copy.is_shared,
    })
    setSaveError(''); setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditingCopy(null) }

  async function handleSave() {
    if (!form.title.trim() || !form.category || !form.message_text.trim()) {
      setSaveError('Título, categoria e mensagem são obrigatórios.'); return
    }
    if (!profile) return
    setSaving(true); setSaveError('')
    try {
      const payload = {
        title: form.title.trim(), category: form.category, vertical: form.vertical || null,
        message_text: form.message_text, when_to_use: form.when_to_use || null,
        when_not_to_use: form.when_not_to_use || null, notes: form.notes || null,
        is_shared: form.is_shared, is_active: true, updated_at: new Date().toISOString(),
      }
      let savedId: string
      if (editingCopy) {
        const res = await fetch('/api/copys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingCopy.id, ...payload }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        savedId = editingCopy.id
        const updated = { ...editingCopy, ...payload }
        setMyCopys(prev => prev.map(c => c.id === editingCopy.id ? updated : c))
        setTeamCopys(prev => prev.map(c => c.id === editingCopy.id ? updated : c))
      } else {
        const full = { ...payload, user_id: profile.id, user_name: profile.name, times_used: 0 }
        const res = await fetch('/api/copys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(full),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        savedId = json.data.id
        const newItem: CopyItem = { ...full, id: savedId }
        setMyCopys(prev => [newItem, ...prev])
        if (full.is_shared) setTeamCopys(prev => [newItem, ...prev])
      }
      fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'user_copys', id: savedId, content: `${form.title} ${form.message_text}` }),
      }).catch(() => {})
      closeModal()
      setToast({ type: 'success', message: editingCopy ? 'Copy atualizada.' : 'Copy criada.' })
    } catch { setSaveError('Erro ao salvar. Tente novamente.') } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/copys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      setMyCopys(prev => prev.filter(c => c.id !== id))
      setTeamCopys(prev => prev.filter(c => c.id !== id))
      setToast({ type: 'success', message: 'Copy removida.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao remover copy.' })
    }
    setConfirmDeleteId(null)
  }

  function handleCopy(copy: CopyItem) {
    const text = substituteVars(copy.message_text, profile)
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(copy.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const canEdit = (copy: CopyItem) => role === 'gestor' || profile?.id === copy.user_id
  const isReadOnly = role === 'onboarding'

  const TABS = [
    { id: 'minhas' as const, label: 'Minhas', count: myCopys.length },
    { id: 'time' as const, label: 'Time', count: teamCopys.length },
    { id: 'buscar' as const, label: 'Buscar', count: null },
  ]

  function renderCopyList(list: CopyItem[]) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(copy => {
          const catCfg = CAT_COLORS[copy.category] ?? { color: '#6B7280', bg: '#F3F4F6' }
          const catLabel = COPY_CATEGORIES.find(c => c.value === copy.category)?.label ?? copy.category
          return (
            <div
              key={copy.id}
              className="bg-white border rounded-xl p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
              style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug flex-1 line-clamp-1">{copy.title}</h3>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => setPreviewCopy(copy)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Preview"><Eye size={13} /></button>
                  {canEdit(copy) && !isReadOnly && (
                    <>
                      <button onClick={() => openEdit(copy)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar"><Edit2 size={13} /></button>
                      {confirmDeleteId === copy.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(copy.id)} className="px-2 py-0.5 text-[11px] text-white rounded font-medium" style={{ background: '#EF4444' }}>Sim</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(copy.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Excluir"><Trash2 size={13} /></button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ color: catCfg.color, background: catCfg.bg }}>{catLabel}</span>
                {copy.vertical && <VerticalBadge vertical={copy.vertical} />}
                <span className="text-[11px] text-gray-400 ml-auto">{copy.user_name.split(' ')[0]}</span>
              </div>
              <p className="text-[12px] text-gray-500 leading-relaxed line-clamp-2 flex-1">
                {copy.message_text.slice(0, 140)}{copy.message_text.length > 140 ? '…' : ''}
              </p>
              <button
                onClick={() => handleCopy(copy)}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[12px] font-medium transition-all ${copiedId === copy.id ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600'}`}
              >
                {copiedId === copy.id ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar mensagem</>}
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Copys & Macros</h1>
          <p className="text-sm text-gray-500 mt-0.5">Mensagens prontas para cada fase do funil</p>
        </div>
        {!isReadOnly && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.01]" style={{ background: '#6366F1' }}>
            <Plus size={16} /> Nova Copy
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b gap-6" style={{ borderColor: '#E5E7EB' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
            {tab.count !== null && tab.count > 0 && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={activeTab === tab.id ? { background: '#EEF2FF', color: '#6366F1' } : { background: '#F3F4F6', color: '#6B7280' }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {activeTab === 'minhas' && (
        loading ? (
          <SkeletonGrid count={6} />
        ) : myCopys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 text-sm">Você ainda não tem copys.</p>
            {!isReadOnly && <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">Criar primeira copy</button>}
          </div>
        ) : renderCopyList(myCopys)
      )}

      {activeTab === 'time' && (
        teamByAuthor.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-gray-500 text-sm">Nenhuma copy compartilhada ainda.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {teamByAuthor.map(([name, list]) => (
              <section key={name} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-indigo-600">{name.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{name}</span>
                  <span className="text-xs text-gray-400">{list.length} copy{list.length !== 1 ? 's' : ''}</span>
                </div>
                {renderCopyList(list)}
              </section>
            ))}
          </div>
        )
      )}

      {activeTab === 'buscar' && (
        <div className="space-y-4">
          <div className="relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar em título e mensagem…"
              className="w-full pl-9 pr-3 py-2.5 border rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              style={{ borderColor: '#E5E7EB' }}
              autoFocus
            />
          </div>
          {searchText.trim() && searchResults.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">Nenhuma copy encontrada para &quot;{searchText}&quot;.</p>
          )}
          {searchResults.length > 0 && renderCopyList(searchResults)}
        </div>
      )}

      {/* Copy modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">{editingCopy ? 'Editar copy' : 'Nova copy'}</h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />{saveError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Título *</label>
                <input type="text" value={form.title} onChange={(e) => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome da copy…" className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria *</label>
                  <select value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white" style={{ borderColor: '#E5E7EB' }}>
                    <option value="">Selecionar…</option>
                    {COPY_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical</label>
                  <select value={form.vertical} onChange={(e) => setForm(p => ({ ...p, vertical: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white" style={{ borderColor: '#E5E7EB' }}>
                    <option value="">Todas</option>
                    {VERTICALS_COPY.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Mensagem * <span className="text-[11px] normal-case font-normal text-gray-400">(use {`{{nome}}`}, {`{{vertical}}`}, {`{{data}}`}…)</span>
                </label>
                <textarea value={form.message_text} onChange={(e) => setForm(p => ({ ...p, message_text: e.target.value }))} placeholder="Escreva a mensagem aqui…" rows={6} className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none font-mono" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quando usar</label>
                  <textarea value={form.when_to_use} onChange={(e) => setForm(p => ({ ...p, when_to_use: e.target.value }))} placeholder="Ex: Lead no estágio Quente…" rows={3} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none resize-none" style={{ borderColor: '#E5E7EB' }} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Quando NÃO usar</label>
                  <textarea value={form.when_not_to_use} onChange={(e) => setForm(p => ({ ...p, when_not_to_use: e.target.value }))} placeholder="Ex: Lead que já recusou…" rows={3} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none resize-none" style={{ borderColor: '#E5E7EB' }} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</label>
                <input type="text" value={form.notes} onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observações adicionais…" className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setForm(p => ({ ...p, is_shared: !p.is_shared }))}>
                <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${form.is_shared ? 'bg-indigo-500' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_shared ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-gray-700">Compartilhar com o time</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#6366F1' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : (editingCopy ? 'Salvar alterações' : 'Criar copy')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <div>
                <p className="text-sm font-semibold text-gray-900">{previewCopy.title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Preview com suas variáveis</p>
              </div>
              <button onClick={() => setPreviewCopy(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="rounded-xl p-4" style={{ background: '#E5DDD5', minHeight: '100px' }}>
                <div className="rounded-xl rounded-tl-none px-3.5 py-2.5 max-w-[90%] shadow-sm" style={{ background: '#DCF8C6' }}>
                  <p className="text-[13px] text-gray-900 leading-relaxed whitespace-pre-wrap">
                    {substituteVars(previewCopy.message_text, profile)}
                  </p>
                  <p className="text-[10px] text-gray-400 text-right mt-1">
                    {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              {previewCopy.message_text.includes('{{') && (
                <div className="mt-3 p-2.5 bg-indigo-50 rounded-lg">
                  <p className="text-[11px] text-indigo-600 font-medium mb-1.5">Variáveis:</p>
                  <div className="flex flex-wrap gap-1">
                    {(['nome', 'vertical', 'telefone', 'whatsapp', 'saudacao', 'data'] as const).filter(v => previewCopy.message_text.includes(`{{${v}}}`)).map(v => {
                      const vals: Record<string, string> = { nome: profile?.name ?? '—', vertical: profile?.vertical_focus ?? '—', telefone: profile?.phone ?? '—', whatsapp: profile?.whatsapp_link ?? '—', saudacao: profile?.default_greeting ?? '—', data: new Date().toLocaleDateString('pt-BR') }
                      return (
                        <span key={v} className="text-[11px] px-2 py-0.5 rounded-full bg-white text-indigo-600 border border-indigo-200">
                          {`{{${v}}}`} → {vals[v]}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => { handleCopy(previewCopy); setPreviewCopy(null) }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white transition-all"
                style={{ background: '#6366F1' }}
              >
                <Copy size={14} /> Copiar mensagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
