'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, X, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VerticalBadge } from '@/components/ui/badge'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'
import { VERTICALS } from '@/lib/utils/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string
  title: string
  vertical: string | null
  content: string
  tags: string[]
  updated_at: string
}

interface ProductForm {
  nome: string
  vertical: string
  status: string
  reference_price: string
  recommended_icp: string
  description: string
  includes: string
  main_pitch: string
  commercial_conditions: string
  common_objections: string
  when_to_use: string
  when_not_to_use: string
  strategy_notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: ProductForm = {
  nome: '', vertical: '', status: 'ativo', reference_price: '',
  recommended_icp: '', description: '', includes: '', main_pitch: '',
  commercial_conditions: '', common_objections: '',
  when_to_use: '', when_not_to_use: '', strategy_notes: '',
}

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  ativo:   { color: '#10B981', bg: '#ECFDF5' },
  inativo: { color: '#9CA3AF', bg: '#F3F4F6' },
  beta:    { color: '#6366F1', bg: '#EEF2FF' },
}

// ─── Content parser ───────────────────────────────────────────────────────────

function parseSection(content: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.match(new RegExp(`## ${escaped}\\n([\\s\\S]*?)(?=\\n## |$)`))?.[1]?.trim() ?? ''
}

function parseProductContent(content: string): Partial<ProductForm> {
  const nome = content.match(/^# (.+)/m)?.[1]?.trim() ?? ''
  const vertical = content.match(/\*\*Vertical:\*\* ([^|]+)/)?.[1]?.trim() ?? ''
  const status = content.match(/\*\*Status:\*\* ([^|]+)/)?.[1]?.trim() ?? 'ativo'
  const reference_price = content.match(/\*\*Preço de referência:\*\* (.+?)(?:\s*\||\n|$)/)?.[1]?.trim() ?? ''
  const recommended_icp = content.match(/\*\*ICP recomendado:\*\* (.+)/m)?.[1]?.trim() ?? ''
  return {
    nome, vertical, status, reference_price, recommended_icp,
    description: parseSection(content, 'Descrição'),
    includes: parseSection(content, 'O que inclui'),
    main_pitch: parseSection(content, 'Pitch principal'),
    commercial_conditions: parseSection(content, 'Condições comerciais'),
    common_objections: parseSection(content, 'Objeções comuns'),
    when_to_use: parseSection(content, 'Quando usar'),
    when_not_to_use: parseSection(content, 'Quando NÃO usar'),
    strategy_notes: parseSection(content, 'Notas de estratégia'),
  }
}

function extractPrice(content: string): string {
  return content.match(/\*\*Preço de referência:\*\* (.+?)(?:\s*\||\n|$)/)?.[1]?.trim() ?? ''
}

function extractDescription(content: string): string {
  const desc = parseSection(content, 'Descrição') || parseSection(content, 'Pitch principal')
  return desc.length > 120 ? desc.slice(0, 120) + '…' : desc
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProdutosPage() {
  const profile = useProfile()
  const isGestor = profile?.role === 'gestor'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterVertical, setFilterVertical] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [modal, setModal] = useState<'form' | 'detail' | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load ──
  useEffect(() => {
    fetch('/api/produtos').then(r => r.json()).then(j => {
      setProducts(j.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  // ── Filtered ──
  const filtered = useMemo(() => {
    return products.filter(p => {
      if (filterVertical && p.vertical !== filterVertical) return false
      if (filterStatus && (p.tags?.[0] ?? 'ativo') !== filterStatus) return false
      return true
    })
  }, [products, filterVertical, filterStatus])

  // ── Handlers ──
  function openNew() { setEditingProduct(null); setForm(EMPTY_FORM); setModal('form') }
  function openEdit(p: Product) {
    setEditingProduct(p)
    setForm({ ...EMPTY_FORM, ...parseProductContent(p.content), vertical: p.vertical ?? '' })
    setModal('form')
  }
  function openDetail(p: Product) { setDetailProduct(p); setModal('detail') }
  function closeModal() { setModal(null); setEditingProduct(null); setDetailProduct(null); setForm(EMPTY_FORM) }

  async function handleSave() {
    if (!form.nome.trim()) return
    setSaving(true)
    try {
      const body = editingProduct ? { id: editingProduct.id, ...form } : form
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      const savedId = editingProduct?.id ?? json.data.id
      const savedContent = json.data.content

      // trigger embedding async
      fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'knowledge_base', id: savedId, content: savedContent }),
      }).catch(() => {})

      // refresh list
      const refreshed = await fetch('/api/produtos').then(r => r.json())
      setProducts(refreshed.data ?? [])
      showToast(editingProduct ? 'Produto atualizado' : 'Produto adicionado')
      closeModal()
    } catch { showToast('Erro ao salvar', 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    const res = await fetch('/api/produtos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { showToast('Erro ao excluir', 'error'); return }
    setProducts(prev => prev.filter(p => p.id !== id))
    setConfirmDeleteId(null)
    showToast('Produto removido')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-[#6366F1]" strokeWidth={1.5} />
          <h2 className="text-base font-semibold text-[#111827]">Catálogo de Produtos</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterVertical} onChange={e => setFilterVertical(e.target.value)}
            className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todas as verticais</option>
            {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="beta">Beta</option>
          </select>
          {isGestor && (
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors">
              <Plus size={15} /> Novo produto
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center text-[#9CA3AF] text-sm">
          {products.length === 0
            ? isGestor ? 'Nenhum produto cadastrado. Clique em "+ Novo produto" para começar.' : 'Nenhum produto cadastrado ainda.'
            : 'Nenhum resultado para os filtros selecionados.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const status = p.tags?.[0] ?? 'ativo'
            const statusCfg = STATUS_CFG[status] ?? STATUS_CFG.ativo
            const price = extractPrice(p.content)
            const snippet = extractDescription(p.content)
            return (
              <div key={p.id} className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#111827] leading-snug">{p.title}</h3>
                  <span className="flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ color: statusCfg.color, background: statusCfg.bg }}>
                    {status}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {p.vertical && <VerticalBadge vertical={p.vertical} />}
                  {price && <span className="text-xs text-[#6B7280] font-medium">{price}</span>}
                </div>

                {snippet && <p className="text-xs text-[#6B7280] leading-relaxed flex-1">{snippet}</p>}

                <div className="flex items-center gap-2 pt-2 border-t border-[#F3F4F6]">
                  <button onClick={() => openDetail(p)}
                    className="text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors font-medium">
                    Ver detalhes
                  </button>
                  {isGestor && (
                    <div className="flex items-center gap-2 ml-auto">
                      <button onClick={() => openEdit(p)} className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#6366F1] transition-colors">
                        <Edit2 size={12} /> Editar
                      </button>
                      <button onClick={() => setConfirmDeleteId(p.id)} className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#EF4444] transition-colors">
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Form ── */}
      {modal === 'form' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <h3 className="text-sm font-semibold text-[#111827]">{editingProduct ? 'Editar produto' : 'Novo produto'}</h3>
              <button onClick={closeModal} className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors"><X size={16} /></button>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Basic info */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Nome do produto *</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="ex: ENAMED Intensivo R1"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Vertical</label>
                  <select value={form.vertical} onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">Geral</option>
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="beta">Beta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Preço de ref.</label>
                  <input value={form.reference_price} onChange={e => setForm(f => ({ ...f, reference_price: e.target.value }))}
                    placeholder="R$ 2.490"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">ICP recomendado</label>
                <input value={form.recommended_icp} onChange={e => setForm(f => ({ ...f, recommended_icp: e.target.value }))}
                  placeholder="ex: Médico em R3/R4, quer aprovação no ENAMED"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="O que é o produto em poucas palavras..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">O que inclui</label>
                <textarea value={form.includes} onChange={e => setForm(f => ({ ...f, includes: e.target.value }))}
                  rows={3} placeholder="- Banco com 8.000 questões&#10;- Simulados semanais&#10;- ..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Pitch principal</label>
                <textarea value={form.main_pitch} onChange={e => setForm(f => ({ ...f, main_pitch: e.target.value }))}
                  rows={3} placeholder="Argumento central de venda..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Condições comerciais</label>
                <textarea value={form.commercial_conditions} onChange={e => setForm(f => ({ ...f, commercial_conditions: e.target.value }))}
                  rows={2} placeholder="Parcelamento, bônus, descontos..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Objeções comuns</label>
                <textarea value={form.common_objections} onChange={e => setForm(f => ({ ...f, common_objections: e.target.value }))}
                  rows={2} placeholder="Objeções típicas para este produto..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Quando usar</label>
                  <textarea value={form.when_to_use} onChange={e => setForm(f => ({ ...f, when_to_use: e.target.value }))}
                    rows={2} placeholder="Momento ideal de oferta..."
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Quando NÃO usar</label>
                  <textarea value={form.when_not_to_use} onChange={e => setForm(f => ({ ...f, when_not_to_use: e.target.value }))}
                    rows={2} placeholder="Situações a evitar..."
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Notas de estratégia</label>
                <textarea value={form.strategy_notes} onChange={e => setForm(f => ({ ...f, strategy_notes: e.target.value }))}
                  rows={2} placeholder="Observações internas para o time de vendas..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex items-center gap-3 px-5 py-4 border-t border-[#F3F4F6] sticky bottom-0 bg-white">
              <button onClick={handleSave} disabled={saving || !form.nome.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editingProduct ? 'Salvar alterações' : 'Adicionar produto'}
              </button>
              <button onClick={closeModal} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Detail ── */}
      {modal === 'detail' && detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#111827]">{detailProduct.title}</h3>
                {detailProduct.vertical && <VerticalBadge vertical={detailProduct.vertical} />}
                {(() => {
                  const s = detailProduct.tags?.[0] ?? 'ativo'
                  const cfg = STATUS_CFG[s] ?? STATUS_CFG.ativo
                  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color: cfg.color, background: cfg.bg }}>{s}</span>
                })()}
              </div>
              <button onClick={closeModal} className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors"><X size={16} /></button>
            </div>
            <div className="px-6 py-5 prose prose-sm max-w-none text-[#111827]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailProduct.content}</ReactMarkdown>
            </div>
            {isGestor && (
              <div className="px-5 py-4 border-t border-[#F3F4F6] flex gap-3">
                <button onClick={() => { closeModal(); openEdit(detailProduct) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#6366F1] hover:text-[#4F46E5] border border-[#6366F1] rounded-lg transition-colors">
                  <Edit2 size={14} /> Editar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <p className="text-sm font-medium text-[#111827]">Remover este produto?</p>
            <p className="text-xs text-[#6B7280]">O produto ficará inativo e não aparecerá mais no catálogo nem no RAG.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Remover</button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 px-4 py-2 border border-[#E5E7EB] text-sm text-[#6B7280] rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
