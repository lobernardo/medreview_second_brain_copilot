'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, GripVertical, Save, CheckCircle, AlertCircle, Loader2, X, Clock, UserCheck, UserX } from 'lucide-react'
import { SkeletonForm } from '@/components/ui/skeleton'
import type { TrailItem } from '@/lib/ai/onboarding-prompt'

const TONE_OPTIONS = [
  { value: 'didático e acolhedor', label: 'Didático e acolhedor' },
  { value: 'objetivo e direto', label: 'Objetivo e direto' },
  { value: 'descontraído e motivador', label: 'Descontraído e motivador' },
  { value: 'formal e profissional', label: 'Formal e profissional' },
]

const MATERIAL_TYPE_LABELS: Record<string, string> = {
  video: 'Vídeo YouTube',
  doc: 'Documento',
  link: 'Link externo',
}

const DEFAULT_TRAIL: TrailItem[] = [
  {
    order: 1,
    title: 'A Med-Review: Quem somos',
    description: 'Missão, história, posicionamento e diferenciais da empresa. Verdadeiro Valor.',
    estimated_minutes: 30,
    materials: [],
    quiz_questions: [
      'Com suas palavras, qual é o principal diferencial da Med-Review em relação a outros preparatórios médicos?',
      'Cite 3 big numbers da Med-Review que você usaria numa conversa com um lead.',
    ],
  },
  {
    order: 2,
    title: 'As 4 Verticais',
    description: 'R1, Anest-Review, Oft-Review, Ortop-Review: público-alvo, provas e posicionamento de cada uma.',
    estimated_minutes: 45,
    materials: [],
    quiz_questions: [
      'Quais provas a vertical Anest-Review prepara?',
      'Qual a diferença entre o público de R1 e o público de Anest?',
    ],
  },
  {
    order: 3,
    title: 'Produtos e Ofertas',
    description: 'Catálogo completo de cada vertical: o que cada produto inclui, pra quem serve, quando indicar.',
    estimated_minutes: 60,
    materials: [],
    quiz_questions: [
      'Qual a diferença entre o Extensive Anest e o Anest-Pass Blue?',
      'Para qual perfil de lead você indicaria o Anest-Pass Black?',
    ],
  },
  {
    order: 4,
    title: 'ICP e Personas',
    description: 'Quem são nossos clientes ideais por vertical. Como identificar o perfil do lead.',
    estimated_minutes: 30,
    materials: [],
    quiz_questions: [
      'Descreva o perfil ideal de um lead para a vertical de Anestesiologia.',
      'Quais sinais indicam que um lead tem urgência real de compra?',
    ],
  },
  {
    order: 5,
    title: 'Processo Comercial e Funil',
    description: 'Etapas da venda: qualificação, diagnóstico, apresentação, negociação, fechamento. Ferramentas internas.',
    estimated_minutes: 45,
    materials: [],
    quiz_questions: [
      'Quais são as etapas do funil comercial da Med-Review?',
      'O que o closer deve fazer ANTES de apresentar preço ao lead?',
    ],
  },
  {
    order: 6,
    title: 'Objeções e Contorno',
    description: 'As objeções mais comuns e como responder. Matriz de Objeções do sistema.',
    estimated_minutes: 45,
    materials: [],
    quiz_questions: [
      "Qual é a primeira coisa que você deve fazer quando o lead diz 'tá caro'?",
      'Por que nunca devemos oferecer desconto como primeira resposta a uma objeção de preço?',
    ],
  },
  {
    order: 7,
    title: 'Follow-up e WhatsApp',
    description: 'Regras de follow-up, janela de 24h, templates aprovados pela Meta, boas práticas de WhatsApp comercial.',
    estimated_minutes: 30,
    materials: [],
    quiz_questions: [
      'O que acontece quando a janela de 24h do WhatsApp fecha?',
      'Cite 2 boas práticas de comunicação comercial no WhatsApp.',
    ],
  },
]

interface FormState {
  trail: TrailItem[]
  custom_instructions: string
  welcome_message: string
  tone: string
}

