'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Save, ChevronRight, ChevronLeft, Check, Pencil } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { SkeletonForm } from '@/components/ui/skeleton'
import type { Profile } from '@/lib/utils/types'

const VERTICALS = ['R1', 'Anest', 'Oft', 'Ortop']

// ─── Wizard data ────────────────────────────────────────────────────────────────

const TOM_OPTIONS = [
  { value: 'direto e objetivo', label: 'Direto', desc: 'Vai ao ponto, sem rodeios' },
  { value: 'consultivo e didático', label: 'Consultivo', desc: 'Explica e guia o lead' },
  { value: 'descontraído e próximo', label: 'Descontraído', desc: 'Próximo, linguagem leve' },
  { value: 'formal e técnico', label: 'Formal', desc: 'Linguagem técnica e profissional' },
]

const EMOJI_OPTIONS = [
  { value: 'usa emoji com moderação', label: 'Às vezes' },
  { value: 'nunca usa emoji', label: 'Nunca' },
  { value: 'usa emoji frequentemente', label: 'Bastante' },
]

const TRATAMENTO_OPTIONS = [
  { value: 'Doutor(a)', label: 'Doutor(a)' },
  { value: 'Dr. [nome]', label: 'Dr. [nome]' },
  { value: 'pelo primeiro nome', label: 'Pelo nome' },
  { value: '__custom__', label: 'Outro…' },
]

const FECHAMENTO_OPTIONS = [
  { value: 'Abraço e sucesso!', label: 'Abraço e sucesso!' },
  { value: 'Fico à disposição.', label: 'Fico à disposição.' },
  { value: 'Grande abraço!', label: 'Grande abraço!' },
  { value: '__custom__', label: 'Outro…' },
]

const TOTAL_STEPS = 5

function buildStyleNotes(w: WizardState): string {
  const tratamento = w.tratamentoCustom || w.tratamento
  const fechamento = w.fechamentoCustom || w.fechamento
  const parts = [`Tom: ${w.tom}.`, `Emoji: ${w.emoji}.`]
  if (tratamento) parts.push(`Trata o lead como "${tratamento}".`)
  if (fechamento) parts.push(`Encerra com "${fechamento}".`)
  if (w.exemplo.trim()) parts.push(`Exemplo: "${w.exemplo.trim()}"`)
  return parts.join(' ')
}

interface WizardState {
  tom: string
  emoji: string
  tratamento: string
  tratamentoCustom: string
  fechamento: string
  fechamentoCustom: string
  exemplo: string
}

const EMPTY_WIZARD: WizardState = {
  tom: '', emoji: '', tratamento: '', tratamentoCustom: '',
  fechamento: '', fechamentoCustom: '', exemplo: '',
}

function parseStyleNotes(notes: string): WizardState {
  if (!notes) return EMPTY_WIZARD
  const w = { ...EMPTY_WIZARD }
  const tomMatch = notes.match(/Tom:\s*([^.]+)\./)
  if (tomMatch) {
    const val = tomMatch[1].trim()
    w.tom = TOM_OPTIONS.find(o => o.value === val)?.value ?? ''
  }
  const emojiMatch = notes.match(/Emoji:\s*([^.]+)\./)
  if (emojiMatch) {
    const val = emojiMatch[1].trim()
    w.emoji = EMOJI_OPTIONS.find(o => o.value === val)?.value ?? ''
  }
  const trat = notes.match(/Trata o lead como "([^"]+)"/)
  if (trat) {
    const val = trat[1]
    const opt = TRATAMENTO_OPTIONS.find(o => o.value === val)
    if (opt && opt.value !== '__custom__') { w.tratamento = val }
    else { w.tratamento = '__custom__'; w.tratamentoCustom = val }
  }
  const fech = notes.match(/Encerra com "([^"]+)"/)
  if (fech) {
    const val = fech[1]
    const opt = FECHAMENTO_OPTIONS.find(o => o.value === val)
    if (opt && opt.value !== '__custom__') { w.fechamento = val }
    else { w.fechamento = '__custom__'; w.fechamentoCustom = val }
  }
  const ex = notes.match(/Exemplo: "([^"]+)"/)
  if (ex) w.exemplo = ex[1]
  return w
}

