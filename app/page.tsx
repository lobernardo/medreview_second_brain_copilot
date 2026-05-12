'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Bot, GraduationCap, NotebookPen, Mail, HelpCircle, BookOpen,
  MessageSquareText, Trophy, Package, Calendar, ChevronRight,
} from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { useProfile } from '@/lib/context/profile-context'
import { VERTICAL_CONFIG } from '@/lib/utils/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamDate {
  id: string; vertical: string; name: string; exam_date: string
  registration_start: string | null; registration_end: string | null
}

interface CompanyEvent {
  id: string; type: string; title: string; event_date: string
  verticals: string[]; description: string | null
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
  const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
  const MONTHS = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const d = new Date()
  return `${DAYS[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]} de ${d.getFullYear()}`
}

function urgencyStyle(days: number): { color: string; bg: string; label: string } {
  if (days <= 30) return { color: '#EF4444', bg: '#FEF2F2', label: `${days}d` }
  if (days <= 90) return { color: '#F59E0B', bg: '#FFFBEB', label: `${days}d` }
  return { color: '#10B981', bg: '#ECFDF5', label: `${days}d` }
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  lançamento: '#6366F1', campanha: '#8B5CF6',
  evento: '#06B6D4', deadline: '#EF4444', outro: '#9CA3AF',
}

// ─── Quick actions per role ────────────────────────────────────────────────────

const QUICK_ACTIONS: Record<Role, { href: string; label: string; desc: string; icon: React.ElementType }[]> = {
  closer: [
    { href: '/copilot-vendas',  label: 'Copilot Vendas',  desc: 'IA para objeções e propostas', icon: Bot },
    { href: '/copys',           label: 'Copys',           desc: 'Mensagens prontas para uso',   icon: Mail },
    { href: '/leads',           label: 'No Radar',        desc: 'Acompanhe seus leads',          icon: NotebookPen },
    { href: '/templates',       label: 'Templates',       desc: 'WhatsApp templates rápidos',    icon: MessageSquareText },
  ],
  gestor: [
    { href: '/copilot-vendas',    label: 'Copilot Vendas',    desc: 'IA comercial do time',          icon: Bot },
    { href: '/copilot-onboarding',label: 'Copilot Onboarding',desc: 'Trilha para novos colaboradores',icon: GraduationCap },
    { href: '/leads',             label: 'No Radar',          desc: 'Radar de leads',                icon: NotebookPen },
    { href: '/produtos',          label: 'Catálogo',          desc: 'Produtos e ofertas',             icon: Package },
  ],
  onboarding: [
    { href: '/copilot-onboarding', label: 'Copilot Onboarding', desc: 'Sua trilha de aprendizado',  icon: GraduationCap },
    { href: '/faq',                label: 'FAQ',                desc: 'Dúvidas frequentes',          icon: HelpCircle },
    { href: '/kb',                 label: 'Knowledge Base',     desc: 'Documentação interna',        icon: BookOpen },
    { href: '/verdadeiro-valor',   label: 'Verdadeiro Valor',   desc: 'Diferenciais da Med-Review',  icon: Trophy },
  ],
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const profile = useProfile()
  const role = (profile?.role ?? 'closer') as Role

  const [exams, setExams] = useState<ExamDate[]>([])
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/exam-dates').then(r => r.json()).then(j => setExams(j.data ?? [])).catch(() => {}),
      fetch('/api/events').then(r => r.json()).then(j => setEvents(j.data ?? [])).catch(() => {}),
    ]).finally(() => setLoaded(true))
  }, [])

  const upcomingExams = useMemo(
    () => exams.filter(e => daysUntil(e.exam_date) >= 0).slice(0, 4),
    [exams],
  )

  const upcomingEvents = useMemo(
    () => events.filter(e => { const d = daysUntil(e.event_date); return d >= 0 && d <= 30 }).slice(0, 6),
    [events],
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

      {/* ── Provas + Eventos ── */}
      {loaded && (upcomingExams.length > 0 || upcomingEvents.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Provas próximas */}
          {upcomingExams.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Calendar size={16} className="text-[#6366F1]" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-[#111827]">Provas próximas</span>
                </div>
                <Link href="/agenda" className="flex items-center gap-1 text-xs text-[#6366F1] hover:text-[#4F46E5] transition-colors">
                  Ver todas <ChevronRight size={12} />
                </Link>
              </div>
              <div className="space-y-2">
                {upcomingExams.map(exam => {
                  const days = daysUntil(exam.exam_date)
                  const urg = urgencyStyle(days)
                  const vcfg = VERTICAL_CONFIG[exam.vertical]
                  return (
                    <div key={exam.id} className="bg-white border border-[#E5E7EB] rounded-xl p-3 flex items-center gap-3">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg flex flex-col items-center justify-center"
                        style={{ background: urg.bg }}>
                        <span className="text-sm font-bold leading-none" style={{ color: urg.color }}>{urg.label}</span>
                        <span className="text-[9px] mt-0.5" style={{ color: urg.color }}>dias</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#111827] truncate">{exam.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-[#9CA3AF]">{fmtDate(exam.exam_date)}</span>
                          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full"
                            style={{ color: vcfg?.color ?? '#6B7280', background: vcfg?.bg ?? '#F3F4F6' }}>
                            {exam.vertical}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Eventos próximos 30 dias */}
          {upcomingEvents.length > 0 && (
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
              <div className="space-y-2">
                {upcomingEvents.map(ev => {
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
            </div>
          )}
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
