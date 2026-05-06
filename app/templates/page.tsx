'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Copy, Edit2, Trash2, X, Search, Star, Loader2, AlertCircle, Check } from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import type { Profile } from '@/lib/utils/types'
import { VERTICALS } from '@/lib/utils/constants'
import { SkeletonList } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'

// ─── Constants ────────────────────────────────────────────────────────────────

const MOMENTO_OPTIONS = [
  'reengajamento', 'follow-up', 'negociação', 'encerramento',
  'pós-evento', 'campanha', 'teste', 'recuperação', 'nutrição', 'outro',
] as const

const MOMENTO_CFG: Record<string, { color: string; bg: string }> = {
  reengajamento:  { color: '#8B5CF6', bg: '#F5F3FF' },
  'follow-up':    { color: '#6366F1', bg: '#EEF2FF' },
  negociação:     { color: '#F59E0B', bg: '#FFFBEB' },
  encerramento:   { color: '#10B981', bg: '#ECFDF5' },
  'pós-evento':   { color: '#06B6D4', bg: '#ECFEFF' },
  campanha:       { color: '#EC4899', bg: '#FDF2F8' },
  teste:          { color: '#3B82F6', bg: '#EFF6FF' },
  recuperação:    { color: '#EF4444', bg: '#FEF2F2' },
  nutrição:       { color: '#F97316', bg: '#FFF7ED' },
  outro:          { color: '#6B7280', bg: '#F3F4F6' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WaTemplate {
  id: string
  name: string
  momento: string
  copy_text: string
  variables: string[] | null
  vertical: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface FavoriteRow {
  id: string
  user_id: string
  template_id: string
}

interface TemplateForm {
  name: string
  momento: string
  copy_text: string
  variables: string[]   // stored as ['{{nome}}', '{{dr_dra}}']
  vertical: string
  notes: string
}

const EMPTY_FORM: TemplateForm = {
  name: '', momento: '', copy_text: '', variables: [], vertical: '', notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function substituteVars(text: string, profile: Profile | null): string {
  const vars: Record<string, string> = {
    nome:      profile?.name ?? '{{nome}}',
    dr_dra:    'Dr(a)',
    vertical:  profile?.vertical_focus ?? '{{vertical}}',
    telefone:  profile?.phone ?? '{{telefone}}',
    saudacao:  profile?.default_greeting ?? 'Olá',
  }
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key.toLowerCase()] ?? `{{${key}}}`)
}

function MomentoBadge({ momento }: { momento: string }) {
  const cfg = MOMENTO_CFG[momento] ?? { color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap capitalize"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {momento}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
    [],
  )

  const [profile, setProfile]         = useState<Profile | null>(null)
  const [userId, setUserId]           = useState<string | null>(null)
  const [role, setRole]               = useState<string | null>(null)
  const [templates, setTemplates]     = useState<WaTemplate[]>([])
  const [favorites, setFavorites]     = useState<Record<string, FavoriteRow>>({})  // template_id → row
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState<'favoritos' | 'todos'>('todos')
  const [search, setSearch]           = useState('')
  const [copiedId, setCopiedId]       = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [togglingFavId, setTogglingFavId]     = useState<string | null>(null)

  const [modalOpen, setModalOpen]     = useState(false)
  const [editingTpl, setEditingTpl]   = useState<WaTemplate | null>(null)
  const [form, setForm]               = useState<TemplateForm>(EMPTY_FORM)
  const [varInput, setVarInput]       = useState('')  // tag input draft
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [toast, setToast]             = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Load user + role
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          setUserId(data.user.id)
          const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
          if (p) { setProfile(p as Profile); setRole(p.role) }
        }
      } catch {}
    }
    load()
  }, [supabase])

  // ── Load templates
  useEffect(() => {
    async function loadTemplates() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('whatsapp_templates')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        setTemplates((data ?? []) as WaTemplate[])
      } catch { setTemplates([]) } finally { setLoading(false) }
    }
    loadTemplates()
  }, [supabase])

  // ── Load favorites
  useEffect(() => {
    if (!userId) return
    async function loadFavs() {
      try {
        const { data } = await supabase
          .from('user_favorite_templates')
          .select('*')
          .eq('user_id', userId)
        const map: Record<string, FavoriteRow> = {}
        for (const row of (data ?? []) as FavoriteRow[]) map[row.template_id] = row
        setFavorites(map)
      } catch {}
    }
    loadFavs()
  }, [userId, supabase])

  // ── Filtered lists
  const filtered = useMemo(() => {
    if (!search.trim()) return templates
    const q = search.toLowerCase()
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) || t.momento.toLowerCase().includes(q)
    )
  }, [templates, search])

  const favoritesList = useMemo(
    () => filtered.filter(t => !!favorites[t.id]),
    [filtered, favorites],
  )

  const displayList = activeTab === 'favoritos' ? favoritesList : filtered

  // ── Toggle favorite
  async function toggleFavorite(tplId: string) {
    if (!userId) return
    setTogglingFavId(tplId)
    try {
      if (favorites[tplId]) {
        await supabase.from('user_favorite_templates').delete().eq('id', favorites[tplId].id)
        setFavorites(prev => { const n = { ...prev }; delete n[tplId]; return n })
      } else {
        const { data, error } = await supabase
          .from('user_favorite_templates')
          .insert({ user_id: userId, template_id: tplId })
          .select('id,user_id,template_id')
          .single()
        if (error) throw error
        setFavorites(prev => ({ ...prev, [tplId]: data as FavoriteRow }))
      }
    } catch {
      setToast({ type: 'error', message: 'Erro ao atualizar favorito.' })
    } finally { setTogglingFavId(null) }
  }

  // ── Copy text
  function handleCopy(tpl: WaTemplate) {
    const text = substituteVars(tpl.copy_text, profile)
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(tpl.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // ── Modal
  function openCreate() {
    setEditingTpl(null); setForm(EMPTY_FORM); setVarInput(''); setSaveError(''); setModalOpen(true)
  }

  function openEdit(tpl: WaTemplate) {
    setEditingTpl(tpl)
    setForm({
      name: tpl.name, momento: tpl.momento, copy_text: tpl.copy_text,
      variables: tpl.variables ?? [], vertical: tpl.vertical ?? '', notes: tpl.notes ?? '',
    })
    setVarInput(''); setSaveError(''); setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditingTpl(null) }

  // ── Variable chip input
  function addVar() {
    const raw = varInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (!raw) return
    const tag = `{{${raw}}}`
    if (!form.variables.includes(tag)) {
      setForm(prev => ({ ...prev, variables: [...prev.variables, tag] }))
    }
    setVarInput('')
  }

  function removeVar(tag: string) {
    setForm(prev => ({ ...prev, variables: prev.variables.filter(v => v !== tag) }))
  }

  // ── Save
  async function handleSave() {
    if (!form.name.trim() || !form.momento || !form.copy_text.trim()) {
      setSaveError('Nome, momento e texto são obrigatórios.'); return
    }
    setSaving(true); setSaveError('')
    try {
      const payload = {
        name: form.name.trim(), momento: form.momento, copy_text: form.copy_text,
        variables: form.variables.length > 0 ? form.variables : null,
        vertical: form.vertical || null, notes: form.notes || null,
        is_active: true, updated_at: new Date().toISOString(),
      }
      let savedId: string
      if (editingTpl) {
        await supabase.from('whatsapp_templates').update(payload).eq('id', editingTpl.id)
        savedId = editingTpl.id
        const updated: WaTemplate = { ...editingTpl, ...payload }
        setTemplates(prev => prev.map(t => t.id === editingTpl.id ? updated : t))
      } else {
        const { data, error } = await supabase
          .from('whatsapp_templates')
          .insert(payload)
          .select('id,created_at')
          .single()
        if (error) throw error
        savedId = data.id
        const newItem: WaTemplate = { ...payload, id: savedId, created_at: data.created_at }
        setTemplates(prev => [newItem, ...prev])
      }
      // Index embeddings async
      fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'whatsapp_templates', id: savedId,
          content: `${form.name} ${form.momento} ${form.copy_text}`,
        }),
      }).catch(() => {})
      closeModal()
      setToast({ type: 'success', message: editingTpl ? 'Template atualizado.' : 'Template criado.' })
    } catch { setSaveError('Erro ao salvar. Tente novamente.') } finally { setSaving(false) }
  }

  // ── Delete
  async function handleDelete(id: string) {
    try {
      await supabase.from('whatsapp_templates').update({ is_active: false }).eq('id', id)
      setTemplates(prev => prev.filter(t => t.id !== id))
      setFavorites(prev => { const n = { ...prev }; delete n[id]; return n })
      setToast({ type: 'success', message: 'Template removido.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao remover template.' })
    }
    setConfirmDeleteId(null)
  }

  const isGestor = role === 'gestor'

  const TABS = [
    { id: 'favoritos' as const, label: 'Favoritos', count: favoritesList.length },
    { id: 'todos' as const, label: 'Todos', count: templates.length },
  ]

  // ─── Render card list ──────────────────────────────────────────────────────
  function renderList(list: WaTemplate[]) {
    if (list.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-500 text-sm">
            {activeTab === 'favoritos'
              ? 'Você ainda não tem favoritos. Clique na estrela para favoritar.'
              : 'Nenhum template encontrado.'}
          </p>
          {isGestor && activeTab === 'todos' && (
            <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">
              Criar primeiro template
            </button>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {list.map(tpl => (
          <div
            key={tpl.id}
            className="bg-white border rounded-xl p-4 hover:shadow-md transition-shadow"
            style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0 space-y-1.5">
                <h3 className="text-sm font-semibold text-gray-900 leading-snug">{tpl.name}</h3>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <MomentoBadge momento={tpl.momento} />
                  {tpl.vertical && <VerticalBadge vertical={tpl.vertical} />}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {/* Star */}
                <button
                  onClick={() => toggleFavorite(tpl.id)}
                  disabled={togglingFavId === tpl.id}
                  className={`p-1.5 rounded-lg transition-colors ${favorites[tpl.id] ? 'text-amber-400 hover:text-amber-500' : 'text-gray-300 hover:text-amber-400'}`}
                  title={favorites[tpl.id] ? 'Remover favorito' : 'Adicionar aos favoritos'}
                >
                  <Star size={14} fill={favorites[tpl.id] ? 'currentColor' : 'none'} />
                </button>

                {/* Copy */}
                <button
                  onClick={() => handleCopy(tpl)}
                  className={`p-1.5 rounded-lg transition-colors ${copiedId === tpl.id ? 'text-emerald-500 bg-emerald-50' : 'text-gray-400 hover:text-indigo-500 hover:bg-indigo-50'}`}
                  title="Copiar texto"
                >
                  {copiedId === tpl.id ? <Check size={14} /> : <Copy size={14} />}
                </button>

                {/* Gestor: edit + delete */}
                {isGestor && (
                  <>
                    <button
                      onClick={() => openEdit(tpl)}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    {confirmDeleteId === tpl.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(tpl.id)}
                          className="px-2 py-0.5 text-[11px] text-white rounded font-medium"
                          style={{ background: '#EF4444' }}
                        >
                          Sim
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(tpl.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Copy text preview */}
            <p className="mt-2.5 text-[12px] text-gray-500 leading-relaxed line-clamp-2">
              {tpl.copy_text}
            </p>

            {/* Variables chips */}
            {tpl.variables && tpl.variables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tpl.variables.map(v => (
                  <span
                    key={v}
                    className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium"
                    style={{ background: '#EEF2FF', color: '#6366F1' }}
                  >
                    {v}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Templates de WhatsApp aprovados pelo time</p>
        </div>
        {isGestor && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.01]"
            style={{ background: '#6366F1' }}
          >
            <Plus size={16} /> Novo Template
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou momento…"
          className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
          style={{ borderColor: '#E5E7EB' }}
        />
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
            {tab.count > 0 && (
              <span
                className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
                style={
                  activeTab === tab.id
                    ? { background: '#EEF2FF', color: '#6366F1' }
                    : { background: '#F3F4F6', color: '#6B7280' }
                }
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {loading ? <SkeletonList count={5} /> : renderList(displayList)}

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">
                {editingTpl ? 'Editar template' : 'Novo template'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />{saveError}
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Follow-up pós-reunião"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>

              {/* Momento + Vertical */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Momento *</label>
                  <select
                    value={form.momento}
                    onChange={e => setForm(p => ({ ...p, momento: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <option value="">Selecionar…</option>
                    {MOMENTO_OPTIONS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical</label>
                  <select
                    value={form.vertical}
                    onChange={e => setForm(p => ({ ...p, vertical: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <option value="">Todas</option>
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              {/* Copy text */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Texto * <span className="text-[11px] normal-case font-normal text-gray-400">(use variáveis como {`{{nome}}`}, {`{{dr_dra}}`})</span>
                </label>
                <textarea
                  value={form.copy_text}
                  onChange={e => setForm(p => ({ ...p, copy_text: e.target.value }))}
                  placeholder="Escreva o template aqui…"
                  rows={7}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none font-mono leading-relaxed"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>

              {/* Variables tag input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Variáveis</label>
                <div className="flex flex-wrap gap-1.5 min-h-[32px] p-2 border rounded-lg bg-white" style={{ borderColor: '#E5E7EB' }}>
                  {form.variables.map(v => (
                    <span
                      key={v}
                      className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-mono font-medium"
                      style={{ background: '#EEF2FF', color: '#6366F1' }}
                    >
                      {v}
                      <button
                        onClick={() => removeVar(v)}
                        className="hover:text-red-500 transition-colors"
                        type="button"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={varInput}
                    onChange={e => setVarInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addVar() }
                    }}
                    placeholder={form.variables.length === 0 ? 'Digite e pressione Enter (ex: nome)' : ''}
                    className="flex-1 min-w-[120px] text-[12px] outline-none bg-transparent text-gray-700 placeholder:text-gray-400"
                  />
                </div>
                <p className="text-[11px] text-gray-400">Digite o nome da variável (sem chaves) e pressione Enter.</p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Observações sobre quando usar…"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors"
                style={{ borderColor: '#E5E7EB' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-all hover:scale-[1.01]"
                style={{ background: '#6366F1' }}
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando…</>
                  : editingTpl ? 'Salvar alterações' : 'Criar template'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
