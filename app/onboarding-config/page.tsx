'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Plus, Trash2, GripVertical, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import type { TrailItem } from '@/lib/ai/onboarding-prompt'

const TONE_OPTIONS = [
  { value: 'didático e acolhedor', label: 'Didático e acolhedor' },
  { value: 'objetivo e direto', label: 'Objetivo e direto' },
  { value: 'descontraído e motivador', label: 'Descontraído e motivador' },
  { value: 'formal e profissional', label: 'Formal e profissional' },
]

interface FormState {
  trail: TrailItem[]
  custom_instructions: string
  welcome_message: string
  tone: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function useSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export default function OnboardingConfigPage() {
  const supabase = useSupabase()
  const [configId, setConfigId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    trail: [],
    custom_instructions: '',
    welcome_message: '',
    tone: 'didático e acolhedor',
  })
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('onboarding_config')
          .select('id, trail, custom_instructions, welcome_message, tone')
          .limit(1)
          .maybeSingle()
        if (data) {
          setConfigId(data.id)
          setForm({
            trail: Array.isArray(data.trail) ? (data.trail as TrailItem[]) : [],
            custom_instructions: data.custom_instructions ?? '',
            welcome_message: data.welcome_message ?? '',
            tone: data.tone ?? 'didático e acolhedor',
          })
        }
      } catch { /* table not set up yet */ } finally {
        setLoading(false)
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function addTopic() {
    setForm((prev) => ({
      ...prev,
      trail: [
        ...prev.trail,
        { order: prev.trail.length + 1, title: '', description: '' },
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

  function updateTopic(index: number, field: keyof TrailItem, value: string) {
    setForm((prev) => ({
      ...prev,
      trail: prev.trail.map((t, i) =>
        i === index ? { ...t, [field]: value } : t
      ),
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

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const payload = {
        trail: form.trail,
        custom_instructions: form.custom_instructions || null,
        welcome_message: form.welcome_message || null,
        tone: form.tone,
        updated_at: new Date().toISOString(),
      }

      if (configId) {
        const { error } = await supabase
          .from('onboarding_config')
          .update(payload)
          .eq('id', configId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('onboarding_config')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        setConfigId(data.id)
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400 gap-2">
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Carregando configurações...</span>
      </div>
    )
  }

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
          <div className="text-center py-10 text-gray-400 border border-dashed rounded-lg" style={{ borderColor: '#E5E7EB' }}>
            <p className="text-sm">Nenhum tema adicionado ainda.</p>
            <p className="text-[12px] mt-1">Clique em "Adicionar tema" para começar.</p>
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

                  <div className="flex-1 space-y-2">
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
                        onChange={(e) => updateTopic(idx, 'title', e.target.value)}
                        placeholder="Título do tema…"
                        className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-b border-transparent focus:border-indigo-300 outline-none pb-0.5 transition-colors placeholder-gray-400"
                      />
                    </div>
                    <textarea
                      value={topic.description ?? ''}
                      onChange={(e) => updateTopic(idx, 'description', e.target.value)}
                      placeholder="Descrição opcional — o que o colaborador deve aprender neste tema…"
                      rows={2}
                      className="w-full text-[13px] text-gray-600 bg-white border rounded-lg px-3 py-2 outline-none resize-none focus:ring-2 focus:ring-indigo-200 transition-shadow placeholder-gray-400"
                      style={{ borderColor: '#E5E7EB' }}
                    />
                  </div>

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
      <div className="flex items-center justify-between pb-8">
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
    </div>
  )
}
