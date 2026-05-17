'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Bot, GraduationCap, NotebookPen, Mail, HelpCircle, BookOpen,
  MessageSquareText, Trophy, Package, Calendar, ChevronRight,
  AlertTriangle, TrendingUp, Clock, Lightbulb,
} from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { useProfile } from '@/lib/context/profile-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamDate {
  id: string; vertical: string; name: string; exam_date: string
  registration_start: string | null; registration_end: string | null
}

interface CompanyEvent {
  id: string; type: string; title: string; event_date: string
  verticals: string[]; description: string | null
}

interface CommercialAlert {
  type: 'urgencia' | 'inscricao' | 'oportunidade'
  message: string
  key: string
}

interface KbTip {
  id: string
  title: string
  content: string
}

type Role = 'closer' | 'gestor' | 'onboarding'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-'); return `${d}/${m}/${y}`
}

function greeting(name: string): string {
  const h = new Date().getHours()
  const g = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  return `${g}, ${name.split(' ')[0]}`
}

function todayLabel(): string {
  const DAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
  const d = new Date()
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  lançamento: '#6366F1', campanha: '#8B5CF6',
  evento: '#06B6D4', deadline: '#EF4444', outro: '#9CA3AF',
}

// Fixed mapping: vertical → product to suggest in the home
const VERTICAL_PRODUCT: Record<string, string> = {
  R1: 'R1 Extensive',
  Anest: 'Extensive Anest',
  Oft: 'Extensive Oft',
  Ortop: 'Extensive Ortop',
}

