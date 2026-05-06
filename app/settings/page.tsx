'use client'

import { useState, useEffect, useMemo } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Loader2, Save } from 'lucide-react'
import { Toast } from '@/components/ui/toast'
import { SkeletonForm } from '@/components/ui/skeleton'
import type { Profile } from '@/lib/utils/types'

const VERTICALS = ['R1', 'Anest', 'Oft', 'Ortop']

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

  const [name, setName] = useState('')
  const [verticalFocus, setVerticalFocus] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsappLink, setWhatsappLink] = useState('')
  const [defaultGreeting, setDefaultGreeting] = useState('')
  const [styleNotes, setStyleNotes] = useState('')

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
          setStyleNotes(prof.style_notes ?? '')
        }
      } catch {} finally { setLoading(false) }
    }
    load()
  }, [supabase])

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
        style_notes: styleNotes || null,
        updated_at: new Date().toISOString(),
      }).eq('id', profile.id)
      setProfile(prev => prev ? {
        ...prev,
        name: name.trim(),
        vertical_focus: verticalFocus || null,
        phone: phone || null,
        whatsapp_link: whatsappLink || null,
        default_greeting: defaultGreeting || null,
        style_notes: styleNotes || null,
      } : prev)
      setToast({ type: 'success', message: 'Perfil atualizado com sucesso!' })
    } catch {
      setToast({ type: 'error', message: 'Erro ao salvar. Tente novamente.' })
    } finally { setSaving(false) }
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
      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Configurações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Suas preferências e dados de perfil</p>
      </div>

      <div
        className="bg-white border rounded-xl p-6 space-y-5"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <h2 className="text-sm font-semibold text-gray-800">Dados pessoais</h2>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nome</label>
          <input
            type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-800 focus:ring-2 focus:ring-indigo-200 outline-none"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">E-mail</label>
          <input
            type="email" value={email} disabled
            className="w-full px-3 py-2 border rounded-lg text-sm cursor-not-allowed"
            style={{ borderColor: '#E5E7EB', background: '#F9FAFB', color: '#9CA3AF' }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vertical de foco</label>
            <select
              value={verticalFocus} onChange={e => setVerticalFocus(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none bg-white"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="">Nenhuma</option>
              {VERTICALS.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Telefone</label>
            <input
              type="text" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="(11) 9xxxx-xxxx"
              className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Link do WhatsApp</label>
          <input
            type="text" value={whatsappLink} onChange={e => setWhatsappLink(e.target.value)}
            placeholder="https://wa.me/5511..."
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>
      </div>

      <div
        className="bg-white border rounded-xl p-6 space-y-5"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Preferências do Copilot</h2>
          <p className="text-xs text-gray-400 mt-0.5">O copilot usa essas informações ao gerar respostas personalizadas para você.</p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Saudação padrão</label>
          <input
            type="text" value={defaultGreeting} onChange={e => setDefaultGreeting(e.target.value)}
            placeholder="Ex: Olá, tudo bem?"
            className="w-full px-3 py-2 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Notas de estilo</label>
          <textarea
            value={styleNotes} onChange={e => setStyleNotes(e.target.value)}
            placeholder="Ex: direto, sem emoji, usa 'doutor', fecha com 'abraço e sucesso'"
            rows={4}
            className="w-full px-3 py-2.5 border rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-indigo-200 outline-none resize-none"
            style={{ borderColor: '#E5E7EB' }}
          />
          <p className="text-[11px] text-gray-400">Descreva seu estilo de comunicação. O copilot adaptará as respostas ao seu tom.</p>
        </div>
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