// ─── Chip component ──────────────────────────────────────────────────────────

function Chip({ label, desc, active, onClick }: { label: string; desc?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className="flex items-start gap-2 px-4 py-3 rounded-xl border text-left transition-all duration-150 text-sm"
      style={active
        ? { borderColor: '#6366F1', background: '#EEF2FF', color: '#4338CA' }
        : { borderColor: '#E5E7EB', background: '#FFFFFF', color: '#374151' }
      }
    >
      <span
        className="flex-shrink-0 w-4 h-4 rounded-full border-2 mt-0.5 flex items-center justify-center"
        style={active ? { borderColor: '#6366F1', background: '#6366F1' } : { borderColor: '#D1D5DB' }}
      >
        {active && <Check size={10} strokeWidth={3} color="white" />}
      </span>
      <span>
        <span className="font-medium">{label}</span>
        {desc && <span className="block text-xs mt-0.5" style={{ color: active ? '#6366F1' : '#9CA3AF' }}>{desc}</span>}
      </span>
    </button>
  )
}

// ─── Step components ─────────────────────────────────────────────────────────

function StepTom({ wizard, setWizard }: { wizard: WizardState; setWizard: (w: WizardState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Qual é o seu tom de voz?</p>
        <p className="text-xs text-gray-400 mt-0.5">Como você naturalmente se comunica com os leads?</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TOM_OPTIONS.map(o => (
          <Chip key={o.value} label={o.label} desc={o.desc} active={wizard.tom === o.value}
            onClick={() => setWizard({ ...wizard, tom: o.value })} />
        ))}
      </div>
    </div>
  )
}