interface UserRecord {
  id: string
  name: string
  email: string
  role: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function OnboardingConfigPage() {
  const [configId, setConfigId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    trail: [],
    custom_instructions: '',
    welcome_message: '',
    tone: 'didático e acolhedor',
  })
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  // ── Users for activation ───────────────────────────────────────────────────
  const [users, setUsers] = useState<UserRecord[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setUsersLoading(true)
    try {
      const res = await fetch('/api/usuarios')
      const json = await res.json()
      setUsers(json.data ?? [])
    } catch { /* ignore */ } finally {
      setUsersLoading(false)
    }
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/onboarding-config')
        const json = await res.json()
        if (json.data) {
          setConfigId(json.data.id)
          setForm({
            trail: Array.isArray(json.data.trail) ? (json.data.trail as TrailItem[]) : [],
            custom_instructions: json.data.custom_instructions ?? '',
            welcome_message: json.data.welcome_message ?? '',
            tone: json.data.tone ?? 'didático e acolhedor',
          })
        }
      } catch { /* table not set up yet */ } finally {
        setLoading(false)
      }
    }
    load()
    loadUsers()
  }, [loadUsers])

  async function toggleOnboarding(userId: string, currentRole: string) {
    setTogglingId(userId)
    try {
      const newRole = currentRole === 'onboarding' ? 'closer' : 'onboarding'
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      })
      if (res.ok) await loadUsers()
    } catch { /* ignore */ } finally {
      setTogglingId(null)
    }
  }

  function addTopic() {
    setForm((prev) => ({
      ...prev,
      trail: [
        ...prev.trail,
        { order: prev.trail.length + 1, title: '', description: '', materials: [], quiz_questions: [] },
      ],
    }))
  }

  function removeTopic(index: number) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail
        .filter((_, i) => i !== index)
        .map((t, i) => ({ ...t, order: i + 1 })),
    }))
  }

  function updateTopicField(index: number, updates: Partial<TrailItem>) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) => i === index ? { ...t, ...updates } : t),
    }))
  }

  function moveTopic(from: number, to: number) {
    if (to < 0 || to >= form.trail.length) return
    setForm((prev) => {
      const next = [...prev.trail]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return { ...prev, trail: next.map((t, i) => ({ ...t, order: i + 1 })) }
    })
  }

  function addMaterial(topicIdx: number) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === topicIdx
          ? { ...t, materials: [...(t.materials ?? []), { type: 'link' as const, label: '', url: '' }] }
          : t
      ),
    }))
  }

  function removeMaterial(topicIdx: number, matIdx: number) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === topicIdx
          ? { ...t, materials: (t.materials ?? []).filter((_, j) => j !== matIdx) }
          : t
      ),
    }))
  }

  function updateMaterial(topicIdx: number, matIdx: number, field: 'type' | 'label' | 'url', value: string) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === topicIdx
          ? {
              ...t,
              materials: (t.materials ?? []).map((m, j) =>
                j === matIdx ? { ...m, [field]: value } : m
              ),
            }
          : t
      ),
    }))
  }

  function addQuizQuestion(topicIdx: number) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === topicIdx
          ? { ...t, quiz_questions: [...(t.quiz_questions ?? []), ''] }
          : t
      ),
    }))
  }

  function removeQuizQuestion(topicIdx: number, qIdx: number) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === topicIdx
          ? { ...t, quiz_questions: (t.quiz_questions ?? []).filter((_, j) => j !== qIdx) }
          : t
      ),
    }))
  }

  function updateQuizQuestion(topicIdx: number, qIdx: number, value: string) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === topicIdx
          ? { ...t, quiz_questions: (t.quiz_questions ?? []).map((q, j) => (j === qIdx ? value : q)) }
          : t
      ),
    }))
  }

  function applyDefaultTrail() {
    setForm((prev) => ({ ...prev, trail: DEFAULT_TRAIL }))
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const payload = {
        trail: form.trail,
        custom_instructions: form.custom_instructions || null,
        welcome_message: form.welcome_message || null,
        tone: form.tone,
      }

      const res = await fetch('/api/onboarding-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configId ? { id: configId, ...payload } : payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (!configId && json.data?.id) setConfigId(json.data.id)

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <SkeletonForm />
        <SkeletonForm />
      </div>
    )
  }

  const closers = users.filter(u => u.role === 'closer')
  const onboardingUsers = users.filter(u => u.role === 'onboarding')

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Config Onboarding</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure a trilha de aprendizado e o comportamento do Copilot para novos colaboradores.
        </p>
      </div>

      {/* Trilha */}
      <section
        className="bg-white rounded-xl border p-6 space-y-4"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Trilha de aprendizado</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              Defina a sequência de temas que o colaborador vai percorrer.
            </p>
          </div>
          <button
            onClick={addTopic}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Plus size={15} />
            Adicionar tema
          </button>
        </div>

        {form.trail.length === 0 ? (
          <div className="text-center py-10 text-gray-400 border border-dashed rounded-lg space-y-3" style={{ borderColor: '#E5E7EB' }}>
            <div>
              <p className="text-sm">Nenhum tema adicionado ainda.</p>
              <p className="text-[12px] mt-1">Clique em "Adicionar tema" para começar ou use a trilha padrão.</p>
            </div>
            <button
              onClick={applyDefaultTrail}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              Usar trilha padrão (7 temas)
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {form.trail.map((topic, idx) => (
              <div
                key={idx}
                className="border rounded-xl p-4 space-y-3 bg-gray-50"
                style={{ borderColor: '#E5E7EB' }}
              >
                <div className="flex items-start gap-3">
                  {/* Move handle */}
                  <div className="flex flex-col gap-1 pt-1.5 flex-shrink-0">
                    <button
                      onClick={() => moveTopic(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
                      title="Mover para cima"
                    >
                      <GripVertical size={14} />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    {/* Title + estimated minutes */}
                    <div className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                        style={{ background: '#6366F1' }}
                      >
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={topic.title}
                        onChange={(e) => updateTopicField(idx, { title: e.target.value })}
                        placeholder="Título do tema…"
                        className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none pb-0.5 transition-colors placeholder-gray-400"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0 text-gray-400">
                        <Clock size={12} />
                        <input
                          type="number"
                          min={1}
                          value={topic.estimated_minutes ?? ''}
                          onChange={(e) =>
                            updateTopicField(idx, {
                              estimated_minutes: e.target.value ? Number(e.target.value) : undefined,
                            })
                          }
                          placeholder="min"
                          className="w-14 text-xs text-gray-600 bg-white border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-200 placeholder-gray-400"
                          style={{ borderColor: '#E5E7EB' }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <textarea
                      value={topic.description ?? ''}
                      onChange={(e) => updateTopicField(idx, { description: e.target.value })}
                      placeholder="Descrição opcional — o que o colaborador deve aprender neste tema…"
                      rows={2}
                      className="w-full text-[13px] text-gray-600 bg-white border rounded-lg px-3 py-2 outline-none resize-none focus:ring-2 focus:ring-indigo-200 transition-shadow placeholder-gray-400"
                      style={{ borderColor: '#E5E7EB' }}
                    />

                    {/* Materials */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          Materiais de apoio
                        </span>
                        <button
                          onClick={() => addMaterial(idx)}
                          className="flex items-center gap-1 text-[12px] text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          <Plus size={12} />
                          Adicionar material
                        </button>
                      </div>
                      {(topic.materials ?? []).map((mat, matIdx) => (
                        <div key={matIdx} className="flex items-center gap-2">
                          <select
                            value={mat.type}
                            onChange={(e) => updateMaterial(idx, matIdx, 'type', e.target.value)}
                            className="text-[12px] text-gray-600 bg-white border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-200 flex-shrink-0"
                            style={{ borderColor: '#E5E7EB' }}
                          >
                            {Object.entries(MATERIAL_TYPE_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={mat.label}
                            onChange={(e) => updateMaterial(idx, matIdx, 'label', e.target.value)}
                            placeholder="Nome do material…"
                            className="flex-1 text-[12px] text-gray-700 bg-white border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-200 placeholder-gray-400"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                          <input
                            type="url"
                            value={mat.url}
                            onChange={(e) => updateMaterial(idx, matIdx, 'url', e.target.value)}
                            placeholder="https://…"
                            className="flex-1 text-[12px] text-gray-700 bg-white border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-200 placeholder-gray-400"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                          <button
                            onClick={() => removeMaterial(idx, matIdx)}
                            className="p-1 text-gray-300 hover:text-red-400 rounded transition-colors flex-shrink-0"
                            title="Remover material"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Quiz questions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                          Perguntas do quiz
                        </span>
                        <button
                          onClick={() => addQuizQuestion(idx)}
                          className="flex items-center gap-1 text-[12px] text-indigo-600 hover:text-indigo-700 transition-colors"
                        >
                          <Plus size={12} />
                          Adicionar pergunta
                        </button>
                      </div>
                      {(topic.quiz_questions ?? []).map((q, qIdx) => (
                        <div key={qIdx} className="flex items-start gap-2">
                          <textarea
                            value={q}
                            onChange={(e) => updateQuizQuestion(idx, qIdx, e.target.value)}
                            placeholder="Pergunta que o Copilot vai fazer ao colaborador…"
                            rows={2}
                            className="flex-1 text-[12px] text-gray-700 bg-white border rounded-lg px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-indigo-200 placeholder-gray-400"
                            style={{ borderColor: '#E5E7EB' }}
                          />
                          <button
                            onClick={() => removeQuizQuestion(idx, qIdx)}
                            className="p-1 mt-1 text-gray-300 hover:text-red-400 rounded transition-colors flex-shrink-0"
                            title="Remover pergunta"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delete topic */}
                  <button
                    onClick={() => removeTopic(idx)}
                    className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                    title="Remover tema"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Mensagem de boas-vindas */}
      <section
        className="bg-white rounded-xl border p-6 space-y-3"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">Mensagem de boas-vindas</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Primeira mensagem que o Copilot envia ao novo colaborador. Deixe em branco para usar a padrão.
          </p>
        </div>
        <textarea
          value={form.welcome_message}
          onChange={(e) => setForm((prev) => ({ ...prev, welcome_message: e.target.value }))}
          placeholder="Ex: Olá! Seja bem-vindo ao time Med-Review! Estou aqui para te ajudar…"
          rows={4}
          className="w-full text-sm text-gray-800 border rounded-lg px-3 py-2.5 outline-none resize-none focus:ring-2 focus:ring-indigo-200 transition-shadow placeholder-gray-400"
          style={{ borderColor: '#E5E7EB' }}
        />
      </section>

      {/* Tom */}
      <section
        className="bg-white rounded-xl border p-6 space-y-3"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">Tom do Copilot</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">Como o Copilot se comunica com o colaborador.</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setForm((prev) => ({ ...prev, tone: opt.value }))}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 ${
                form.tone === opt.value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Instruções extras */}
      <section
        className="bg-white rounded-xl border p-6 space-y-3"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">Instruções extras para o Copilot</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Direcionamentos específicos. Ex: "Sempre dê exemplos de vendas reais", "Foque na vertical Anest nas primeiras semanas".
          </p>
        </div>
        <textarea
          value={form.custom_instructions}
          onChange={(e) => setForm((prev) => ({ ...prev, custom_instructions: e.target.value }))}
          placeholder="Escreva instruções adicionais para o Copilot de Onboarding…"
          rows={5}
          className="w-full text-sm text-gray-800 border rounded-lg px-3 py-2.5 outline-none resize-none focus:ring-2 focus:ring-indigo-200 transition-shadow placeholder-gray-400"
          style={{ borderColor: '#E5E7EB' }}
        />
      </section>

      {/* Save button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
              <CheckCircle size={15} />
              <span>Configurações salvas!</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-red-500 text-sm">
              <AlertCircle size={15} />
              <span>Erro ao salvar. Tente novamente.</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-all duration-150 hover:scale-[1.01] disabled:opacity-60"
          style={{ background: saveStatus === 'saving' ? '#9CA3AF' : '#6366F1' }}
        >
          {saveStatus === 'saving' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Salvando…
            </>
          ) : (
            <>
              <Save size={14} />
              Salvar configurações
            </>
          )}
        </button>
      </div>

      {/* ── Ativar Onboarding por Colaborador ─────────────────────────────────── */}
      <section
        className="bg-white rounded-xl border p-6 space-y-4"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div>
          <h2 className="text-base font-semibold text-gray-900">Ativar Onboarding por Colaborador</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Ative o modo onboarding para um colaborador. Enquanto ativo, ele acessa o Copilot Onboarding em vez do Copilot Vendas.
          </p>
        </div>

        {usersLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <Loader2 size={14} className="animate-spin" />
            Carregando colaboradores…
          </div>
        ) : (
          <div className="space-y-4">
            {/* Em onboarding */}
            {onboardingUsers.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Em onboarding agora</p>
                {onboardingUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2.5 px-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name || '—'}</p>
                      <p className="text-[12px] text-gray-500">{u.email}</p>
                    </div>
                    <button
                      onClick={() => toggleOnboarding(u.id, u.role)}
                      disabled={togglingId === u.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {togglingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <UserX size={12} />}
                      Concluir / Reverter
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Closers disponíveis */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                Closers disponíveis para onboarding
              </p>
              {closers.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">Nenhum closer cadastrado.</p>
              ) : (
                closers.map(u => (
                  <div key={u.id} className="flex items-center justify-between py-2.5 px-3 border border-[#E5E7EB] rounded-lg hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{u.name || '—'}</p>
                      <p className="text-[12px] text-gray-500">{u.email}</p>
                    </div>
                    <button
                      onClick={() => toggleOnboarding(u.id, u.role)}
                      disabled={togglingId === u.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {togglingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <UserCheck size={12} />}
                      Ativar Onboarding
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>

      <div className="pb-8" />
    </div>
  )
}
