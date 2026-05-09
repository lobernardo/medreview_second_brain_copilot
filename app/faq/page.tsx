'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Check, Edit2, Trash2, X, AlertCircle, Loader2, Search } from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { VERTICALS } from '@/lib/utils/constants'
import { SkeletonList } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'

const STATUS_CFG = {
  rascunho: { color: '#F59E0B', bg: '#FFFBEB', label: 'Rascunho' },
  validado: { color: '#10B981', bg: '#ECFDF5', label: 'Validado' },
}

interface FaqItem {
  id: string
  faq_type: 'interno' | 'cliente'
  question: string
  answer: string
  vertical: string | null
  category: string | null
  created_by: string | null
  created_by_name: string | null
  status: 'rascunho' | 'validado'
  validated_by: string | null
  is_active: boolean
  created_at: string
}

interface FaqForm {
  faq_type: 'interno' | 'cliente'
  question: string
  answer: string
  vertical: string
  category: string
}

const EMPTY_FORM: FaqForm = { faq_type: 'interno', question: '', answer: '', vertical: '', category: '' }

export default function FaqPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  const profile = useProfile()
  const [activeTab, setActiveTab] = useState<'interno' | 'cliente'>('interno')
  const [faqs, setFaqs] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filterVertical, setFilterVertical] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null)
  const [form, setForm] = useState<FaqForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)


  useEffect(() => {
    async function loadFaqs() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('faq_items')
          .select('id,faq_type,question,answer,vertical,category,created_by,created_by_name,status,validated_by,is_active,created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
        setFaqs((data ?? []) as FaqItem[])
      } catch { setFaqs([]) } finally { setLoading(false) }
    }
    loadFaqs()
  }, [supabase])

  const filtered = faqs.filter(f => {
    if (f.faq_type !== activeTab) return false
    if (filterVertical && f.vertical !== filterVertical) return false
    if (filterCategory && !(f.category ?? '').toLowerCase().includes(filterCategory.toLowerCase())) return false
    if (filterStatus && f.status !== filterStatus) return false
    return true
  })

  function openCreate() {
    setEditingFaq(null)
    setForm({ ...EMPTY_FORM, faq_type: activeTab })
    setSaveError('')
    setModalOpen(true)
  }

  function openEdit(faq: FaqItem) {
    setEditingFaq(faq)
    setForm({ faq_type: faq.faq_type, question: faq.question, answer: faq.answer, vertical: faq.vertical ?? '', category: faq.category ?? '' })
    setSaveError('')
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.question.trim() || !form.answer.trim()) { setSaveError('Pergunta e resposta são obrigatórias.'); return }
    setSaving(true); setSaveError('')
    try {
      const payload = {
        faq_type: form.faq_type,
        question: form.question.trim(),
        answer: form.answer.trim(),
        vertical: form.vertical || null,
        category: form.category || null,
        is_active: true,
        updated_at: new Date().toISOString(),
      }
      let savedId: string
      if (editingFaq) {
        const res = await fetch('/api/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingFaq.id, ...payload }),
        })
        if (!res.ok) throw new Error((await res.json()).error)
        savedId = editingFaq.id
        setFaqs(prev => prev.map(f => f.id === editingFaq.id ? { ...f, ...payload } : f))
      } else {
        const full = { ...payload, created_by: profile?.id ?? null, created_by_name: profile?.name ?? null, status: 'rascunho' as const, validated_by: null }
        const res = await fetch('/api/faq', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(full),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json.error)
        savedId = json.data.id
        setFaqs(prev => [{ ...full, id: savedId, created_at: new Date().toISOString() } as FaqItem, ...prev])
      }
      fetch('/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: 'faq_items', id: savedId, content: `${form.question} ${form.answer}` }),
      }).catch(() => {})
      setModalOpen(false)
      setToast({ type: 'success', message: editingFaq ? 'FAQ atualizada.' : 'FAQ criada.' })
    } catch { setSaveError('Erro ao salvar. Tente novamente.') } finally { setSaving(false) }
  }

  async function handleValidate(faq: FaqItem) {
    const newStatus = faq.status === 'validado' ? 'rascunho' : 'validado'
    try {
      const res = await fetch('/api/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: faq.id, status: newStatus, validated_by: newStatus === 'validado' ? profile?.id ?? null : null }),
      })
      if (!res.ok) throw new Error()
      setFaqs(prev => prev.map(f => f.id === faq.id ? { ...f, status: newStatus } : f))
      setToast({ type: 'success', message: newStatus === 'validado' ? 'FAQ validada.' : 'Marcada como rascunho.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao atualizar status.' })
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch('/api/faq', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error()
      setFaqs(prev => prev.filter(f => f.id !== id))
      setToast({ type: 'success', message: 'FAQ removida.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao remover FAQ.' })
    }
    setConfirmDeleteId(null)
  }

  const isGestor = profile?.role === 'gestor'
  const canCreate = profile?.role === 'closer' || profile?.role === 'gestor'

  const TABS = [
    { id: 'interno' as const, label: 'Comercial', count: faqs.filter(f => f.faq_type === 'interno').length },
    { id: 'cliente' as const, label: 'Clientes', count: faqs.filter(f => f.faq_type === 'cliente').length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">FAQ</h1>
          <p className="text-sm text-gray-500 mt-0.5">{faqs.filter(f => f.status === 'validado').length} validadas · {faqs.filter(f => f.status === 'rascunho').length} rascunhos</p>
        </div>
        {canCreate && (
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.01]" style={{ background: '#6366F1' }}>
            <Plus size={16} /> Nova FAQ
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b gap-6" style={{ borderColor: '#E5E7EB' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1.5 ${activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
            {tab.count > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium" style={activeTab === tab.id ? { background: '#EEF2FF', color: '#6366F1' } : { background: '#F3F4F6', color: '#6B7280' }}>{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} placeholder="Filtrar por categoria…" className="pl-9 pr-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none bg-white" style={{ borderColor: '#E5E7EB', minWidth: '190px' }} />
        </div>
        <select value={filterVertical} onChange={(e) => setFilterVertical(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white" style={{ borderColor: '#E5E7EB' }}>
          <option value="">Todas as verticais</option>
          {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white" style={{ borderColor: '#E5E7EB' }}>
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="validado">Validado</option>
        </select>
        {(filterCategory || filterVertical || filterStatus) && (
          <button onClick={() => { setFilterCategory(''); setFilterVertical(''); setFilterStatus('') }} className="px-3 py-2 border rounded-lg text-sm text-gray-500 hover:bg-gray-50 bg-white" style={{ borderColor: '#E5E7EB' }}>Limpar</button>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {loading && <SkeletonList count={5} />}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-500 text-sm">Nenhuma FAQ encontrada.</p>
          {canCreate && <button onClick={openCreate} className="mt-3 text-indigo-600 text-sm hover:underline">Criar primeira FAQ</button>}
        </div>
      )}

      {!loading && (
        <div className="space-y-3">
          {filtered.map(faq => {
            const sts = STATUS_CFG[faq.status]
            return (
              <div key={faq.id} className="bg-white border rounded-xl p-4 space-y-2 hover:shadow-sm transition-shadow" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 leading-snug">{faq.question}</p>
                    <p className="text-[12px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">{faq.answer}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium" style={{ color: sts.color, background: sts.bg }}>{sts.label}</span>
                    {isGestor && (
                      <button onClick={() => handleValidate(faq)} title={faq.status === 'validado' ? 'Remover validação' : 'Validar'} className={`p-1.5 rounded-lg transition-colors ${faq.status === 'validado' ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}>
                        <Check size={14} />
                      </button>
                    )}
                    {(isGestor || faq.created_by === profile?.id) && (
                      <button onClick={() => openEdit(faq)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={13} /></button>
                    )}
                    {(isGestor || faq.created_by === profile?.id) && (
                      confirmDeleteId === faq.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDelete(faq.id)} className="px-2 py-0.5 text-[11px] text-white rounded font-medium" style={{ background: '#EF4444' }}>Sim</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteId(faq.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {faq.vertical && <VerticalBadge vertical={faq.vertical} />}
                  {faq.category && <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{faq.category}</span>}
                  {faq.created_by_name && <span className="text-[11px] text-gray-400">{faq.created_by_name}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">{editingFaq ? 'Editar FAQ' : 'Nova FAQ'}</h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {saveError && <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertCircle size={14} />{saveError}</div>}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo *</label>
                <div className="flex gap-2">
                  {(['interno', 'cliente'] as const).map(t => (
                    <button key={t} onClick={() => setForm(p => ({ ...p, faq_type: t }))} className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.faq_type === t ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {t === 'interno' ? 'Comercial' : 'Clientes'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pergunta *</label>
                <input type="text" value={form.question} onChange={(e) => setForm(p => ({ ...p, question: e.target.value }))} placeholder="Ex: Como funciona o acesso à plataforma?" className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resposta *</label>
                <textarea value={form.answer} onChange={(e) => setForm(p => ({ ...p, answer: e.target.value }))} placeholder="Resposta completa…" rows={5} className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none resize-none" style={{ borderColor: '#E5E7EB' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical</label>
                  <select value={form.vertical} onChange={(e) => setForm(p => ({ ...p, vertical: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white" style={{ borderColor: '#E5E7EB' }}>
                    <option value="">Todas</option>
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Categoria</label>
                  <input type="text" value={form.category} onChange={(e) => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Ex: preço, acesso…" className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none" style={{ borderColor: '#E5E7EB' }} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50" style={{ borderColor: '#E5E7EB' }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60" style={{ background: '#6366F1' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando…</> : (editingFaq ? 'Salvar' : 'Criar FAQ')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
