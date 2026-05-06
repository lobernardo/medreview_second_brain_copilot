'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Edit2, Trash2, X, AlertCircle, Loader2, Bot, Phone, FileText, ChevronRight } from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { SkeletonGrid } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'

const VERTICALS = ['R1', 'Anest', 'Oft', 'Ortop']

interface Lead {
  id: string
  user_id: string
  name: string
  vertical: string | null
  product_interest: string | null
  main_objection: string | null
  phone: string | null
  email: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

interface LeadForm {
  name: string
  vertical: string
  product_interest: string
  main_objection: string
  phone: string
  email: string
  notes: string
}

const EMPTY_FORM: LeadForm = {
  name: '', vertical: '', product_interest: '', main_objection: '',
  phone: '', email: '', notes: '',
}

export default function LeadsPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )
  const router = useRouter()

  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [form, setForm] = useState<LeadForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setUserId(user.id)
        const { data } = await supabase
          .from('meus_leads')
          .select('*')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
        setLeads((data ?? []) as Lead[])
      } catch { setLeads([]) } finally { setLoading(false) }
    }
    load()
  }, [supabase])

  function openCreate() {
    setEditingLead(null); setForm(EMPTY_FORM); setSaveError(''); setModalOpen(true)
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead)
    setForm({
      name: lead.name,
      vertical: lead.vertical ?? '',
      product_interest: lead.product_interest ?? '',
      main_objection: lead.main_objection ?? '',
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      notes: lead.notes ?? '',
    })
    setSaveError(''); setModalOpen(true)
  }

  function closeModal() { setModalOpen(false); setEditingLead(null) }

  async function handleSave() {
    if (!form.name.trim()) { setSaveError('Nome é obrigatório.'); return }
    if (!userId) return
    setSaving(true); setSaveError('')
    try {
      const payload = {
        name: form.name.trim(),
        vertical: form.vertical || null,
        product_interest: form.product_interest || null,
        main_objection: form.main_objection || null,
        phone: form.phone || null,
        email: form.email || null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      }
      if (editingLead) {
        await supabase.from('meus_leads').update(payload).eq('id', editingLead.id)
        setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...editingLead, ...payload } : l))
      } else {
        const full = { ...payload, user_id: userId }
        const { data, error } = await supabase.from('meus_leads').insert(full).select('*').single()
        if (error) throw error
        setLeads(prev => [data as Lead, ...prev])
      }
      closeModal()
      setToast({ type: 'success', message: editingLead ? 'Lead atualizado.' : 'Lead adicionado.' })
    } catch { setSaveError('Erro ao salvar. Tente novamente.') } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    try {
      await supabase.from('meus_leads').delete().eq('id', id)
      setLeads(prev => prev.filter(l => l.id !== id))
      setToast({ type: 'success', message: 'Lead removido.' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao remover lead.' })
    }
    setConfirmDeleteId(null)
  }

  function handleDiagnose(lead: Lead) {
    const params = new URLSearchParams()
    params.set('lead', lead.name)
    if (lead.vertical) params.set('vertical', lead.vertical)
    if (lead.product_interest) params.set('produto', lead.product_interest)
    if (lead.main_objection) params.set('objecao', lead.main_objection)
    router.push(`/copilot-vendas?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">No Radar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bloco de notas pessoal dos seus leads</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.01]"
          style={{ background: '#6366F1' }}
        >
          <Plus size={16} /> Novo Lead
        </button>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {loading ? (
        <SkeletonGrid count={6} />
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#EEF2FF' }}>
            <FileText size={22} style={{ color: '#6366F1' }} />
          </div>
          <p className="text-gray-700 font-medium">Nenhum lead anotado ainda.</p>
          <p className="text-sm text-gray-400 mt-1">Adicione leads para ter um diagnóstico rápido no copilot.</p>
          <button onClick={openCreate} className="mt-4 text-indigo-600 text-sm hover:underline">
            Adicionar primeiro lead
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {leads.map(lead => (
            <div
              key={lead.id}
              className="bg-white border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow"
              style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{lead.name}</h3>
                  {lead.vertical && <div className="mt-1"><VerticalBadge vertical={lead.vertical} /></div>}
                </div>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => openEdit(lead)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  {confirmDeleteId === lead.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(lead.id)} className="px-2 py-0.5 text-[11px] text-white rounded font-medium" style={{ background: '#EF4444' }}>Sim</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={12} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(lead.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {lead.product_interest && (
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-600">
                    <span className="text-gray-400 flex-shrink-0">Produto:</span>
                    <span className="truncate">{lead.product_interest}</span>
                  </div>
                )}
                {lead.main_objection && (
                  <div className="flex items-start gap-1.5 text-[12px]">
                    <span className="text-gray-400 flex-shrink-0 mt-0.5">Objeção:</span>
                    <span className="font-medium line-clamp-1" style={{ color: '#F97316' }}>{lead.main_objection}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                    <Phone size={11} className="text-gray-400 flex-shrink-0" />
                    <span>{lead.phone}</span>
                  </div>
                )}
              </div>

              {lead.notes && (
                <p className="text-[12px] text-gray-400 leading-relaxed line-clamp-2 border-t pt-2.5" style={{ borderColor: '#F3F4F6' }}>
                  {lead.notes}
                </p>
              )}

              <button
                onClick={() => handleDiagnose(lead)}
                className="mt-auto flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-medium transition-all hover:scale-[1.01]"
                style={{ background: '#EEF2FF', color: '#6366F1' }}
              >
                <Bot size={13} />
                Diagnóstico no Copilot
                <ChevronRight size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">{editingLead ? 'Editar lead' : 'Novo lead'}</h2>
              <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} />{saveError}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome *</label>
                <input
                  type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do lead…"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical</label>
                  <select
                    value={form.vertical} onChange={e => setForm(p => ({ ...p, vertical: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
                    style={{ borderColor: '#E5E7EB' }}
                  >
                    <option value="">Selecionar…</option>
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</label>
                  <input
                    type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="(11) 9xxxx-xxxx"
                    className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
                    style={{ borderColor: '#E5E7EB' }}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail</label>
                <input
                  type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Produto de interesse</label>
                <input
                  type="text" value={form.product_interest} onChange={e => setForm(p => ({ ...p, product_interest: e.target.value }))}
                  placeholder="Ex: Mentoria R1 intensiva…"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Objeção principal</label>
                <input
                  type="text" value={form.main_objection} onChange={e => setForm(p => ({ ...p, main_objection: e.target.value }))}
                  placeholder="Ex: Preço muito alto…"
                  className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas</label>
                <textarea
                  value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Contexto do lead, histórico, próximos passos…"
                  rows={4}
                  className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
                  style={{ borderColor: '#E5E7EB' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: '#E5E7EB' }}>
              <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 border rounded-lg hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                Cancelar
              </button>
              <button
                onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-60"
                style={{ background: '#6366F1' }}
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Salvando…</>
                  : (editingLead ? 'Salvar alterações' : 'Adicionar lead')
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
