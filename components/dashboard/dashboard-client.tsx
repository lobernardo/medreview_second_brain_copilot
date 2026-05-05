'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { VERTICAL_CONFIG, VERTICALS, EVENT_TYPES } from '@/lib/utils/constants'
import {
  MessageSquare, TrendingUp, TrendingDown, Clock,
  Flame, ChevronRight, Target, CheckCircle2, XCircle, X,
} from 'lucide-react'
import { Toast } from '@/components/ui/toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyStats {
  total: string | number | null
  conversas: string | number | null
  wins: string | number | null
  losses: string | number | null
  objecoes: string | number | null
  em_aberto: string | number | null
}

interface HotLead {
  id: string
  name: string
  vertical: string | null
  stage: string | null
  next_action: string | null
  next_action_date: string | null
}

interface TrendingObjection {
  objection_topic: string
  qtd: string | number
  wins: string | number
  losses: string | number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(v: string | number | null | undefined) {
  return Number(v ?? 0)
}

function VerticalBadge({ vertical }: { vertical: string | null }) {
  if (!vertical) return null
  const cfg = VERTICAL_CONFIG[vertical] ?? { color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {vertical}
    </span>
  )
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#F3F4F6] rounded-md ${className ?? ''}`} />
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, loading,
}: {
  label: string
  value: number
  icon: React.ReactNode
  loading: boolean
}) {
  return (
    <div
      className="bg-white p-5 rounded-[12px]"
      style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-14" />
        </div>
      ) : (
        <>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-2">
            {label}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-[28px] font-semibold text-[#111827] leading-none">{value}</span>
            <span className="opacity-60">{icon}</span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

const EMPTY_QUICK = { lead_name: '', vertical: '', event_type: '', description: '' }

export default function DashboardClient({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<WeeklyStats | null>(null)
  const [leads, setLeads] = useState<HotLead[]>([])
  const [objections, setObjections] = useState<TrendingObjection[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [loadingObjs, setLoadingObjs] = useState(true)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [form, setForm] = useState(EMPTY_QUICK)
  const [submitting, setSubmitting] = useState(false)

  function showToast(type: 'success' | 'error', message: string) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────

  async function fetchStats() {
    setLoadingStats(true)
    try {
      const supabase = createClient()
      const { data } = await supabase.from('weekly_stats').select('*').single()
      setStats(data ?? null)
    } catch {
      /* noop */
    } finally {
      setLoadingStats(false)
    }
  }

  async function fetchLeads() {
    setLoadingLeads(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('hot_leads')
        .select('id, name, vertical, stage, next_action, next_action_date')
        .not('stage', 'in', '("Closed-Won","Closed-Lost")')
        .order('next_action_date', { ascending: true, nullsFirst: false })
        .limit(5)
      setLeads(data ?? [])
    } catch {
      setLeads([])
    } finally {
      setLoadingLeads(false)
    }
  }

  async function fetchObjections() {
    setLoadingObjs(true)
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('trending_objections')
        .select('*')
        .limit(5)
      setObjections(data ?? [])
    } catch {
      setObjections([])
    } finally {
      setLoadingObjs(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchLeads()
    fetchObjections()
  }, [])

  // ── Quick log submit ───────────────────────────────────────────────────────

  async function handleQuickLog(e: React.FormEvent) {
    e.preventDefault()
    if (!form.lead_name.trim() || !form.vertical || !form.event_type) {
      showToast('error', 'Preencha os campos obrigatórios.')
      return
    }
    setSubmitting(true)
    try {
      const supabase = createClient()
      let uid = userId
      if (!uid) {
        const { data: { session } } = await supabase.auth.getSession()
        uid = session?.user.id
      }
      const { error } = await supabase.from('daily_logs').insert({
        user_id: uid,
        lead_name: form.lead_name.trim(),
        vertical: form.vertical,
        event_type: form.event_type,
        description: form.description.trim() || null,
      })
      if (error) throw error
      showToast('success', 'Log salvo com sucesso!')
      setForm(EMPTY_QUICK)
      fetchStats()
    } catch {
      showToast('error', 'Erro ao salvar. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const cardCls = 'bg-white rounded-[12px] overflow-hidden'
  const cardStyle = { border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }
  const inputCls = 'w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#6366F1]/10 transition-colors bg-white'
  const labelCls = 'block text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1.5'

  return (
    <div className="space-y-5">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* ── Esta semana ─────────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
          Esta semana
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Conversas"
            value={n(stats?.conversas)}
            loading={loadingStats}
            icon={<MessageSquare size={20} style={{ color: '#6366F1' }} />}
          />
          <StatCard
            label="Wins"
            value={n(stats?.wins)}
            loading={loadingStats}
            icon={<TrendingUp size={20} style={{ color: '#10B981' }} />}
          />
          <StatCard
            label="Losses"
            value={n(stats?.losses)}
            loading={loadingStats}
            icon={<TrendingDown size={20} style={{ color: '#EF4444' }} />}
          />
          <StatCard
            label="Em aberto"
            value={n(stats?.em_aberto)}
            loading={loadingStats}
            icon={<Clock size={20} style={{ color: '#F59E0B' }} />}
          />
        </div>
      </div>

      {/* ── Leads + Objeções ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

        {/* Hot Leads */}
        <div className={cardCls} style={cardStyle}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2">
              <Flame size={15} className="text-[#EF4444]" />
              <span className="font-semibold text-[#111827] text-sm">Leads quentes</span>
            </div>
            <Link
              href="/leads"
              className="text-xs text-[#6366F1] hover:text-[#4F46E5] font-medium flex items-center gap-0.5 transition-colors"
            >
              Ver todos <ChevronRight size={11} />
            </Link>
          </div>

          {loadingLeads ? (
            <div className="px-5 py-4 space-y-3.5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <Flame size={28} className="text-[#E5E7EB] mb-3" />
              <p className="text-sm text-[#6B7280] mb-2">
                Nenhum lead cadastrado.
              </p>
              <Link href="/leads" className="text-sm text-[#6366F1] font-medium hover:underline">
                Ir para Leads quentes →
              </Link>
            </div>
          ) : (
            leads.map((lead, i) => (
              <div
                key={lead.id}
                className={`flex items-center gap-3 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors ${i < leads.length - 1 ? 'border-b border-[#F3F4F6]' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{lead.name}</p>
                  {lead.next_action && (
                    <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">{lead.next_action}</p>
                  )}
                </div>
                {lead.vertical && <VerticalBadge vertical={lead.vertical} />}
                {lead.stage && (
                  <span className="text-[11px] text-[#6B7280] whitespace-nowrap">{lead.stage}</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Trending Objections */}
        <div className={cardCls} style={cardStyle}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB]">
            <Target size={15} className="text-[#F59E0B]" />
            <span className="font-semibold text-[#111827] text-sm">Objeções trending</span>
            <span className="text-[11px] text-[#9CA3AF] ml-auto">esta semana</span>
          </div>

          {loadingObjs ? (
            <div className="px-5 py-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ) : objections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-5">
              <Target size={28} className="text-[#E5E7EB] mb-3" />
              <p className="text-sm text-[#6B7280]">
                Sem objeções registradas esta semana.
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-1">
              {objections.map((obj, i) => {
                const total = n(obj.qtd)
                const wins = n(obj.wins)
                const winRate = total > 0 ? Math.round((wins / total) * 100) : 0
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#111827] truncate">{obj.objection_topic}</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {wins}W · {n(obj.losses)}L
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#111827]">{total}×</p>
                      <p
                        className="text-[11px] font-medium"
                        style={{ color: winRate >= 50 ? '#10B981' : '#EF4444' }}
                      >
                        {winRate}% win
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Registro rápido ───────────────────────────────────────────────── */}
      <div className={cardCls} style={{ ...cardStyle, overflow: 'visible' }}>
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-semibold text-[#111827] text-sm">Registro rápido</h2>
          <p className="text-[12px] text-[#9CA3AF] mt-0.5">
            Registre uma interação em segundos — form completo em{' '}
            <Link href="/logs" className="text-[#6366F1] hover:underline">Logs</Link>
          </p>
        </div>

        <form onSubmit={handleQuickLog} className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className={labelCls}>
                Lead <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={form.lead_name}
                onChange={e => setForm(f => ({ ...f, lead_name: e.target.value }))}
                placeholder="Nome do lead"
                className={inputCls}
              />
            </div>

            <div>
              <label className={labelCls}>
                Vertical <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={form.vertical}
                onChange={e => setForm(f => ({ ...f, vertical: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecionar...</option>
                {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>
                Tipo <span className="text-[#EF4444]">*</span>
              </label>
              <select
                value={form.event_type}
                onChange={e => setForm(f => ({ ...f, event_type: e.target.value }))}
                className={inputCls}
              >
                <option value="">Selecionar...</option>
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>
                    {t === 'objeção' ? 'Objeção' : t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className={labelCls}>Descrição</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="O que aconteceu? (opcional)"
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: '#6366F1' }}
              onMouseEnter={e => { if (!submitting) (e.currentTarget.style.background = '#4F46E5') }}
              onMouseLeave={e => { if (!submitting) (e.currentTarget.style.background = '#6366F1') }}
            >
              {submitting ? 'Salvando...' : 'Salvar registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
