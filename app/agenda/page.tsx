'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Plus, Edit2, Trash2, X, Loader2, Calendar, ExternalLink, ChevronDown, ChevronUp,
} from 'lucide-react'
import { VerticalBadge } from '@/components/ui/badge'
import { SkeletonList } from '@/components/ui/skeleton'
import { Toast } from '@/components/ui/toast'
import { useProfile } from '@/lib/context/profile-context'
import { VERTICALS, VERTICAL_CONFIG } from '@/lib/utils/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExamDate {
  id: string
  vertical: string
  name: string
  exam_date: string
  registration_start: string | null
  registration_end: string | null
  notes: string | null
  monday_item_id: string | null
}

interface CompanyEvent {
  id: string
  type: string
  title: string
  description: string | null
  event_date: string
  end_date: string | null
  verticals: string[]
  responsible: string | null
  link: string | null
  monday_item_id: string | null
}

interface ExamForm {
  vertical: string; name: string; exam_date: string
  registration_start: string; registration_end: string
  notes: string; monday_item_id: string
}

interface EventForm {
  type: string; title: string; description: string
  event_date: string; end_date: string
  verticals: string[]; responsible: string; link: string; monday_item_id: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_EMPTY: ExamForm = {
  vertical: 'R1', name: '', exam_date: '', registration_start: '',
  registration_end: '', notes: '', monday_item_id: '',
}

const EVENT_EMPTY: EventForm = {
  type: 'lançamento', title: '', description: '', event_date: '', end_date: '',
  verticals: [], responsible: '', link: '', monday_item_id: '',
}

const EVENT_TYPES = ['lançamento', 'campanha', 'evento', 'deadline', 'outro'] as const

const EVENT_TYPE_CFG: Record<string, { color: string; bg: string }> = {
  lançamento: { color: '#6366F1', bg: '#EEF2FF' },
  campanha:   { color: '#8B5CF6', bg: '#F5F3FF' },
  evento:     { color: '#06B6D4', bg: '#ECFEFF' },
  deadline:   { color: '#EF4444', bg: '#FEF2F2' },
  outro:      { color: '#6B7280', bg: '#F3F4F6' },
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr + 'T00:00:00')
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function urgencyConfig(days: number): { label: string; color: string; bg: string } {
  if (days < 0)   return { label: 'Realizada',  color: '#9CA3AF', bg: '#F3F4F6' }
  if (days <= 30) return { label: `${days}d`,   color: '#EF4444', bg: '#FEF2F2' }
  if (days <= 90) return { label: `${days}d`,   color: '#F59E0B', bg: '#FFFBEB' }
  return              { label: `${days}d`,   color: '#10B981', bg: '#ECFDF5' }
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // "YYYY-MM"
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-')
  return `${MONTHS[parseInt(m) - 1]} ${y}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgendaPage() {
  const profile = useProfile()
  const isGestor = profile?.role === 'gestor'

  // ── Exams state ──
  const [exams, setExams] = useState<ExamDate[]>([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [filterVertical, setFilterVertical] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [examModal, setExamModal] = useState(false)
  const [editingExam, setEditingExam] = useState<ExamDate | null>(null)
  const [examForm, setExamForm] = useState<ExamForm>(EXAM_EMPTY)
  const [savingExam, setSavingExam] = useState(false)
  const [confirmDeleteExam, setConfirmDeleteExam] = useState<string | null>(null)

  // ── Events state ──
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventModal, setEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CompanyEvent | null>(null)
  const [eventForm, setEventForm] = useState<EventForm>(EVENT_EMPTY)
  const [savingEvent, setSavingEvent] = useState(false)
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState<string | null>(null)

  // ── Toast ──
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Load ──
  useEffect(() => {
    Promise.all([
      fetch('/api/exam-dates').then(r => r.json()).then(j => {
        setExams(j.data ?? [])
        setExamsLoading(false)
      }).catch(() => setExamsLoading(false)),
      fetch('/api/events').then(r => r.json()).then(j => {
        setEvents(j.data ?? [])
        setEventsLoading(false)
      }).catch(() => setEventsLoading(false)),
    ])
  }, [])

  // ── Filtered exams ──
  const { upcomingExams, pastExams } = useMemo(() => {
    const filtered = filterVertical ? exams.filter(e => e.vertical === filterVertical) : exams
    const upcoming = filtered.filter(e => daysUntil(e.exam_date) >= 0)
    const past = filtered.filter(e => daysUntil(e.exam_date) < 0).reverse()
    return { upcomingExams: upcoming, pastExams: past }
  }, [exams, filterVertical])

  // ── Grouped events ──
  const groupedEvents = useMemo(() => {
    const groups: Record<string, CompanyEvent[]> = {}
    events.forEach(e => {
      const key = monthKey(e.event_date)
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [events])

  // ── Exam handlers ──
  function openNewExam() { setEditingExam(null); setExamForm(EXAM_EMPTY); setExamModal(true) }
  function openEditExam(e: ExamDate) {
    setEditingExam(e)
    setExamForm({
      vertical: e.vertical, name: e.name, exam_date: e.exam_date,
      registration_start: e.registration_start ?? '',
      registration_end: e.registration_end ?? '',
      notes: e.notes ?? '', monday_item_id: e.monday_item_id ?? '',
    })
    setExamModal(true)
  }
  function closeExamModal() { setExamModal(false); setEditingExam(null); setExamForm(EXAM_EMPTY) }

  async function handleSaveExam() {
    if (!examForm.name.trim() || !examForm.exam_date) return
    setSavingExam(true)
    try {
      const res = await fetch('/api/exam-dates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingExam ? { id: editingExam.id, ...examForm } : examForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (editingExam) {
        setExams(prev => prev.map(e => e.id === editingExam.id ? { ...e, ...examForm } : e)
          .sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
        showToast('Prova atualizada')
      } else {
        const newExam: ExamDate = { ...examForm, id: json.data.id, registration_start: examForm.registration_start || null, registration_end: examForm.registration_end || null, notes: examForm.notes || null, monday_item_id: examForm.monday_item_id || null }
        setExams(prev => [...prev, newExam].sort((a, b) => a.exam_date.localeCompare(b.exam_date)))
        showToast('Prova adicionada')
      }
      closeExamModal()
    } catch { showToast('Erro ao salvar', 'error') }
    finally { setSavingExam(false) }
  }

  async function handleDeleteExam(id: string) {
    const res = await fetch('/api/exam-dates', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { showToast('Erro ao excluir', 'error'); return }
    setExams(prev => prev.filter(e => e.id !== id))
    setConfirmDeleteExam(null)
    showToast('Prova removida')
  }

  // ── Event handlers ──
  function openNewEvent() { setEditingEvent(null); setEventForm(EVENT_EMPTY); setEventModal(true) }
  function openEditEvent(e: CompanyEvent) {
    setEditingEvent(e)
    setEventForm({
      type: e.type, title: e.title, description: e.description ?? '',
      event_date: e.event_date, end_date: e.end_date ?? '',
      verticals: e.verticals ?? [], responsible: e.responsible ?? '',
      link: e.link ?? '', monday_item_id: e.monday_item_id ?? '',
    })
    setEventModal(true)
  }
  function closeEventModal() { setEventModal(false); setEditingEvent(null); setEventForm(EVENT_EMPTY) }

  function toggleVerticalEvent(v: string) {
    setEventForm(f => ({
      ...f,
      verticals: f.verticals.includes(v) ? f.verticals.filter(x => x !== v) : [...f.verticals, v],
    }))
  }

  async function handleSaveEvent() {
    if (!eventForm.title.trim() || !eventForm.event_date) return
    setSavingEvent(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEvent ? { id: editingEvent.id, ...eventForm } : eventForm),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (editingEvent) {
        setEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...e, ...eventForm } : e)
          .sort((a, b) => a.event_date.localeCompare(b.event_date)))
        showToast('Evento atualizado')
      } else {
        const newEvent: CompanyEvent = { ...eventForm, id: json.data.id, description: eventForm.description || null, end_date: eventForm.end_date || null, responsible: eventForm.responsible || null, link: eventForm.link || null, monday_item_id: eventForm.monday_item_id || null }
        setEvents(prev => [...prev, newEvent].sort((a, b) => a.event_date.localeCompare(b.event_date)))
        showToast('Evento adicionado')
      }
      closeEventModal()
    } catch { showToast('Erro ao salvar', 'error') }
    finally { setSavingEvent(false) }
  }

  async function handleDeleteEvent(id: string) {
    const res = await fetch('/api/events', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) { showToast('Erro ao excluir', 'error'); return }
    setEvents(prev => prev.filter(e => e.id !== id))
    setConfirmDeleteEvent(null)
    showToast('Evento removido')
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-10">

      {/* ── Section 1: Provas & Datas ── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[#6366F1]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-[#111827]">Provas & Datas</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterVertical}
              onChange={e => setFilterVertical(e.target.value)}
              className="border border-[#E5E7EB] rounded-lg px-3 py-1.5 text-sm text-[#374151] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todas as verticais</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {isGestor && (
              <button
                onClick={openNewExam}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus size={15} /> Nova prova
              </button>
            )}
          </div>
        </div>

        {examsLoading ? (
          <SkeletonList />
        ) : upcomingExams.length === 0 && pastExams.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center text-[#9CA3AF] text-sm">
            {isGestor ? 'Nenhuma prova cadastrada. Clique em "+ Nova prova" para começar.' : 'Nenhuma prova cadastrada ainda.'}
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingExams.map(exam => {
              const days = daysUntil(exam.exam_date)
              const urg = urgencyConfig(days)
              const vcfg = VERTICAL_CONFIG[exam.vertical]
              return (
                <div key={exam.id} className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-start gap-4">
                  {/* Countdown pill */}
                  <div
                    className="flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center text-center"
                    style={{ background: urg.bg }}
                  >
                    <span className="text-lg font-bold leading-none" style={{ color: urg.color }}>{urg.label}</span>
                    {days >= 0 && <span className="text-[10px] leading-tight mt-0.5" style={{ color: urg.color }}>restantes</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-semibold text-[#111827]">{exam.name}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: vcfg?.color ?? '#6B7280', background: vcfg?.bg ?? '#F3F4F6' }}>{exam.vertical}</span>
                    </div>
                    <div className="text-xs text-[#6B7280]">Data: <span className="font-medium text-[#374151]">{fmtDate(exam.exam_date)}</span></div>
                    {(exam.registration_start || exam.registration_end) && (
                      <div className="text-xs text-[#6B7280] mt-0.5">
                        Inscrições: {fmtDate(exam.registration_start)}{exam.registration_end ? ` a ${fmtDate(exam.registration_end)}` : ''}
                      </div>
                    )}
                    {exam.notes && <div className="text-xs text-[#9CA3AF] mt-1 italic">{exam.notes}</div>}
                    {exam.monday_item_id && (
                      <a
                        href={exam.monday_item_id.startsWith('http') ? exam.monday_item_id : `#`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#059669] hover:bg-[#DCFCE7] transition-colors"
                        title="Abrir no Monday.com"
                      >
                        <ExternalLink size={10} /> Monday
                      </a>
                    )}
                  </div>

                  {isGestor && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => openEditExam(exam)} className="p-1.5 text-[#9CA3AF] hover:text-[#6366F1] rounded-lg hover:bg-[#EEF2FF] transition-colors">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => setConfirmDeleteExam(exam.id)} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg hover:bg-[#FEF2F2] transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            {pastExams.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPast(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#6B7280] mt-2 mb-2 transition-colors"
                >
                  {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {pastExams.length} prova{pastExams.length > 1 ? 's' : ''} realizada{pastExams.length > 1 ? 's' : ''}
                </button>
                {showPast && pastExams.map(exam => (
                  <div key={exam.id} className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-xl p-4 flex items-start gap-4 mb-3 opacity-60">
                    <div className="flex-shrink-0 w-16 h-16 rounded-xl flex items-center justify-center bg-[#F3F4F6]">
                      <span className="text-xs font-medium text-[#9CA3AF]">Realizada</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[#6B7280]">{exam.name}</span>
                        <VerticalBadge vertical={exam.vertical} />
                      </div>
                      <div className="text-xs text-[#9CA3AF]">{fmtDate(exam.exam_date)}</div>
                    </div>
                    {isGestor && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEditExam(exam)} className="p-1.5 text-[#9CA3AF] hover:text-[#6366F1] rounded-lg hover:bg-[#EEF2FF] transition-colors"><Edit2 size={14} /></button>
                        <button onClick={() => setConfirmDeleteExam(exam.id)} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg hover:bg-[#FEF2F2] transition-colors"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── Section 2: Calendário de Eventos ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-[#6366F1]" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-[#111827]">Calendário de Eventos</h2>
          </div>
          {isGestor && (
            <button
              onClick={openNewEvent}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus size={15} /> Novo evento
            </button>
          )}
        </div>

        {eventsLoading ? (
          <SkeletonList />
        ) : events.length === 0 ? (
          <div className="bg-white border border-[#E5E7EB] rounded-xl p-10 text-center text-[#9CA3AF] text-sm">
            {isGestor ? 'Nenhum evento cadastrado. Clique em "+ Novo evento" para começar.' : 'Nenhum evento cadastrado ainda.'}
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map(([key, monthEvents]) => (
              <div key={key}>
                <div className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2 px-1">{monthLabel(key)}</div>
                <div className="space-y-2">
                  {monthEvents.map(ev => {
                    const typeCfg = EVENT_TYPE_CFG[ev.type] ?? EVENT_TYPE_CFG.outro
                    const days = daysUntil(ev.event_date)
                    const isPast = days < 0
                    return (
                      <div key={ev.id} className={['bg-white border rounded-xl p-4 flex items-start gap-3', isPast ? 'border-[#F3F4F6] opacity-60' : 'border-[#E5E7EB]'].join(' ')}>
                        <div className="flex-shrink-0 pt-0.5">
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: typeCfg.color, background: typeCfg.bg }}>
                            {ev.type}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-semibold text-[#111827]">{ev.title}</span>
                            <span className="text-xs text-[#9CA3AF] flex-shrink-0">
                              {fmtDate(ev.event_date)}{ev.end_date ? ` – ${fmtDate(ev.end_date)}` : ''}
                            </span>
                          </div>
                          {ev.description && <div className="text-xs text-[#6B7280] mt-1">{ev.description}</div>}
                          <div className="flex items-center gap-3 flex-wrap mt-1.5">
                            {ev.verticals?.length > 0 && (
                              <div className="flex gap-1">
                                {ev.verticals.map(v => <VerticalBadge key={v} vertical={v} />)}
                              </div>
                            )}
                            {ev.responsible && <span className="text-[11px] text-[#9CA3AF]">Resp: {ev.responsible}</span>}
                            {ev.link && (
                              <a href={ev.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-[#6366F1] hover:underline">
                                <ExternalLink size={10} /> Link
                              </a>
                            )}
                            {ev.monday_item_id && (
                              <a
                                href={ev.monday_item_id.startsWith('http') ? ev.monday_item_id : '#'}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#059669] hover:bg-[#DCFCE7] transition-colors"
                              >
                                <ExternalLink size={10} /> Monday
                              </a>
                            )}
                          </div>
                        </div>
                        {isGestor && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button onClick={() => openEditEvent(ev)} className="p-1.5 text-[#9CA3AF] hover:text-[#6366F1] rounded-lg hover:bg-[#EEF2FF] transition-colors"><Edit2 size={14} /></button>
                            <button onClick={() => setConfirmDeleteEvent(ev.id)} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg hover:bg-[#FEF2F2] transition-colors"><Trash2 size={14} /></button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Modal: Exam ── */}
      {examModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <h3 className="text-sm font-semibold text-[#111827]">{editingExam ? 'Editar prova' : 'Nova prova'}</h3>
              <button onClick={closeExamModal} className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors"><X size={16} /></button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Vertical *</label>
                  <select value={examForm.vertical} onChange={e => setExamForm(f => ({ ...f, vertical: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Data da prova *</label>
                  <input type="date" value={examForm.exam_date} onChange={e => setExamForm(f => ({ ...f, exam_date: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Nome da prova *</label>
                <input value={examForm.name} onChange={e => setExamForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ex: ENAMED 2026"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Início inscrições</label>
                  <input type="date" value={examForm.registration_start} onChange={e => setExamForm(f => ({ ...f, registration_start: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Fim inscrições</label>
                  <input type="date" value={examForm.registration_end} onChange={e => setExamForm(f => ({ ...f, registration_end: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Notas</label>
                <textarea value={examForm.notes} onChange={e => setExamForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Informações adicionais..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Link Monday.com</label>
                <input value={examForm.monday_item_id} onChange={e => setExamForm(f => ({ ...f, monday_item_id: e.target.value }))}
                  placeholder="https://medreview.monday.com/..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-[11px] text-[#9CA3AF] mt-1">Cole o link do item no Monday — integração completa em breve.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-[#F3F4F6]">
              <button onClick={handleSaveExam} disabled={savingExam || !examForm.name.trim() || !examForm.exam_date}
                className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {savingExam && <Loader2 size={14} className="animate-spin" />}
                {editingExam ? 'Salvar' : 'Adicionar'}
              </button>
              <button onClick={closeExamModal} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Event ── */}
      {eventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] sticky top-0 bg-white">
              <h3 className="text-sm font-semibold text-[#111827]">{editingEvent ? 'Editar evento' : 'Novo evento'}</h3>
              <button onClick={closeEventModal} className="p-1 text-[#9CA3AF] hover:text-[#111827] rounded-lg hover:bg-[#F3F4F6] transition-colors"><X size={16} /></button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Tipo *</label>
                  <select value={eventForm.type} onChange={e => setEventForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Data *</label>
                  <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Título *</label>
                <input value={eventForm.title} onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ex: Lançamento ENAMED Turbo"
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Descrição</label>
                <textarea value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="Detalhes do evento..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Data fim</label>
                <input type="date" value={eventForm.end_date} onChange={e => setEventForm(f => ({ ...f, end_date: e.target.value }))}
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Verticais relacionadas</label>
                <div className="flex flex-wrap gap-2">
                  {VERTICALS.map(v => (
                    <button key={v} type="button" onClick={() => toggleVerticalEvent(v)}
                      className={['px-3 py-1 rounded-full text-xs font-medium border transition-colors', eventForm.verticals.includes(v) ? 'border-[#6366F1] bg-[#EEF2FF] text-[#6366F1]' : 'border-[#E5E7EB] text-[#6B7280] hover:border-indigo-300'].join(' ')}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Responsável</label>
                  <input value={eventForm.responsible} onChange={e => setEventForm(f => ({ ...f, responsible: e.target.value }))}
                    placeholder="Nome ou time"
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#374151] mb-1">Link</label>
                  <input value={eventForm.link} onChange={e => setEventForm(f => ({ ...f, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#374151] mb-1">Link Monday.com</label>
                <input value={eventForm.monday_item_id} onChange={e => setEventForm(f => ({ ...f, monday_item_id: e.target.value }))}
                  placeholder="https://medreview.monday.com/..."
                  className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <p className="text-[11px] text-[#9CA3AF] mt-1">Cole o link do item no Monday — integração completa em breve.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-4 border-t border-[#F3F4F6]">
              <button onClick={handleSaveEvent} disabled={savingEvent || !eventForm.title.trim() || !eventForm.event_date}
                className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#4F46E5] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {savingEvent && <Loader2 size={14} className="animate-spin" />}
                {editingEvent ? 'Salvar' : 'Adicionar'}
              </button>
              <button onClick={closeEventModal} className="px-4 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-[#E5E7EB] rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Exam ── */}
      {confirmDeleteExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <p className="text-sm font-medium text-[#111827]">Remover esta prova?</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteExam(confirmDeleteExam)} className="flex-1 px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Remover</button>
              <button onClick={() => setConfirmDeleteExam(null)} className="flex-1 px-4 py-2 border border-[#E5E7EB] text-sm text-[#6B7280] rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Event ── */}
      {confirmDeleteEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <p className="text-sm font-medium text-[#111827]">Remover este evento?</p>
            <div className="flex gap-3">
              <button onClick={() => handleDeleteEvent(confirmDeleteEvent)} className="flex-1 px-4 py-2 bg-[#EF4444] hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors">Remover</button>
              <button onClick={() => setConfirmDeleteEvent(null)} className="flex-1 px-4 py-2 border border-[#E5E7EB] text-sm text-[#6B7280] rounded-lg transition-colors">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  )
}
