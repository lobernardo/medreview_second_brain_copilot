'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  VERTICAL_CONFIG, EVENT_TYPE_CONFIG, EVENT_TYPE_LABELS,
  RESULT_CONFIG, VERTICALS, EVENT_TYPES, LEAD_STAGES, RESULTS,
} from '@/lib/utils/constants'
import { X, ChevronDown, Filter, ClipboardList } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { VerticalBadge, EventBadge, ResultBadge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyLog {
  id: string
  created_at: string
  user_id: string
  lead_name: string
  lead_email: string | null
  lead_phone: string | null
  vertical: string
  lead_stage: string | null
  event_type: string
  description: string | null
  objection_topic: string | null
  response_used: string | null
  result: string | null
  product_discussed: string | null
  notes: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#F3F4F6] rounded-md ${className ?? ''}`} />
}

// ─── Inline Dialog ────────────────────────────────────────────────────────────

function Dialog({
  open, onClose, title, children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-lg max-h-[90vh] overflow-y-auto sm:rounded-[12px] rounded-t-[16px]"
        style={{ border: '1px solid #E5E7EB', boxShadow: '0 20px 40px rgba(0,0,0,0.14)' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] sticky top-0 bg-white">
          <h3 className="font-semibold text-[#111827]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ─── Log Detail ───────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value && value !== 0) return null
  return (
    <div className="py-2.5 border-b border-[#F3F4F6] last:border-0">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1">{label}</p>
      <div className="text-sm text-[#111827]">{value}</div>
    </div>
  )
}

function LogDetail({ log }: { log: DailyLog }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <EventBadge eventType={log.event_type} />
        {log.result && <ResultBadge result={log.result} />}
        {log.vertical && <VerticalBadge vertical={log.vertical} />}
      </div>
      <DetailRow label="Lead" value={log.lead_name} />
      {log.lead_email && <DetailRow label="E-mail" value={log.lead_email} />}
      {log.lead_phone && <DetailRow label="Telefone" value={log.lead_phone} />}
      {log.lead_stage && <DetailRow label="Estágio" value={log.lead_stage} />}
      {log.description && <DetailRow label="Descrição" value={log.description} />}
      {log.objection_topic && <DetailRow label="Objeção" value={log.objection_topic} />}
      {log.response_used && <DetailRow label="Resposta usada" value={log.response_used} />}
      {log.product_discussed && <DetailRow label="Produto discutido" value={log.product_discussed} />}
      {log.notes && <DetailRow label="Notas" value={log.notes} />}
      <DetailRow label="Data" value={formatDate(log.created_at)} />
    </div>
  )
}

// ─── Form state ───────────────────────────────────────────────────────────────

const EMPTY: Record<string, string> = {
  lead_name: '', lead_email: '', lead_phone: '',
  vertical: '', lead_stage: '', event_type: '', description: '',
  objection_topic: '', response_used: '', result: '',
  product_discussed: '', notes: '',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LogsClient({ userId }: { userId?: string }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [selectedLog, setSelectedLog] = useState<DailyLog | null>(null)

  const [filterVertical, setFilterVertical] = useState('')
  const [filterEventType, setFilterEventType] = useState('')
  const [filterDate, setFilterDate] = useState('')

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function handleEventTypeChange(value: string) {
    setForm(f => ({
      ...f,
      event_type: value,
      objection_topic: '', response_used: '', result: '',
      product_discussed: '', notes: '',
    }))
  }

  async function fetchLogs() {
    setLoadingLogs(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setLogs(data ?? [])
    } catch {
      setLogs([])
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  // ── Validation ─────────────────────────────────────────────────────────────

  function validate() {
    const errs: Record<string, string> = {}
    if (!form.lead_name.trim()) errs.lead_name = 'Obrigatório'
    if (!form.vertical) errs.vertical = 'Obrigatório'
    if (!form.event_type) errs.event_type = 'Obrigatório'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      const supabase = createClient()
      let uid = userId
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession()
        uid = session?.user.id
      }
      const payload: Record<string, string | null> = {
        user_id: uid ?? null,
        lead_name: form.lead_name.trim(),
        lead_email: form.lead_email.trim() || null,
        lead_phone: form.lead_phone.trim() || null,
        vertical: form.vertical,
        lead_stage: form.lead_stage || null,
        event_type: form.event_type,
        description: form.description.trim() || null,
      }
      if (form.event_type === 'objeção') {
        payload.objection_topic = form.objection_topic.trim() || null
        payload.response_used = form.response_used.trim() || null
        payload.result = form.result || null
      }
      if (form.event_type === 'win') {
        payload.product_discussed = form.product_discussed.trim() || null
        payload.notes = form.notes.trim() || null
        payload.result = 'win'
      }
      if (form.event_type === 'loss') {
        payload.notes = form.notes.trim() || null
        payload.result = 'loss'
      }
      const { error } = await supabase.from('daily_logs').insert(payload)
      if (error) throw error
      showToast('success', 'Registro salvo com sucesso!')
      setForm(EMPTY)
      setErrors({})
      fetchLogs()
    } catch {
      showToast('error', 'Erro ao salvar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Filtered logs ──────────────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (filterVertical && log.vertical !== filterVertical) return false
      if (filterEventType && log.event_type !== filterEventType) return false
      if (filterDate && !log.created_at.startsWith(filterDate)) return false
      return true
    })
  }, [logs, filterVertical, filterEventType, filterDate])

  const hasFilters = filterVertical || filterEventType || filterDate

  // ── Styling constants ──────────────────────────────────────────────────────

  const cardCls = 'bg-white rounded-[12px]'
  const cardStyle = { border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
  const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/10 transition-colors bg-white'
  const inputErrCls = 'w-full px-3 py-2 text-sm border border-[#EF4444] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#EF4444] focus:ring-2 focus:ring-[#EF4444]/10 transition-colors bg-white'
  const labelCls = 'block text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1.5'

  function inp(key: string) { return errors[key] ? inputErrCls : inputCls }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#111827]">Novo registro</h2>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            Documente uma interação com um lead
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Row 1: lead_name + vertical */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>
                Nome do lead <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={form.lead_name}
                onChange={e => set('lead_name', e.target.value)}
                placeholder="Dr. João Silva"
                className={inp('lead_name')}
              />
              {errors.lead_name && <p className="text-[11px] text-[#EF4444] mt-1">{errors.lead_name}</p>}
            </div>
            <div>
              <label className={labelCls}>
                Vertical <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={form.vertical}
                onChange={e => set('vertical', e.target.value)}
                className={inp('vertical')}
              >
                <option value="">Selecionar...</option>
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              {errors.vertical && <p className="text-[11px] text-[#EF4444] mt-1">{errors.vertical}</p>}
            </div>
          </div>

          {/* Row 2: email + phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                value={form.lead_email}
                onChange={e => set('lead_email', e.target.value)}
                placeholder="joao@clinica.com"
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Telefone / WhatsApp</label>
              <input
                type="text"
                value={form.lead_phone}
                onChange={e => set('lead_phone', e.target.value)}
                placeholder="(11) 9 9999-9999"
                className={inputCls}
              />
            </div>
          </div>

          {/* Row 3: stage + event_type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Estágio do lead</label>
              <select
                value={form.lead_stage}
                onChange={e => set('lead_stage', e.target.value)}
                className={inputCls}
              >
                <option value="">Selecionar...</option>
                {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Tipo de evento <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={form.event_type}
                onChange={e => handleEventTypeChange(e.target.value)}
                className={inp('event_type')}
              >
                <option value="">Selecionar...</option>
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t === 'objeção' ? 'Objeção' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
              {errors.event_type && <p className="text-[11px] text-[#EF4444] mt-1">{errors.event_type}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Descrição</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Descreva o que aconteceu nessa interação..."
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* ── Conditional: objeção ── */}
          {form.event_type === 'objeção' && (
            <div
              className="space-y-4 pt-4 mt-2 border-t border-[#F3F4F6]"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#F59E0B]">
                Detalhes da objeção
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tema da objeção</label>
                  <input
                    type="text"
                    value={form.objection_topic}
                    onChange={e => set('objection_topic', e.target.value)}
                    placeholder="ex: preço, não tenho tempo..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Resultado</label>
                  <select
                    value={form.result}
                    onChange={e => set('result', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecionar...</option>
                    <option value="win">Win — contornou a objeção</option>
                    <option value="loss">Loss — não contornou</option>
                    <option value="open">Em aberto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Resposta usada</label>
                <textarea
                  value={form.response_used}
                  onChange={e => set('response_used', e.target.value)}
                  placeholder="O que você respondeu ao lead?"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}

          {/* ── Conditional: win ── */}
          {form.event_type === 'win' && (
            <div className="space-y-4 pt-4 mt-2 border-t border-[#F3F4F6]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#10B981]">
                Detalhes do win
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Produto / Solução</label>
                  <input
                    type="text"
                    value={form.product_discussed}
                    onChange={e => set('product_discussed', e.target.value)}
                    placeholder="ex: Residência R1, Anestesia..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Notas</label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                    placeholder="Algo importante para registrar"
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Conditional: loss ── */}
          {form.event_type === 'loss' && (
            <div className="space-y-4 pt-4 mt-2 border-t border-[#F3F4F6]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#EF4444]">
                Detalhes da perda
              </p>
              <div>
                <label className={labelCls}>Motivo da perda</label>
                <textarea
                  value={form.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="Por que você perdeu esse lead?"
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-sm font-medium text-white rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#6366F1' }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#4F46E5' }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#6366F1' }}
            >
              {submitting ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Histórico ──────────────────────────────────────────────────────── */}
      <div className={cardCls} style={cardStyle}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-[#6B7280]" />
            <span className="font-semibold text-[#111827] text-sm">Histórico</span>
            {!loadingLogs && (
              <span className="text-[11px] text-[#9CA3AF]">
                ({filteredLogs.length} {filteredLogs.length === 1 ? 'registro' : 'registros'})
              </span>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterVertical}
              onChange={e => setFilterVertical(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg text-[#374151] bg-white focus:outline-none focus:border-[#6366F1] transition-colors"
            >
              <option value="">Vertical</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>

            <select
              value={filterEventType}
              onChange={e => setFilterEventType(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg text-[#374151] bg-white focus:outline-none focus:border-[#6366F1] transition-colors"
            >
              <option value="">Tipo</option>
              {EVENT_TYPES.map(t => (
                <option key={t} value={t}>
                  {t === 'objeção' ? 'Objeção' : t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-[#E5E7EB] rounded-lg text-[#374151] bg-white focus:outline-none focus:border-[#6366F1] transition-colors"
            />

            {hasFilters && (
              <button
                onClick={() => { setFilterVertical(''); setFilterEventType(''); setFilterDate('') }}
                className="px-2.5 py-1.5 text-xs text-[#EF4444] bg-[#FEF2F2] border border-[#EF4444]/20 rounded-lg hover:bg-[#FEE2E2] transition-colors flex items-center gap-1"
              >
                <X size={11} /> Limpar
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                {['Data', 'Lead', 'Vertical', 'Tipo', 'Resultado'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#9CA3AF] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F3F4F6]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <Skeleton className={`h-4 ${j === 1 ? 'w-32' : 'w-20'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <ClipboardList size={28} className="text-[#E5E7EB] mx-auto mb-3" />
                    <p className="text-sm text-[#6B7280]">
                      {hasFilters ? 'Nenhum registro com esses filtros.' : 'Nenhum registro ainda. Comece pelo formulário acima.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, i) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors cursor-pointer ${i % 2 === 0 ? '' : ''}`}
                  >
                    <td className="px-5 py-3 text-[12px] text-[#6B7280] whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-5 py-3 font-medium text-[#111827] max-w-[180px]">
                      <span className="truncate block">{log.lead_name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <VerticalBadge vertical={log.vertical} />
                    </td>
                    <td className="px-5 py-3">
                      <EventBadge eventType={log.event_type} />
                    </td>
                    <td className="px-5 py-3">
                      <ResultBadge result={log.result} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Log detail dialog ─────────────────────────────────────────────── */}
      <Dialog
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.lead_name ?? 'Detalhes do registro'}
      >
        {selectedLog && <LogDetail log={selectedLog} />}
      </Dialog>
    </div>
  )
}
