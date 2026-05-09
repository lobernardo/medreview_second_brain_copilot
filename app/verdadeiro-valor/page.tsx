'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Edit2, Trash2, X, Loader2, Trophy, Star } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VerticalBadge } from '@/components/ui/badge'
import { VERTICALS } from '@/lib/utils/constants'
import { SkeletonCard, SkeletonGrid } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerdadeiroValor {
  id: string
  content: string
  updated_at: string
}

interface BigNumber {
  id: string
  value: string
  label: string
  description: string | null
  category: string | null
  vertical: string | null
  is_highlight: boolean
  is_active: boolean
}

interface BigNumberForm {
  value: string
  label: string
  description: string
  category: string
  vertical: string
  is_highlight: boolean
}

const CATEGORIES = ['aprovação', 'alunos', 'satisfação', 'mercado', 'outro'] as const
const EMPTY_BN_FORM: BigNumberForm = {
  value: '', label: '', description: '', category: '', vertical: '', is_highlight: false,
}

const CATEGORY_CFG: Record<string, { color: string; bg: string }> = {
  aprovação:  { color: '#3B82F6', bg: '#EFF6FF' },
  alunos:     { color: '#8B5CF6', bg: '#F5F3FF' },
  satisfação: { color: '#10B981', bg: '#ECFDF5' },
  mercado:    { color: '#F97316', bg: '#FFF7ED' },
  outro:      { color: '#6B7280', bg: '#F3F4F6' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VerdadeiroValorPage() {
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ),
    [],
  )

  const profile = useProfile()
  const isGestor = profile?.role === 'gestor'

  // ── Verdadeiro Valor state ──
  const [vv, setVv] = useState<VerdadeiroValor | null>(null)
  const [vvLoading, setVvLoading] = useState(true)
  const [editingVv, setEditingVv] = useState(false)
  const [vvDraft, setVvDraft] = useState('')
  const [savingVv, setSavingVv] = useState(false)

  // ── Big Numbers state ──
  const [bns, setBns] = useState<BigNumber[]>([])
  const [bnsLoading, setBnsLoading] = useState(true)
  const [filterVertical, setFilterVertical] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  // ── Modal state ──
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBn, setEditingBn] = useState<BigNumber | null>(null)
  const [form, setForm] = useState<BigNumberForm>(EMPTY_BN_FORM)
  const [savingBn, setSavingBn] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load data ──
  useEffect(() => {
    async function load() {
      const [vvRes, bnsRes] = await Promise.all([
        supabase.from('verdadeiro_valor').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('big_numbers').select('*').eq('is_active', true).order('label'),
      ])
      if (vvRes.data) { setVv(vvRes.data); setVvDraft(vvRes.data.content) }
      if (bnsRes.data) setBns(bnsRes.data)
      setVvLoading(false)
      setBnsLoading(false)
    }
    load()
  }, [supabase])

  // ── Verdadeiro Valor handlers ──
  async function handleSaveVv() {
    setSavingVv(true)
    try {
      const res = await fetch('/api/verdadeiro-valor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: vv?.id ?? null, content: vvDraft }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (vv) {
        setVv({ ...vv, content: vvDraft })
      } else {
        setVv({ id: json.data.id, content: vvDraft, updated_at: new Date().toISOString() })
      }
      setEditingVv(false)
      showToast('Conteúdo salvo com sucesso')
    } catch {
      showToast('Erro ao salvar', 'error')
    } finally {
      setSavingVv(false)
    }
  }

  // ── Big Numbers handlers ──
  function openNewBn() {
    setEditingBn(null)
    setForm(EMPTY_BN_FORM)
    setModalOpen(true)
  }

  function openEditBn(bn: BigNumber) {
    setEditingBn(bn)
    setForm({
      value: bn.value,
      label: bn.label,
      description: bn.description ?? '',
      category: bn.category ?? '',
      vertical: bn.vertical ?? '',
      is_highlight: bn.is_highlight,
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingBn(null)
    setForm(EMPTY_BN_FORM)
  }

  async function handleSaveBn() {
    if (!form.value.trim() || !form.label.trim()) return
    setSavingBn(true)
    try {
      const payload = {
        value: form.value.trim(),
        label: form.label.trim(),
        description: form.description.trim() || null,
        category: form.category || null,
        vertical: form.vertical || null,
        is_highlight: form.is_highlight,
      }
      if (editingBn) {
        const res = await fetch('/api/big-numbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingBn.id, ...payload }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        setBns(prev => prev.map(b => b.id === editingBn.id ? { ...b, ...payload } : b))
        showToast('Número atualizado')
      } else {
        const res = await fetch('/api/big-numbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, is_active: true }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        const newBn: BigNumber = { ...payload, id: json.data.id, is_active: true }
        setBns(prev => [...prev, newBn].sort((a, b) => a.label.localeCompare(b.label)))
        showToast('Número adicionado')
      }
      closeModal()
    } catch {
      showToast('Erro ao salvar', 'error')
    } finally {
      setSavingBn(false)
    }
  }

  async function handleDeleteBn(id: string) {
    const res = await fetch('/api/big-numbers', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { showToast('Erro ao excluir', 'error'); return }
    setBns(prev => prev.filter(b => b.id !== id))
    setConfirmDeleteId(null)
    showToast('Número removido')
  }

  // ── Filtered big numbers ──
  const filteredBns = bns.filter(b => {
    if (filterVertical && b.vertical !== filterVertical) return false
    if (filterCategory && b.category !== filterCategory) return false
    return true
  })

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* ── Section 1: O Verdadeiro Valor ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy size={20} className="text-[#6366F1]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-[#111827]">O Verdadeiro Valor</h2>
          </div>
          {isGestor && !editingVv && (
            <button
              onClick={() => { setVvDraft(vv?.content ?? ''); setEditingVv(true) }}
              className="flex items-center gap-1.5 text-sm text-[#6366F1] hover:text-[#4F46E5] transition-colors"
            >
              <Edit2 size={14} />
              Editar
            </button>
          )}
        </div>

        <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm overflow-hidden">
          {vvLoading ? (
            <div className="p-6">
              <SkeletonCard />
            </div>
          ) : editingVv ? (
            <div className="p-5 space-y-4">
              <textarea
                value={vvDraft}
                onChange={e => setVvDraft(e.target.value)}
                rows={14}
                placeholder="Escreva o verdadeiro valor da Med-Review em Markdown..."
                className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
              />
              <p className="text-[11px] text-gray-400">
                Use Markdown para formatar: <code className="bg-gray-100 px-1 rounded">**negrito**</code> · <code className="bg-gray-100 px-1 rounded">- bullets</code> · <code className="bg-gray-100 px-1 rounded">## títulos</code>
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveVv}
                  disabled={savingVv}
                  className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingVv && <Loader2 size={14} className="animate-spin" />}
                  Salvar
                </button>
                <button
                  onClick={() => setEditingVv(false)}
                  className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : vv?.content ? (
            <div className="p-6 prose prose-sm max-w-none text-[#111827]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{vv.content}</ReactMarkdown>
            </div>
          ) : (
            <div className="p-10 text-center text-[#9CA3AF] text-sm">
              {isGestor
                ? 'Nenhum conteúdo ainda. Clique em "Editar" para adicionar.'
                : 'Conteúdo ainda não configurado pelo gestor.'}
            </div>
          )}
        </div>
      </section>

      {/* ── Section 2: Big Numbers ── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h2 className="text-base font-semibold text-[#111827]">Big Numbers</h2>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Filters */}
            <select
              value={filterVertical}
              onChange={e => setFilterVertical(e.target.value)}
              className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Todas as verticais</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            {isGestor && (
              <button
                onClick={openNewBn}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={15} />
                Novo número
              </button>
            )}
          </div>
        </div>

        {bnsLoading ? (
          <SkeletonGrid />
        ) : filteredBns.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center text-[#9CA3AF] text-sm">
            {bns.length === 0
              ? isGestor ? 'Nenhum número cadastrado. Clique em "+ Novo número" para começar.' : 'Nenhum número cadastrado ainda.'
              : 'Nenhum resultado para os filtros selecionados.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBns.map(bn => {
              const catCfg = bn.category ? CATEGORY_CFG[bn.category] ?? CATEGORY_CFG.outro : null
              return (
                <div
                  key={bn.id}
                  className={[
                    'bg-white rounded-xl shadow-sm p-5 flex flex-col gap-2 relative',
                    bn.is_highlight
                      ? 'border-2 border-[#6366F1]'
                      : 'border border-[#E5E7EB]',
                  ].join(' ')}
                >
                  {bn.is_highlight && (
                    <span className="absolute top-3 right-3 text-[#6366F1]">
                      <Star size={14} fill="currentColor" />
                    </span>
                  )}

                  <div className="text-3xl font-bold text-[#111827] leading-none">{bn.value}</div>
                  <div className="text-sm font-semibold text-[#374151]">{bn.label}</div>
                  {bn.description && (
                    <div className="text-xs text-[#6B7280] leading-snug">{bn.description}</div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-2">
                    {bn.category && catCfg && (
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ color: catCfg.color, background: catCfg.bg }}
                      >
                        {bn.category}
                      </span>
                    )}
                    {bn.vertical && <VerticalBadge vertical={bn.vertical} />}
                  </div>

                  {isGestor && (
                    <div className="flex items-center gap-2 pt-1 border-t border-[#F3F4F6] mt-1">
                      <button
                        onClick={() => openEditBn(bn)}
                        className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(bn.id)}
                        className="flex items-center gap-1 text-xs text-[#EF4444] hover:text-red-700 transition-colors ml-auto"
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Modal: Add/Edit Big Number ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6]">
              <h3 className="text-sm font-semibold text-[#111827]">
                {editingBn ? 'Editar número' : 'Novo número'}
              </h3>
              <button onClick={closeModal} className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Valor *</label>
                  <input
                    value={form.value}
                    onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                    placeholder="ex: 26.000+"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Label *</label>
                  <input
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="ex: Alunos impactados"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Descrição</label>
                <input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Complemento ou contexto do número"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Categoria</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Sem categoria</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Vertical</label>
                  <select
                    value={form.vertical}
                    onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">Geral</option>
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setForm(f => ({ ...f, is_highlight: !f.is_highlight }))}
                  className={[
                    'w-10 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0',
                    form.is_highlight ? 'bg-[#6366F1]' : 'bg-[#D1D5DB]',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200',
                      form.is_highlight ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </div>
                <span className="text-sm text-[#374151]">Destaque (borda primária)</span>
              </label>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t border-[#F3F4F6]">
              <button
                onClick={handleSaveBn}
                disabled={savingBn || !form.value.trim() || !form.label.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {savingBn && <Loader2 size={14} className="animate-spin" />}
                {editingBn ? 'Salvar alterações' : 'Adicionar'}
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <p className="text-sm text-[#111827] font-medium">Remover este número?</p>
            <p className="text-xs text-[#6B7280]">O card será ocultado mas não deletado permanentemente.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteBn(confirmDeleteId)}
                className="flex-1 px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Remover
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 border border-[#E5E7EB] text-sm text-[#6B7280] hover:text-[#111827] rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