function StepEmoji({ wizard, setWizard }: { wizard: WizardState; setWizard: (w: WizardState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Você usa emoji nas mensagens?</p>
        <p className="text-xs text-gray-400 mt-0.5">O copilot vai seguir seu estilo.</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {EMOJI_OPTIONS.map(o => (
          <Chip key={o.value} label={o.label} active={wizard.emoji === o.value}
            onClick={() => setWizard({ ...wizard, emoji: o.value })} />
        ))}
      </div>
    </div>
  )
}

function StepTratamento({ wizard, setWizard }: { wizard: WizardState; setWizard: (w: WizardState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Como você chama o lead?</p>
        <p className="text-xs text-gray-400 mt-0.5">O copilot vai usar esse tratamento nas sugestões.</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TRATAMENTO_OPTIONS.map(o => (
          <Chip key={o.value} label={o.label} active={wizard.tratamento === o.value}
            onClick={() => setWizard({ ...wizard, tratamento: o.value, tratamentoCustom: '' })} />
        ))}
      </div>
      {wizard.tratamento === '__custom__' && (
        <input
          type="text" value={wizard.tratamentoCustom}
          onChange={e => setWizard({ ...wizard, tratamentoCustom: e.target.value })}
          placeholder="Ex: meu amigo, colega…"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
          style={{ borderColor: '#E5E7EB' }}
          autoFocus
        />
      )}
    </div>
  )
}

function StepFechamento({ wizard, setWizard }: { wizard: WizardState; setWizard: (w: WizardState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Qual é o seu encerramento favorito?</p>
        <p className="text-xs text-gray-400 mt-0.5">Como você costuma fechar suas mensagens.</p>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {FECHAMENTO_OPTIONS.map(o => (
          <Chip key={o.value} label={o.label} active={wizard.fechamento === o.value}
            onClick={() => setWizard({ ...wizard, fechamento: o.value, fechamentoCustom: '' })} />
        ))}
      </div>
      {wizard.fechamento === '__custom__' && (
        <input
          type="text" value={wizard.fechamentoCustom}
          onChange={e => setWizard({ ...wizard, fechamentoCustom: e.target.value })}
          placeholder="Escreva seu encerramento…"
          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
          style={{ borderColor: '#E5E7EB' }}
          autoFocus
        />
      )}
    </div>
  )
}

function StepExemplo({ wizard, setWizard }: { wizard: WizardState; setWizard: (w: WizardState) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Exemplo de mensagem sua (opcional)</p>
        <p className="text-xs text-gray-400 mt-0.5">Cole ou escreva uma mensagem típica. O copilot vai aprender seu estilo.</p>
      </div>
      <textarea
        value={wizard.exemplo}
        onChange={e => setWizard({ ...wizard, exemplo: e.target.value })}
        placeholder="Ex: Oi Doutor, tudo bem? Quero te apresentar uma solução que outros médicos da sua especialidade já usam com ótimo resultado…"
        rows={5}
        className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
        style={{ borderColor: '#E5E7EB' }}
      />
    </div>
  )
}

function StepPreview({ wizard }: { wizard: WizardState }) {
  const preview = buildStyleNotes(wizard)
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Tudo certo! Veja o resumo</p>
        <p className="text-xs text-gray-400 mt-0.5">Isso será salvo como suas "Notas de estilo" para o copilot.</p>
      </div>
      <div className="rounded-xl p-4 text-sm text-indigo-800 leading-relaxed"
        style={{ background: '#EEF2FF', border: '1px solid #C7D2FE' }}>
        {preview || <span className="text-gray-400 italic">Nenhuma preferência definida</span>}
      </div>
    </div>
  )
}

const STEP_LABELS = ['Tom', 'Emoji', 'Tratamento', 'Encerramento', 'Exemplo']

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  )

  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Profile fields
  const [name, setName] = useState('')
  const [verticalFocus, setVerticalFocus] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')
  const [defaultGreeting, setDefaultGreeting] = useState('')

  // Wizard
  const [wizard, setWizard] = useState<WizardState>(EMPTY_WIZARD)
  const [step, setStep] = useState(0)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [advancedText, setAdvancedText] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setEmail(user.email ?? '')
        const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (p) {
          const prof = p as Profile
          setProfile(prof)
          setName(prof.name)
          setVerticalFocus(prof.vertical_focus ?? '')
          setPhone(prof.phone ?? '')
          setWhatsappLink(prof.whatsapp_link ?? '')
          setDefaultGreeting(prof.default_greeting ?? '')
          const notes = prof.style_notes ?? ''
          setAdvancedText(notes)
          setWizard(parseStyleNotes(notes))
        }
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [supabase])

  const currentStyleNotes = showAdvanced ? advancedText : buildStyleNotes(wizard)

  async function handleSave() {
    if (!profile) return
    if (!name.trim()) { setToast({ type: 'error', message: 'Nome não pode ser vazio.' }); return }
    setSaving(true)
    try {
      await supabase.from('profiles').update({
        name: name.trim(),
        vertical_focus: verticalFocus || null,
        phone: phone || null,
        whatsapp_link: whatsappLink || null,
        default_greeting: defaultGreeting || null,
        style_notes: currentStyleNotes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id)
      setProfile(prev => prev ? {
        ...prev, name: name.trim(), vertical_focus: verticalFocus || null,
        phone: phone || null, whatsapp_link: whatsappLink || null,
        default_greeting: defaultGreeting || null, style_notes: currentStyleNotes || null,
      } : prev)
      setToast({ type: 'success', message: 'Perfil atualizado com sucesso!' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao salvar. Tente novamente.' })
    } finally { setSaving(false) }
  }

  function canAdvance(): boolean {
    if (step === 0) return !!wizard.tom
    if (step === 1) return !!wizard.emoji
    if (step === 2) return !!wizard.tratamento && (wizard.tratamento !== '__custom__' || !!wizard.tratamentoCustom.trim())
    if (step === 3) return !!wizard.fechamento && (wizard.fechamento !== '__custom__' || !!wizard.fechamentoCustom.trim())
    return true
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-xl">
        <SkeletonForm />
        <SkeletonForm />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Suas preferências e dados de perfil</p>
      </div>

      {/* Personal data */}
      <div className="bg-white border rounded-xl p-6 space-y-5"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h2 className="text-sm font-semibold text-gray-800">Dados pessoais</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome"
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
            style={{ borderColor: '#E5E7EB' }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail</label>
          <input type="email" value={email} disabled
            className="w-full px-3 py-2 border rounded-lg text-sm cursor-not-allowed"
            style={{ borderColor: '#E5E7EB', background: '#F9FAFB', color: '#9CA3AF' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical de foco</label>
            <select value={verticalFocus} onChange={e => setVerticalFocus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              style={{ borderColor: '#E5E7EB' }}>
              <option value="">Nenhuma</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 9xxxx-xxxx"
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
              style={{ borderColor: '#E5E7EB' }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Link do WhatsApp</label>
          <input type="text" value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)} placeholder="https://wa.me/5511..."
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
            style={{ borderColor: '#E5E7EB' }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saudação padrão</label>
          <input type="text" value={defaultGreeting} onChange={e => setDefaultGreeting(e.target.value)} placeholder="Ex: Olá, tudo bem?"
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
            style={{ borderColor: '#E5E7EB' }} />
        </div>
      </div>

      {/* Style wizard */}
      <div className="bg-white border rounded-xl p-6 space-y-5"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Estilo de comunicação</h2>
            <p className="text-xs text-gray-400 mt-0.5">O copilot adapta as respostas ao seu jeito de escrever.</p>
          </div>
          <button
            type="button" onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors flex-shrink-0"
          >
            <Pencil size={12} />
            {showAdvanced ? 'Usar wizard' : 'Modo avançado'}
          </button>
        </div>

        {showAdvanced ? (
          <div className="space-y-2">
            <textarea
              value={advancedText}
              onChange={e => setAdvancedText(e.target.value)}
              placeholder="Ex: Tom direto, nunca usa emoji, trata o lead como Doutor(a), encerra com 'Abraço e sucesso!'"
              rows={4}
              className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
              style={{ borderColor: '#E5E7EB' }}
            />
            <p className="text-[11px] text-gray-400">Escreva livremente o estilo de comunicação que o copilot deve seguir.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Passo {Math.min(step + 1, TOTAL_STEPS)} de {TOTAL_STEPS}</span>
                <span className="text-xs font-medium text-indigo-600">{STEP_LABELS[Math.min(step, TOTAL_STEPS - 1)]}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${((Math.min(step, TOTAL_STEPS - 1) + 1) / TOTAL_STEPS) * 100}%` }}
                />
              </div>
            </div>

            {/* Step content */}
            <div className="min-h-[160px]">
              {step === 0 && <StepTom wizard={wizard} setWizard={setWizard} />}
              {step === 1 && <StepEmoji wizard={wizard} setWizard={setWizard} />}
              {step === 2 && <StepTratamento wizard={wizard} setWizard={setWizard} />}
              {step === 3 && <StepFechamento wizard={wizard} setWizard={setWizard} />}
              {step === 4 && <StepExemplo wizard={wizard} setWizard={setWizard} />}
              {step >= TOTAL_STEPS && <StepPreview wizard={wizard} />}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button" onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} /> Voltar
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button" onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  className="flex items-center gap-1.5 text-sm font-medium text-white px-4 py-2 rounded-lg transition-all disabled:opacity-40"
                  style={{ background: '#6366F1' }}
                >
                  {step === TOTAL_STEPS - 1 ? 'Ver resumo' : 'Próximo'} <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button" onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  <Pencil size={14} /> Editar respostas
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-all hover:scale-[1.01]"
          style={{ background: '#6366F1' }}
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Salvando…</>
            : <><Save size={14} /> Salvar alterações</>
          }
        </button>
      </div>
    </div>
  )
}
