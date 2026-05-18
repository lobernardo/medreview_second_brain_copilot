'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  X,
  Loader2,
  CheckCircle,
  Clock,
  Circle,
  MessageSquare,
} from 'lucide-react'

interface CollaboratorSummary {
  user_id: string
  name: string
  started_at: string | null
  last_activity: string | null
  topics_total: number
  topics_completed: number
  completion_pct: number
  status: 'not_started' | 'in_progress' | 'completed' | 'paused'
}

interface QuizErrorTopic {
  topic_index: number
  title: string
  error_rate: number
  total_attempts: number
}

interface ProgressItem {
  id: string
  topic_index: number
  topic_title: string
  status: string
  started_at: string | null
  completed_at: string | null
}

interface QuizResult {
  id: string
  topic_index: number
  topic_title: string
  question: string
  user_answer: string
  is_correct: boolean | null
  copilot_feedback: string | null
  created_at: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface Conversation {
  id: string
  messages: ConversationMessage[]
  created_at: string
}

interface UserDetail {
  profile: { id: string; name: string; role: string; vertical_focus: string | null } | null
  progress: ProgressItem[]
  quizResults: QuizResult[]
  conversations: Conversation[]
}

const STATUS_CONFIG = {
  not_started: { label: 'Não iniciado', bg: 'bg-gray-100', text: 'text-gray-500' },
  in_progress: { label: 'Em andamento', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  completed: { label: 'Concluído', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  paused: { label: 'Pausado', bg: 'bg-amber-50', text: 'text-amber-600' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDateFull(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ status }: { status: CollaboratorSummary['status'] }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

function ProgressBar({ pct, completed, total }: { pct: number; completed: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : '#6366F1' }}
        />
      </div>
      <span className="text-[11px] text-gray-500 whitespace-nowrap flex-shrink-0">
        {completed}/{total}
      </span>
    </div>
  )
}

function TopicStatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
  if (status === 'in_progress') return <Clock size={16} className="text-indigo-500 flex-shrink-0" />
  return <Circle size={16} className="text-gray-300 flex-shrink-0" />
}

export default function OnboardingAcompanhamentoPage() {
  const [collaborators, setCollaborators] = useState<CollaboratorSummary[]>([])
  const [quizErrorTopics, setQuizErrorTopics] = useState<QuizErrorTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [detail, setDetail] = useState<UserDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    fetch('/api/onboarding-acompanhamento')
      .then((r) => r.json())
      .then((json) => {
        setCollaborators(json.data ?? [])
        setQuizErrorTopics(json.quiz_error_topics ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function openDetail(userId: string) {
    setSelectedUserId(userId)
    setLoadingDetail(true)
    setDetail(null)
    try {
      const res = await fetch(`/api/onboarding-acompanhamento/${userId}`)
      const json = await res.json()
      setDetail(json.data ?? null)
    } finally {
      setLoadingDetail(false)
    }
  }

  function closeDetail() {
    setSelectedUserId(null)
    setDetail(null)
  }

  const totalUsers = collaborators.length
  const avgCompletion =
    totalUsers > 0
      ? Math.round(collaborators.reduce((s, c) => s + c.completion_pct, 0) / totalUsers)
      : 0
  const topErrorTopic = quizErrorTopics[0] ?? null

  // Group quiz results by topic for detail view
  function quizByTopic(results: QuizResult[]): Record<number, QuizResult[]> {
    return results.reduce<Record<number, QuizResult[]>>((acc, r) => {
      if (!acc[r.topic_index]) acc[r.topic_index] = []
      acc[r.topic_index].push(r)
      return acc
    }, {})
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Acompanhamento de Onboarding</h1>
        <p className="text-sm text-gray-500 mt-1">
          Progresso e desempenho dos colaboradores em onboarding.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="bg-white border rounded-xl p-5 space-y-1"
              style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-2 text-gray-500">
                <Users size={15} />
                <span className="text-[12px] font-medium">Colaboradores</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
              <div className="text-[11px] text-gray-400">em onboarding</div>
            </div>

            <div
              className="bg-white border rounded-xl p-5 space-y-1"
              style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-2 text-gray-500">
                <CheckCircle2 size={15} />
                <span className="text-[12px] font-medium">Conclusão média</span>
              </div>
              <div className="text-3xl font-bold" style={{ color: avgCompletion >= 80 ? '#10B981' : '#6366F1' }}>
                {avgCompletion}%
              </div>
              <div className="text-[11px] text-gray-400">da trilha</div>
            </div>

            <div
              className="bg-white border rounded-xl p-5 space-y-1"
              style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center gap-2 text-gray-500">
                <AlertTriangle size={15} />
                <span className="text-[12px] font-medium">Maior erro no quiz</span>
              </div>
              {topErrorTopic ? (
                <>
                  <div className="text-lg font-bold text-amber-500">{topErrorTopic.error_rate}%</div>
                  <div className="text-[11px] text-gray-500 truncate" title={topErrorTopic.title}>
                    {topErrorTopic.title}
                  </div>
                </>
              ) : (
                <div className="text-[12px] text-gray-400 pt-1">Sem dados de quiz ainda</div>
              )}
            </div>
          </div>

          {/* Collaborators list */}
          <section
            className="bg-white border rounded-xl overflow-hidden"
            style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <div className="px-6 py-4 border-b" style={{ borderColor: '#E5E7EB' }}>
              <h2 className="text-base font-semibold text-gray-900">Colaboradores</h2>
            </div>

            {collaborators.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 text-sm">
                Nenhum colaborador com role &quot;onboarding&quot; encontrado.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: '#E5E7EB' }}>
                {collaborators.map((c) => (
                  <div key={c.user_id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0"
                      style={{ background: '#6366F1' }}
                    >
                      {c.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    {/* Name + start date */}
                    <div className="flex-shrink-0 w-36">
                      <div className="text-sm font-medium text-gray-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-gray-400">
                        {c.started_at ? `Início: ${formatDate(c.started_at)}` : 'Não iniciou'}
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="flex-1 min-w-0">
                      <ProgressBar
                        pct={c.completion_pct}
                        completed={c.topics_completed}
                        total={c.topics_total}
                      />
                    </div>

                    {/* Status badge */}
                    <div className="flex-shrink-0 w-28 flex justify-center">
                      <StatusBadge status={c.status} />
                    </div>

                    {/* Last activity */}
                    <div className="flex-shrink-0 w-20 text-right">
                      <div className="text-[11px] text-gray-400">{formatDate(c.last_activity)}</div>
                    </div>

                    {/* Ver detalhes */}
                    <button
                      onClick={() => openDetail(c.user_id)}
                      className="flex-shrink-0 flex items-center gap-1 text-[12px] text-indigo-600 hover:text-indigo-700 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      Ver
                      <ChevronRight size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Detail drawer */}
      {selectedUserId && (
        <div className="fixed inset-0 z-40 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/30" onClick={closeDetail} />

          {/* Drawer */}
          <div className="w-full max-w-2xl bg-white flex flex-col h-full overflow-hidden shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0" style={{ borderColor: '#E5E7EB' }}>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {detail?.profile?.name ?? 'Colaborador'}
                </h2>
                {detail?.profile?.vertical_focus && (
                  <div className="text-[12px] text-gray-500 mt-0.5">
                    Vertical: {detail.profile.vertical_focus}
                  </div>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {loadingDetail ? (
                <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Carregando detalhes...</span>
                </div>
              ) : detail ? (
                <div className="px-6 py-5 space-y-7">
                  {/* Overall progress */}
                  {detail.progress.length > 0 && (() => {
                    const completed = detail.progress.filter((p) => p.status === 'completed').length
                    const total = collaborators.find((c) => c.user_id === selectedUserId)?.topics_total ?? detail.progress.length
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Progresso geral</span>
                          <span className="text-sm font-semibold text-gray-900">{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : '#6366F1' }}
                          />
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1">{completed} de {total} temas concluídos</div>
                      </div>
                    )
                  })()}

                  {/* Trail + quiz per topic */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Trilha</h3>
                    <div className="space-y-3">
                      {detail.progress.map((p) => {
                        const topicQuiz = quizByTopic(detail.quizResults)[p.topic_index] ?? []
                        return (
                          <div
                            key={p.id}
                            className="border rounded-xl p-4 space-y-3"
                            style={{ borderColor: '#E5E7EB' }}
                          >
                            {/* Topic header */}
                            <div className="flex items-start gap-3">
                              <TopicStatusIcon status={p.status} />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800">{p.topic_title}</div>
                                <div className="text-[11px] text-gray-400 mt-0.5 flex gap-3">
                                  {p.started_at && <span>Início: {formatDateFull(p.started_at)}</span>}
                                  {p.completed_at && <span>Conclusão: {formatDateFull(p.completed_at)}</span>}
                                </div>
                              </div>
                              <StatusBadge status={p.status as CollaboratorSummary['status']} />
                            </div>

                            {/* Quiz results for this topic */}
                            {topicQuiz.length > 0 && (
                              <div className="space-y-2 pt-1 border-t" style={{ borderColor: '#F3F4F6' }}>
                                <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide pt-1">
                                  Quiz — {topicQuiz.filter((q) => q.is_correct).length}/{topicQuiz.length} corretas
                                </div>
                                {topicQuiz.map((q) => (
                                  <div
                                    key={q.id}
                                    className={`rounded-lg p-3 text-[12px] border-l-2 ${
                                      q.is_correct === true
                                        ? 'bg-emerald-50 border-emerald-400'
                                        : q.is_correct === false
                                        ? 'bg-red-50 border-red-400'
                                        : 'bg-gray-50 border-gray-300'
                                    }`}
                                  >
                                    <div className="font-medium text-gray-700 mb-1">{q.question}</div>
                                    <div className="text-gray-600">
                                      <span className="font-medium">Resposta: </span>{q.user_answer}
                                    </div>
                                    {q.copilot_feedback && (
                                      <div className="text-gray-500 mt-1 text-[11px] line-clamp-2">
                                        {q.copilot_feedback}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {detail.progress.length === 0 && (
                        <div className="text-sm text-gray-400 text-center py-6">
                          Nenhum progresso registrado ainda.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent conversations */}
                  {detail.conversations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <MessageSquare size={14} />
                        Últimas conversas
                      </h3>
                      <div className="space-y-4">
                        {detail.conversations.slice(0, 2).map((conv) => {
                          const msgs = Array.isArray(conv.messages) ? conv.messages.slice(-6) : []
                          return (
                            <div
                              key={conv.id}
                              className="border rounded-xl p-4 space-y-2"
                              style={{ borderColor: '#E5E7EB' }}
                            >
                              <div className="text-[11px] text-gray-400 mb-2">
                                {formatDateFull(conv.created_at)}
                              </div>
                              {msgs.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                                      m.role === 'user'
                                        ? 'bg-indigo-50 text-indigo-900 rounded-tr-sm'
                                        : 'bg-gray-50 text-gray-700 rounded-tl-sm border'
                                    }`}
                                    style={m.role !== 'user' ? { borderColor: '#E5E7EB' } : {}}
                                  >
                                    {m.content?.slice(0, 200)}{m.content?.length > 200 ? '…' : ''}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
                  Erro ao carregar detalhes.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
