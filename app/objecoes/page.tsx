'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Edit2, Trash2, X, AlertCircle, Loader2, Search, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { VERTICALS } from '@/lib/utils/constants'
import { SkeletonList } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ObjPattern {
  id: string
  topic: string
  definition: string | null
  real_meaning: string | null
  vertical: string | null
  recommended_response: string | null
  what_not_to_say: string | null
  proof_points: string | null
  times_seen_total: number
  win_rate: number | null
  updated_at: string
}

interface ObjForm {
  topic: string
  definition: string
  real_meaning: string
  vertical: string
  recommended_response: string
  what_not_to_say: string
  proof_points: string
  win_rate: string
}

interface UserObjResponse {
  id: string
  user_id: string
  objection_id: string
  response_text: string
}

const EMPTY_FORM: ObjForm = {
  topic: '', definition: '', real_meaning: '', vertical: '',
  recommended_response: '', what_not_to_say: '', proof_points: '', win_rate: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function winRateBadge(rate: number | null): { color: string; bg: string; label: string } | null {
  if (rate === null) return null
  const r = Number(rate)
  if (r >= 60) return { color: '#10B981', bg: '#ECFDF5', label: `${r}%` }
  if (r >= 40) return { color: '#F59E0B', bg: '#FFFBEB', label: `${r}%` }
  return { color: '#EF4444', bg: '#FEF2F2', label: `${r}%` }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ObjEcoesPage() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
    [],
  )

  // Auth
  const [userId, setUserId]     = useState<string | null>(null)
  const [role, setRole]         = useState<string | null>(null)

  // Data
  const [objs, setObjs]         = useState<ObjPattern[]>([])
  const [loading, setLoading]   = useState(true)

  // Filters
  const [filterVertical, setFilterVertical] = useState('')
  const [filterSearch, setFilterSearch]     = useState('')

  // Accordion
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Personal responses
  const [personalResponses, setPersonalResponses] = useState<Record<string, UserObjResponse>>({})
  const [responseTexts, setResponseTexts]         = useState<Record<string, string>>({})
  const [savingResp, setSavingResp]               = useState<Record<string, boolean>>({})

  // Gestor CRUD
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [modalOpen, setModalOpen]             = useState(false)
  const [editingObj, setEditingObj]           = useState<ObjPattern | null>(null)
  const [form, setForm]                       = useState<ObjForm>(EMPTY_FORM)
  const [saving, setSaving]                   = useState(false)
  const [saveError, setSaveError]             = useState('')
  const [toast, setToast]                     = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // ── Load user + role
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.auth.getUser()
        if (data.user) {
          setUserId(data.user.id)
          const { data: p } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
          if (p) setRole(p.role)
        }
      } catch {}
    }
    load()
  }, [supabase])

  // ── Load objections
  useEffect(() => {
    async function loadObjs() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('objection_patterns')
          .select('id,topic,definition,real_meaning,vertical,recommended_response,what_not_to_say,proof_points,times_seen_total,win_rate,updated_at')
          .order('times_seen_total', { ascending: false })
        setObjs((data ?? []) as ObjPattern[])
      } catch { setObjs([]) } finally { setLoading(false) }
    }
    loadObjs()
  }, [supabase])

  // ── Load personal responses after userId is set
  useEffect(() => {
    if (!userId) return
    async function load() {
      try {
        const { data } = await supabase
          .from('user_objection_responses')
          .select('*')
          .eq('user_id', userId)
        const map: Record<string, UserObjResponse> = {}
        const texts: Record<string, string> = {}
        for (const r of (data ?? []) as UserObjResponse[]) {
          map[r.objection_id] = r
          texts[r.objection_id] = r.response_text
        }
        setPersonalResponses(map)
        setResponseTexts(texts)
      } catch {}
    }
    load()
  }, [userId, supabase])

  // ── Filtered list
  const filtered = useMemo(() => objs.filter(o => {
    if (filterVertical && o.vertical !== filterVertical) return false
    if (filterSearch && !o.topic.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  }), [objs, filterVertical, filterSearch])

  // ── Accordion toggle
  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Personal response: save
  async function savePersonalResponse(objId: string) {
    const text = (responseTexts[objId] ?? '').trim()
    if (!text || !userId) return
    setSavingResp(prev => ({ ...prev, [objId]: true }))
    try {
      const { data, error } = await supabase
        .from('user_objection_responses')
        .upsert(
          { user_id: userId, objection_id: objId, response_text: text, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,objection_id' },
        )
        .select('id,user_id,objection_id,response_text')
        .single()
      if (error) throw error
      setPersonalResponses(prev => ({ ...prev, [objId]: data as UserObjResponse }))
      setToast({ type: 'success', message: 'Resposta salva!' })
    } catch { setToast({ type: 'error', message: 'Erro ao salvar.' }) }
    finally { setSavingResp(prev => ({ ...prev, [objId]: false })) }
  }

  // ── Personal response: delete
  async function deletePersonalResponse(objId: string) {
    const resp = personalResponses[objId]
    if (!resp) return
    try {
      await supabase.from('user_objection_responses').delete().eq('id', resp.id)
      setPersonalResponses(prev => { const n = { ...prev }; delete n[objId]; return n })
      setResponseTexts(prev => ({ ...prev, [objId]: '' }))
      setToast({ type: 'success', message: 'Resposta removida.' })
    } catch { setToast({ type: 'error', message: 'Erro ao remover.' }) }
  }

  // ── Gestor modal
  function openCreate() { setEditingObj(null); setForm(EMPTY_FORM); setSaveError(''); setModalOpen(true) }

  function openEdit(obj: ObjPattern) {
    setEditingObj(obj)
    setForm({
      topic: obj.topic, definition: obj.definition ?? '', real_meaning: obj.real_meaning ?? '',
      vertical: obj.vertical ?? '', recommended_response: obj.recommended_response ?? '',
      what_not_to_say: obj.what_not_to_say ?? '', proof_points: obj.proof_points ?? '',
      win_rate: obj.win_rate !== null ? String(obj.win_rate) : '',
    })
    setSaveError(''); setModalOpen(true)
  }

  async function handleSave() {
    if (!form.topic.trim() || !form.recommended_response.trim()) {
      setSaveError('Tema e resposta recomendada são obrigatórios.'); return
    }
    setSaving(true); setSaveError('')
    try {
      const payload = {
        topic: form.topic.trim(), definition: form.definition || null,
        real_meaning: form.real_meaning || null, vertical: form.vertical || null,
        recommended_response: form.recommended_response,
        what_not_to_say: form.what_not_to_say || null, proof_points: form.proof_points || null,
        win_rate: form.win_rate !== '' ? Number(form.win_rate) : null,
        updated_at: new Date().toISOString(),
      }
      let savedId: string
      if (editingObj) {
        await supabase.from('objection_patterns').update(payload).eq('id', editingObj.id)
        savedId = editingObj.id
        setObjs(prev => prev.map(o => o.id === editingObj.id ? { ...o, ...payload } : o))
      } else {
        const { data, error } = await supabase
          .from('objection_patterns')
          .insert({ ...payload, times_seen_total: 0 })
          .select('id')
          .single()
        if (error) throw error
        savedId = data.id
        setObjs(prev => [{ ...payload, id: savedId, times_seen_total: 0 } as ObjPattern, ...prev])
      }
      fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'objection_patterns', id: savedId,
          content: [form.topic, form.definition, form.real_meaning, form.recommended_response].filter(Boolean).join(' '),
        }),
      }).catch(() => {})
      setModalOpen(false)
      setToast({ type: 'success', message: editingObj ? 'Objeção atualizada.' : 'Objeção criada.' })
    } catch { setSaveError('Erro ao salvar. Tente novamente.') } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from('objection_patterns').delete().eq('id', id)
      setObjs(prev => prev.filter(o => o.id !== id))
      setToast({ type: 'success', message: 'Objeção removida.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao remover objeção.' })
    }
    setConfirmDeleteId(null)
  }

  const isGestor = role === 'gestor'

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Matriz de Objeções</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {objs.length} objeção{objs.length !== 1 ? 'ões' : ''} mapeadas
          </p>
        </div>
        {isGestor && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.01]"
            style={{ background: '#6366F1' }}
          >
            <Plus size={16} /> Nova Objeção
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Buscar por tema…"
            className="pl-9 pr-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
            style={{ borderColor: '#E5E7EB', minWidth: '180px' }}
          />
        </div>
        <select
          value={filterVertical}
          onChange={e => setFilterVertical(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
          style={{ borderColor: '#E5E7EB' }}
        >
          <option value="">Todas as verticais</option>
          {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        {(filterSearch || filterVertical) && (
          <button
            onClick={() => { setFilterSearch(''); setFilterVertical('') }}
            className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 bg-white"
            style={{ borderColor: '#E5E7EB' }}
          >
            Limpar
          </button>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Loading */}
      {loading && <SkeletonList count={5} />}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#EEF2FF' }}>
            <ShieldAlert size={24} className="text-indigo-400" strokeWidth={1.5} />
          </div>
          <p className="text-gray-500 text-sm">Nenhuma objeção encontrada.</p>
          {isGestor && (
            <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">
              Adicionar primeira objeção
            </button>
          )}
        </div>
      )}

      {/* Accordion list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(obj => {
            const wr = winRateBadge(obj.win_rate)
            const isOpen = expandedIds.has(obj.id)
            const myResp = personalResponses[obj.id]
            const myRespText = responseTexts[obj.id] ?? ''
            const isSaving = savingResp[obj.id] ?? false

            return (
              <div
                key={obj.id}
                className="bg-white border rounded-xl overflow-hidden"
                style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
              >
                {/* Collapsed row (always visible) */}
                <div
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => toggleExpand(obj.id)}
                >
                  <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      &ldquo;{obj.topic}&rdquo;
                    </span>
                    {obj.vertical && <VerticalBadge vertical={obj.vertical} />}
                    {wr && (
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                        style={{ color: wr.color, background: wr.bg }}
                      >
                        win {wr.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                    {/* Gestor quick-edit button (stops propagation) */}
                    {isGestor && (
                      <>
                        <button
                          onClick={e => { e.stopPropagation(); openEdit(obj) }}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        {confirmDeleteId === obj.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => handleDelete(obj.id)}
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
                            onClick={e => { e.stopPropagation(); setConfirmDeleteId(obj.id) }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </>
                    )}
                    {isOpen
                      ? <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
                      : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
                    }
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-3" style={{ borderColor: '#E5E7EB' }}>

                    {/* a) Definition / real meaning */}
                    {obj.definition && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                          O que o lead quer dizer:
                        </p>
                        <p className="text-[13px] text-gray-600 italic leading-relaxed">{obj.definition}</p>
                      </div>
                    )}
                    {obj.real_meaning && !obj.definition && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                          O que o lead realmente quer dizer:
                        </p>
                        <p className="text-[13px] text-gray-600 italic leading-relaxed">&ldquo;{obj.real_meaning}&rdquo;</p>
                      </div>
                    )}
                    {obj.real_meaning && obj.definition && (
                      <p className="text-[12px] text-gray-500 italic">&ldquo;{obj.real_meaning}&rdquo;</p>
                    )}

                    {/* b) How to respond */}
                    {obj.recommended_response && (
                      <div className="rounded-lg p-3" style={{ background: '#EEF2FF' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500 mb-1">Como responder</p>
                        <p className="text-[13px] text-gray-800 leading-relaxed">{obj.recommended_response}</p>
                      </div>
                    )}

                    {/* c) What not to say */}
                    {obj.what_not_to_say && (
                      <div className="rounded-lg p-3" style={{ background: '#FEF2F2' }}>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 mb-1">Não dizer</p>
                        <p className="text-[13px] text-red-700 leading-relaxed">{obj.what_not_to_say}</p>
                      </div>
                    )}

                    {/* d) Proof points */}
                    {obj.proof_points && (
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">Proof points</p>
                        <p className="text-[12px] text-gray-600 leading-relaxed">{obj.proof_points}</p>
                      </div>
                    )}

                    {/* e) Minha resposta */}
                    <div className="pt-1">
                      <div className="flex items-baseline justify-between mb-1.5">
                        <p className="text-[12px] font-semibold text-gray-700">Minha resposta</p>
                        <p className="text-[11px] text-gray-400">Personalize para seu estilo</p>
                      </div>
                      <textarea
                        value={myRespText}
                        onChange={e => setResponseTexts(prev => ({ ...prev, [obj.id]: e.target.value }))}
                        placeholder="Escreva sua versão personalizada…"
                        rows={3}
                        className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                        style={{ borderColor: '#E5E7EB' }}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => savePersonalResponse(obj.id)}
                          disabled={isSaving || !myRespText.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                          style={{ background: '#6366F1' }}
                        >
                          {isSaving ? <><Loader2 size={11} className="animate-spin" /> Salvando…</> : 'Salvar minha resposta'}
                        </button>
                        {myResp && (
                          <button
                            onClick={() => deletePersonalResponse(obj.id)}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 border transition-colors"
                            style={{ borderColor: '#FCA5A5' }}
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Gestor Create / Edit Modal ──────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">{editingObj ? 'Editar objeção' : 'Nova objeção'}</h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />{saveError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tema *</label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
                    placeholder="Ex: Preço muito alto"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
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
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Win rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.win_rate}
                    onChange={e => setForm(p => ({ ...p, win_rate: e.target.value }))}
                    placeholder="Ex: 65"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Definição</label>
                  <input
                    type="text"
                    value={form.definition}
                    onChange={e => setForm(p => ({ ...p, definition: e.target.value }))}
                    placeholder="Breve definição da objeção…"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">O que o lead realmente quer dizer</label>
                  <input
                    type="text"
                    value={form.real_meaning}
                    onChange={e => setForm(p => ({ ...p, real_meaning: e.target.value }))}
                    placeholder="Ex: Ainda não vejo valor suficiente…"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resposta recomendada *</label>
                  <textarea
                    value={form.recommended_response}
                    onChange={e => setForm(p => ({ ...p, recommended_response: e.target.value }))}
                    placeholder="Como o closer deve responder…"
                    rows={4}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">O que NÃO dizer</label>
                  <textarea
                    value={form.what_not_to_say}
                    onChange={e => setForm(p => ({ ...p, what_not_to_say: e.target.value }))}
                    placeholder="Frases e abordagens que pioram a situação…"
                    rows={3}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Proof points</label>
                  <textarea
                    value={form.proof_points}
                    onChange={e => setForm(p => ({ ...p, proof_points: e.target.value }))}
                    placeholder="Dados, cases e evidências que comprovam o valor…"
                    rows={3}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50"
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
                  : editingObj ? 'Salvar' : 'Criar objeção'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
