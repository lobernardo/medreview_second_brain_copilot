'use client'

import { useState, useEffect, useMemo } from 'react'
import { Edit2, Trash2, X, Loader2, Package, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { VerticalBadge } from '@/components/ui/badge'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'
import { VERTICALS } from '@/lib/utils/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommercialDetails {
  id: string
  kb_id: string
  icp: string | null
  pitch: string | null
  commercial_copy: string | null
  price: string | null
  access_duration: string | null
  payment_conditions: string | null
  when_to_use: string | null
  when_not_to_use: string | null
  objections: string | null
  strategy_notes: string | null
}

interface Product {
  id: string
  title: string
  vertical: string | null
  content: string
  tags: string[]
  updated_at: string
  commercial: CommercialDetails | null
}

interface CommercialForm {
  icp: string
  pitch: string
  commercial_copy: string
  price: string
  access_duration: string
  payment_conditions: string
  when_to_use: string
  when_not_to_use: string
  objections: string
  strategy_notes: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set(['ativo', 'inativo', 'beta'])

const STATUS_CFG: Record<string, { color: string; bg: string }> = {
  ativo:   { color: '#10B981', bg: '#ECFDF5' },
  inativo: { color: '#9CA3AF', bg: '#F3F4F6' },
  beta:    { color: '#6366F1', bg: '#EEF2FF' },
}

const EMPTY_COMMERCIAL: CommercialForm = {
  icp: '',
  pitch: '',
  commercial_copy: '',
  price: '',
  access_duration: '',
  payment_conditions: '',
  when_to_use: '',
  when_not_to_use: '',
  objections: '',
  strategy_notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''
  const padded = digits.padStart(3, '0')
  const intPart = (padded.slice(0, -2).replace(/^0+/, '') || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${intPart},${padded.slice(-2)}`
}

function getProductStatus(tags: string[]): string {
  const first = tags?.[0]
  return first && VALID_STATUSES.has(first) ? first : 'ativo'
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProdutosPage() {
  const profile = useProfile()
  const isGestor = profile?.role === 'gestor'

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [filterVertical, setFilterVertical] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // modals
  const [detailProduct, setDetailProduct] = useState<Product | null>(null)
  const [commercialProduct, setCommercialProduct] = useState<Product | null>(null)
  const [commercialForm, setCommercialForm] = useState<CommercialForm>(EMPTY_COMMERCIAL)
  const [saving, setSaving] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // detail modal state
  const [commercialExpanded, setCommercialExpanded] = useState(false)

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
      if (filterStatus && getProductStatus(p.tags) !== filterStatus) return false
      return true
    })
  }, [products, filterVertical, filterStatus])

  // ── Handlers ──
  function openDetail(p: Product) {
    setDetailProduct(p)
    setCommercialExpanded(false)
  }

  function openCommercialForm(p: Product) {
    setCommercialProduct(p)
    if (p.commercial) {
      setCommercialForm({
        icp: p.commercial.icp ?? '',
        pitch: p.commercial.pitch ?? '',
        commercial_copy: p.commercial.commercial_copy ?? '',
        price: p.commercial.price ?? '',
        access_duration: p.commercial.access_duration ?? '',
        payment_conditions: p.commercial.payment_conditions ?? '',
        when_to_use: p.commercial.when_to_use ?? '',
        when_not_to_use: p.commercial.when_not_to_use ?? '',
        objections: p.commercial.objections ?? '',
        strategy_notes: p.commercial.strategy_notes ?? '',
      })
    } else {
      setCommercialForm(EMPTY_COMMERCIAL)
    }
  }

  function closeDetail() { setDetailProduct(null) }

  function closeCommercial() {
    setCommercialProduct(null)
    setCommercialForm(EMPTY_COMMERCIAL)
  }

  function copyCommercialCopy() {
    navigator.clipboard.writeText(commercialForm.commercial_copy).then(() => {
      showToast('Copy copiado!')
    }).catch(() => {
      showToast('Erro ao copiar', 'error')
    })
  }

  async function handleSaveCommercial() {
    if (!commercialProduct) return
    setSaving(true)
    try {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kb_id: commercialProduct.id, ...commercialForm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)

      // refresh list
      const refreshed = await fetch('/api/produtos').then(r => r.json())
      setProducts(refreshed.data ?? [])
      showToast('Dados comerciais salvos')
      closeCommercial()
    } catch {
      showToast('Erro ao salvar', 'error')
    } finally {
      setSaving(false)
    }
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
        </div>
      </div>

      {/* List */}
      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center text-[#9CA3AF] text-sm">
          {products.length === 0
            ? "Nenhum produto cadastrado. Adicione produtos na Knowledge Base com categoria 'produto'."
            : 'Nenhum resultado para os filtros selecionados.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => {
            const status = getProductStatus(p.tags)
            const statusCfg = STATUS_CFG[status] ?? STATUS_CFG.ativo
            const hasCommercial = p.commercial !== null
            const icpSnippet = p.commercial?.icp ? p.commercial.icp.slice(0, 80) + (p.commercial.icp.length > 80 ? '…' : '') : null
            const contentSnippet = p.content.slice(0, 100) + (p.content.length > 100 ? '…' : '')

            return (
              <div key={p.id} className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm p-5 flex flex-col gap-3">
                {/* Title + status */}
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#111827] leading-snug">{p.title}</h3>
                  <span className="flex-shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ color: statusCfg.color, background: statusCfg.bg }}>
                    {status}
                  </span>
                </div>

                {/* Vertical + price */}
                <div className="flex items-center gap-2 flex-wrap">
                  {p.vertical && <VerticalBadge vertical={p.vertical} />}
                  {p.commercial?.price && (
                    <span className="text-xs text-[#6B7280] font-medium">{p.commercial.price}</span>
                  )}
                </div>

                {/* ICP snippet */}
                {icpSnippet && (
                  <p className="text-xs text-[#6B7280] leading-relaxed italic">{icpSnippet}</p>
                )}

                {/* Content snippet */}
                <p className="text-xs text-[#9CA3AF] leading-relaxed flex-1">{contentSnippet}</p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#F3F4F6]">
                  <button onClick={() => openDetail(p)}
                    className="text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors font-medium">
                    Ver detalhes
                  </button>

                  {isGestor && (
                    <div className="flex items-center gap-2 ml-auto">
                      {hasCommercial ? (
                        <button onClick={() => openCommercialForm(p)}
                          className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#6366F1] transition-colors">
                          <Edit2 size={12} /> Dados comerciais
                        </button>
                      ) : (
                        <button onClick={() => openCommercialForm(p)}
                          className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#6366F1] transition-colors">
                          + Adicionar comercial
                        </button>
                      )}
                      <button onClick={() => setConfirmDeleteId(p.id)}
                        className="flex items-center gap-1 text-xs text-[#9CA3AF] hover:text-[#EF4444] transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal: Detail ── */}
      {detailProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={closeDetail}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-semibold text-[#111827]">{detailProduct.title}</h3>
                {detailProduct.vertical && <VerticalBadge vertical={detailProduct.vertical} />}
                {(() => {
                  const s = getProductStatus(detailProduct.tags)
                  const cfg = STATUS_CFG[s] ?? STATUS_CFG.ativo
                  return (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ color: cfg.color, background: cfg.bg }}>
                      {s}
                    </span>
                  )
                })()}
              </div>
              <button onClick={closeDetail}
                className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* KB content */}
            <div className="px-6 py-5 prose prose-sm max-w-none text-[#111827]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{detailProduct.content}</ReactMarkdown>
            </div>

            {/* Collapsible commercial section */}
            {detailProduct.commercial && (
              <div className="mx-5 mb-4 border border-[#E5E7EB] rounded-xl overflow-hidden">
                <button
                  onClick={() => setCommercialExpanded(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] transition-colors text-left">
                  <span className="text-xs font-semibold text-[#374151] uppercase tracking-wide">Dados Comerciais</span>
                  {commercialExpanded ? <ChevronUp size={14} className="text-[#6B7280]" /> : <ChevronDown size={14} className="text-[#6B7280]" />}
                </button>

                {commercialExpanded && (
                  <div className="px-4 py-4 space-y-3 border-t border-[#E5E7EB]">
                    {detailProduct.commercial.icp && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">ICP</p>
                        <p className="text-sm text-[#374151]">{detailProduct.commercial.icp}</p>
                      </div>
                    )}
                    {detailProduct.commercial.pitch && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Pitch</p>
                        <p className="text-sm text-[#374151] whitespace-pre-wrap">{detailProduct.commercial.pitch}</p>
                      </div>
                    )}
                    {detailProduct.commercial.price && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Preço</p>
                        <p className="text-sm text-[#374151]">{detailProduct.commercial.price}</p>
                      </div>
                    )}
                    {detailProduct.commercial.access_duration && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Tempo de acesso</p>
                        <p className="text-sm text-[#374151]">{detailProduct.commercial.access_duration}</p>
                      </div>
                    )}
                    {detailProduct.commercial.payment_conditions && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Condições de pagamento</p>
                        <p className="text-sm text-[#374151] whitespace-pre-wrap">{detailProduct.commercial.payment_conditions}</p>
                      </div>
                    )}
                    {detailProduct.commercial.when_to_use && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Quando indicar</p>
                        <p className="text-sm text-[#374151] whitespace-pre-wrap">{detailProduct.commercial.when_to_use}</p>
                      </div>
                    )}
                    {detailProduct.commercial.when_not_to_use && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Quando NÃO indicar</p>
                        <p className="text-sm text-[#374151] whitespace-pre-wrap">{detailProduct.commercial.when_not_to_use}</p>
                      </div>
                    )}
                    {detailProduct.commercial.objections && (
                      <div>
                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-0.5">Objeções comuns</p>
                        <p className="text-sm text-[#374151] whitespace-pre-wrap">{detailProduct.commercial.objections}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {isGestor && (
              <div className="px-5 py-4 border-t border-[#F3F4F6] flex gap-3">
                <button
                  onClick={() => { closeDetail(); openCommercialForm(detailProduct) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#6366F1] hover:text-[#4F46E5] border border-[#6366F1] rounded-lg transition-colors">
                  <Edit2 size={14} /> Editar dados comerciais
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Commercial Form (gestor only) ── */}
      {commercialProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={closeCommercial}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-sm font-semibold text-[#111827]">
                  Dados comerciais — {commercialProduct.title}
                </h3>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Complementa o conteúdo já cadastrado na Knowledge Base. Não substitui.
                </p>
              </div>
              <button onClick={closeCommercial}
                className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors ml-3 flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Form fields */}
            <div className="px-5 py-5 space-y-4">

              {/* 1. ICP */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">ICP recomendado</label>
                <textarea value={commercialForm.icp}
                  onChange={e => setCommercialForm(f => ({ ...f, icp: e.target.value }))}
                  rows={2}
                  placeholder="Quem é o lead ideal para este produto?"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 2. Pitch */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Pitch de venda — 30 segundos</label>
                <textarea value={commercialForm.pitch}
                  onChange={e => setCommercialForm(f => ({ ...f, pitch: e.target.value }))}
                  rows={3}
                  placeholder="Script direto para uso na call..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 3. Preço */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Preço de referência</label>
                <input value={commercialForm.price}
                  onChange={e => setCommercialForm(f => ({ ...f, price: formatBRL(e.target.value) }))}
                  placeholder="R$ 2.490,00"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 4. Tempo de acesso */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Tempo de acesso</label>
                <input value={commercialForm.access_duration}
                  onChange={e => setCommercialForm(f => ({ ...f, access_duration: e.target.value }))}
                  placeholder="ex: 12 meses · 24 meses · Vitalício"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 5. Condições de pagamento */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Condições de pagamento</label>
                <textarea value={commercialForm.payment_conditions}
                  onChange={e => setCommercialForm(f => ({ ...f, payment_conditions: e.target.value }))}
                  rows={2}
                  placeholder="Parcelamento, bônus, desconto máximo..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 6. Quando indicar */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Quando indicar</label>
                <textarea value={commercialForm.when_to_use}
                  onChange={e => setCommercialForm(f => ({ ...f, when_to_use: e.target.value }))}
                  rows={2}
                  placeholder="Lead a X meses da prova, já tentou Y vezes..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 7. Quando NÃO indicar */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Quando NÃO indicar</label>
                <textarea value={commercialForm.when_not_to_use}
                  onChange={e => setCommercialForm(f => ({ ...f, when_not_to_use: e.target.value }))}
                  rows={2}
                  placeholder="Situações onde este produto não é o ideal..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 8. Objeções */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Objeções comuns e respostas</label>
                <textarea value={commercialForm.objections}
                  onChange={e => setCommercialForm(f => ({ ...f, objections: e.target.value }))}
                  rows={3}
                  placeholder={'"É caro" → Resposta...'}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 9. Copy comercial */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#374151]">Copy comercial</label>
                  <button
                    type="button"
                    onClick={copyCommercialCopy}
                    className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#6366F1] transition-colors">
                    <Copy size={11} /> Copiar
                  </button>
                </div>
                <textarea value={commercialForm.commercial_copy}
                  onChange={e => setCommercialForm(f => ({ ...f, commercial_copy: e.target.value }))}
                  rows={6}
                  placeholder="Texto completo formatado para colar no WhatsApp ou e-mail..."
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* 10. Notas de estratégia */}
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Notas de estratégia</label>
                <textarea value={commercialForm.strategy_notes}
                  onChange={e => setCommercialForm(f => ({ ...f, strategy_notes: e.target.value }))}
                  rows={2}
                  placeholder="Informações internas para o time de vendas..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 px-5 py-4 border-t border-[#F3F4F6] sticky bottom-0 bg-white">
              <button onClick={handleSaveCommercial} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Salvar dados comerciais
              </button>
              <button onClick={closeCommercial}
                className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors">
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
            <p className="text-sm font-medium text-[#111827]">Remover este produto?</p>
            <p className="text-xs text-[#6B7280]">O produto ficará inativo e não aparecerá mais no catálogo nem no RAG.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">
                Remover
              </button>
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2 border border-[#E5E7EB] text-sm text-[#6B7280] rounded-lg transition-colors">
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