const ALERT_STYLE = {
  urgencia:    { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', Icon: AlertTriangle },
  inscricao:   { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', Icon: Clock },
  oportunidade:{ color: '#6366F1', bg: '#EEF2FF', border: '#C7D2FE', Icon: TrendingUp },
}

function buildAlerts(exams: ExamDate[]): CommercialAlert[] {
  const alerts: CommercialAlert[] = []

  for (const exam of exams) {
    const days = daysUntil(exam.exam_date)
    if (days < 0) continue

    const product = VERTICAL_PRODUCT[exam.vertical] ?? `preparação ${exam.vertical}`

    // Inscriptions closing soon — highest priority for this exam
    if (exam.registration_end) {
      const regDays = daysUntil(exam.registration_end)
      if (regDays >= 0 && regDays <= 10) {
        alerts.push({
          type: 'inscricao',
          message: `Inscrições do ${exam.name} fecham ${regDays === 0 ? 'hoje' : `em ${regDays} dias`} — último momento pra converter indecisos ${exam.vertical}`,
          key: `reg-${exam.id}`,
        })
        continue
      }
    }

    if (days <= 30) {
      alerts.push({
        type: 'urgencia',
        message: `${exam.name} em ${days} dias — leads ${exam.vertical} estão no pico de urgência`,
        key: `urg-${exam.id}`,
      })
    } else if (days <= 90) {
      alerts.push({
        type: 'oportunidade',
        message: `${exam.name} em ${days} dias — bom momento pra oferecer ${product} para indecisos`,
        key: `op-${exam.id}`,
      })
    }

    if (alerts.length === 4) break
  }

  return alerts
}

// ─── Quick actions per role ────────────────────────────────────────────────────

const QUICK_ACTIONS: Record<Role, { href: string; label: string; desc: string; icon: React.ElementType }[]> = {
  closer: [
    { href: '/copilot-vendas',  label: 'Copilot Vendas',  desc: 'IA para objeções e propostas', icon: Bot },
    { href: '/copys',           label: 'Copys',           desc: 'Mensagens prontas para uso',   icon: Mail },
    { href: '/leads',           label: 'No Radar',        desc: 'Acompanhe seus leads',         icon: NotebookPen },
    { href: '/templates',       label: 'Templates',       desc: 'WhatsApp templates rápidos',   icon: MessageSquareText },
  ],
  gestor: [
    { href: '/copilot-vendas',     label: 'Copilot Vendas',     desc: 'IA comercial do time',           icon: Bot },
    { href: '/copilot-onboarding', label: 'Copilot Onboarding', desc: 'Trilha para novos colaboradores', icon: GraduationCap },
    { href: '/leads',              label: 'No Radar',           desc: 'Radar de leads',                 icon: NotebookPen },
    { href: '/produtos',           label: 'Catálogo',           desc: 'Produtos e ofertas',             icon: Package },
  ],
  onboarding: [
    { href: '/copilot-onboarding', label: 'Copilot Onboarding', desc: 'Sua trilha de aprendizado', icon: GraduationCap },
    { href: '/faq',                label: 'FAQ',                desc: 'Dúvidas frequentes',        icon: HelpCircle },
    { href: '/kb',                 label: 'Knowledge Base',     desc: 'Documentação interna',      icon: BookOpen },
    { href: '/verdadeiro-valor',   label: 'Verdadeiro Valor',   desc: 'Diferenciais da Med-Review',icon: Trophy },
  ],
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const profile = useProfile()
  const role = (profile?.role ?? 'closer') as Role

  const [exams, setExams] = useState<ExamDate[]>([])
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [loaded, setLoaded] = useState(false)
  const [tip, setTip] = useState<KbTip | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/exam-dates').then(r => r.json()).then(j => setExams(j.data ?? [])).catch(() => {}),
      fetch('/api/events').then(r => r.json()).then(j => setEvents(j.data ?? [])).catch(() => {}),
      fetch('/api/dica-do-dia').then(r => r.json()).then(j => setTip(j.data ?? null)).catch(() => {}),
    ]).finally(() => setLoaded(true))
  }, [])

  // Next 7 days (this week)
  const weekEvents = useMemo(
    () => events.filter(e => { const d = daysUntil(e.event_date); return d >= 0 && d <= 7 }).slice(0, 6),
    [events],
  )

  // Days 8-30 (rest of month)
  const monthEvents = useMemo(
    () => events.filter(e => { const d = daysUntil(e.event_date); return d > 7 && d <= 30 }).slice(0, 8),
    [events],
  )

  // Alerts from all qualifying exams
  const alerts = useMemo(
    () => role !== 'onboarding' ? buildAlerts(exams.filter(e => daysUntil(e.exam_date) >= 0)) : [],
    [exams, role],
  )

  // Next 5 upcoming exams (any distance)
  const upcomingExams = useMemo(
    () => exams.filter(e => daysUntil(e.exam_date) >= 0).slice(0, 5),
    [exams],
  )

  const quickActions = QUICK_ACTIONS[role]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">

      {/* ── Greeting ── */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl px-6 py-5 flex items-center justify-between shadow-sm">
        <div>
          {profile?.name ? (
            <h1 className="text-xl font-bold text-[#111827]">{greeting(profile.name)}</h1>
          ) : (
            <div className="h-7 w-48 bg-[#F3F4F6] rounded animate-pulse" />
          )}
          <p className="text-sm text-[#9CA3AF] mt-0.5">{todayLabel()}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            {profile?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        </div>
      </div>

      {/* ── Insight do Dia ── */}
      {loaded && tip && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#FEF3C7' }}>
              <Lightbulb size={14} style={{ color: '#D97706' }} strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-[#111827]">Insight do Dia</span>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mb-1.5 font-medium truncate">{tip.title}</p>
          <p className="text-sm text-[#374151] leading-relaxed">{tip.content}</p>
        </div>
      )}

      {/* ── Alertas Comerciais ── */}
      {loaded && alerts.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={16} className="text-[#6366F1]" strokeWidth={1.5} />
            <span className="text-sm font-semibold text-[#111827]">Alertas Comerciais</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {alerts.map(alert => {
              const s = ALERT_STYLE[alert.type]
              const Icon = s.Icon
              return (
                <div key={alert.key}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 border"
                  style={{ background: s.bg, borderColor: s.border }}
                >
                  <Icon size={14} className="flex-shrink-0 mt-0.5" style={{ color: s.color }} strokeWidth={2} />
                  <p className="text-xs leading-relaxed" style={{ color: s.color }}>{alert.message}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Próximas Provas ── */}
      {loaded && upcomingExams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <GraduationCap size={16} className="text-[#6366F1]" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-[#111827]">Próximas Provas</span>
            </div>
            <Link href="/agenda" className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors">
              Ver agenda <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {upcomingExams.map(exam => {
              const days = daysUntil(exam.exam_date)
              const countdownColor = days <= 30 ? '#EF4444' : days <= 60 ? '#F59E0B' : '#10B981'
              const countdownBg   = days <= 30 ? '#FEF2F2' : days <= 60 ? '#FFFBEB' : '#ECFDF5'
              return (
                <div key={exam.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-center gap-3">
                  <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
                    style={{ background: countdownBg }}>
                    <span className="text-lg font-bold leading-none" style={{ color: countdownColor }}>{days}</span>
                    <span className="text-[10px] font-medium mt-0.5" style={{ color: countdownColor }}>dias</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#111827] leading-snug truncate">{exam.name}</p>
                    <p className="text-[11px] text-[#9CA3AF] mt-0.5">{fmtDate(exam.exam_date)}</p>
                    <div className="mt-1">
                      <VerticalBadge vertical={exam.vertical} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Esta semana (7 dias) ── */}
      {loaded && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} className="text-[#6366F1]" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-[#111827]">Esta semana</span>
            </div>
            <Link href="/agenda" className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors">
              Ver agenda <ChevronRight size={12} />
            </Link>
          </div>
          {weekEvents.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-4 py-5 text-center">
              <p className="text-xs text-[#9CA3AF]">Nenhum evento esta semana</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {weekEvents.map(ev => {
                const days = daysUntil(ev.event_date)
                const typeColor = EVENT_TYPE_COLOR[ev.type] ?? '#9CA3AF'
                return (
                  <div key={ev.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 text-center pt-0.5">
                      <div className="text-xs font-bold text-[#111827]">{days === 0 ? 'Hoje' : `${days}d`}</div>
                      <div className="text-[10px] text-[#9CA3AF]">{fmtDate(ev.event_date)}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-semibold" style={{ color: typeColor }}>{ev.type}</span>
                        {ev.verticals?.map(v => <VerticalBadge key={v} vertical={v} />)}
                      </div>
                      <div className="text-xs font-medium text-[#111827] truncate">{ev.title}</div>
                      {ev.description && <div className="text-[11px] text-[#9CA3AF] truncate">{ev.description}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Próximos 30 dias ── */}
      {loaded && monthEvents.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={16} className="text-[#6366F1]" strokeWidth={1.5} />
              <span className="text-sm font-semibold text-[#111827]">Próximos 30 dias</span>
            </div>
            <Link href="/agenda" className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors">
              Ver agenda <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {monthEvents.map(ev => {
              const days = daysUntil(ev.event_date)
              const typeColor = EVENT_TYPE_COLOR[ev.type] ?? '#9CA3AF'
              return (
                <div key={ev.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 text-center pt-0.5">
                    <div className="text-xs font-bold text-[#111827]">{`${days}d`}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{fmtDate(ev.event_date)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: typeColor }}>{ev.type}</span>
                      {ev.verticals?.map(v => <VerticalBadge key={v} vertical={v} />)}
                    </div>
                    <div className="text-xs font-medium text-[#111827] truncate">{ev.title}</div>
                    {ev.description && <div className="text-[11px] text-[#9CA3AF] truncate">{ev.description}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Acesso rápido ── */}
      <div>
        <h2 className="text-sm font-semibold text-[#111827] mb-3">Acesso rápido</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <Link key={action.href} href={action.href}
                className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex flex-col gap-2 hover:border-[#6366F1] hover:shadow-sm transition-all duration-150 group">
                <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center group-hover:bg-[#6366F1] transition-colors">
                  <Icon size={18} className="text-[#6366F1] group-hover:text-white transition-colors" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#111827]">{action.label}</div>
                  <div className="text-[11px] text-[#9CA3AF] leading-snug mt-0.5">{action.desc}</div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
