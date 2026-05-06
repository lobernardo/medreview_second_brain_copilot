'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Toast } from '@/components/ui/toast'

type View = 'login' | 'reset' | 'signup'

const INPUT_STYLE = {
  base: 'w-full px-3 py-2 text-sm text-[#111827] bg-white rounded-lg placeholder:text-[#9CA3AF] transition-colors outline-none',
  border: '1px solid #E5E7EB',
}

function Field({
  label, type = 'text', value, onChange, placeholder, required = true,
}: {
  label: string; type?: string; value: string
  onChange: (v: string) => void; placeholder: string; required?: boolean
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className={INPUT_STYLE.base}
        style={{ border: INPUT_STYLE.border }}
        onFocus={(e) => {
          e.currentTarget.style.border = '1px solid #6366F1'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.border = INPUT_STYLE.border
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [view, setView] = useState<View>('login')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Login
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  // Reset
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Signup
  const [signupName, setSignupName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPassword, setSignupPassword] = useState('')
  const [signupError, setSignupError] = useState('')
  const [signupLoading, setSignupLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword })
    if (error) {
      setLoginError(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
      setLoginLoading(false)
    } else {
      router.push('/copilot-vendas')
      router.refresh()
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setResetLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail)
    setResetLoading(false)
    if (error) {
      setToast({ type: 'error', message: 'Erro ao enviar e-mail. Tente novamente.' })
    } else {
      setToast({ type: 'success', message: 'Link enviado para seu email.' })
      setResetEmail('')
      setTimeout(() => setView('login'), 2500)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!signupName.trim()) { setSignupError('Nome é obrigatório.'); return }
    if (signupPassword.length < 6) { setSignupError('A senha precisa ter pelo menos 6 caracteres.'); return }
    setSignupLoading(true)
    setSignupError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: { data: { name: signupName.trim() } },
    })
    setSignupLoading(false)
    if (error) {
      setSignupError(error.message === 'User already registered' ? 'Este e-mail já está cadastrado.' : error.message)
    } else {
      setToast({ type: 'success', message: 'Conta criada! Faça login.' })
      setSignupName(''); setSignupEmail(''); setSignupPassword('')
      setTimeout(() => setView('login'), 2000)
    }
  }

  const VIEWS: Record<View, { title: string; subtitle: string }> = {
    login:  { title: 'Bem-vindo de volta',   subtitle: 'Entre com suas credenciais para continuar' },
    reset:  { title: 'Recuperar senha',       subtitle: 'Enviaremos um link para redefinir sua senha' },
    signup: { title: 'Criar conta',           subtitle: 'Preencha os dados para acessar o Copilot' },
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#F9FAFB' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)' }}
          >
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">Med-Review</h1>
          <p className="text-xs font-semibold tracking-[0.2em] uppercase mt-1" style={{ color: '#6366F1' }}>
            Copilot
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[12px] p-8"
          style={{ border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <h2 className="text-base font-semibold text-[#111827] mb-1">{VIEWS[view].title}</h2>
          <p className="text-sm text-[#6B7280] mb-6">{VIEWS[view].subtitle}</p>

          {/* ── LOGIN ─────────────────────────────── */}
          {view === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="E-mail" type="email" value={loginEmail} onChange={setLoginEmail} placeholder="seu@email.com" />
              <Field label="Senha" type="password" value={loginPassword} onChange={setLoginPassword} placeholder="••••••••" />

              {loginError && (
                <div className="text-xs rounded-lg px-3 py-2.5" style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                  {loginError}
                </div>
              )}

              <button
                type="submit" disabled={loginLoading}
                className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-all duration-150 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: loginLoading ? '#818CF8' : '#6366F1' }}
                onMouseEnter={(e) => { if (!loginLoading) e.currentTarget.style.background = '#4F46E5' }}
                onMouseLeave={(e) => { if (!loginLoading) e.currentTarget.style.background = '#6366F1' }}
              >
                {loginLoading ? 'Entrando...' : 'Entrar'}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { setView('reset'); setLoginError('') }}
                  className="text-[12px] text-[#6366F1] hover:underline"
                >
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  onClick={() => { setView('signup'); setLoginError('') }}
                  className="text-[12px] text-[#6366F1] hover:underline"
                >
                  Criar conta
                </button>
              </div>
            </form>
          )}

          {/* ── RESET ─────────────────────────────── */}
          {view === 'reset' && (
            <form onSubmit={handleReset} className="space-y-4">
              <Field label="E-mail" type="email" value={resetEmail} onChange={setResetEmail} placeholder="seu@email.com" />

              <button
                type="submit" disabled={resetLoading}
                className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-all duration-150 disabled:opacity-60"
                style={{ background: resetLoading ? '#818CF8' : '#6366F1' }}
                onMouseEnter={(e) => { if (!resetLoading) e.currentTarget.style.background = '#4F46E5' }}
                onMouseLeave={(e) => { if (!resetLoading) e.currentTarget.style.background = '#6366F1' }}
              >
                {resetLoading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>

              <button type="button" onClick={() => setView('login')} className="w-full text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors pt-1">
                ← Voltar para o login
              </button>
            </form>
          )}

          {/* ── SIGNUP ────────────────────────────── */}
          {view === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <Field label="Nome" value={signupName} onChange={setSignupName} placeholder="Seu nome completo" />
              <Field label="E-mail" type="email" value={signupEmail} onChange={setSignupEmail} placeholder="seu@email.com" />
              <Field label="Senha" type="password" value={signupPassword} onChange={setSignupPassword} placeholder="Mínimo 6 caracteres" />

              {signupError && (
                <div className="text-xs rounded-lg px-3 py-2.5" style={{ background: '#FEF2F2', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                  {signupError}
                </div>
              )}

              <button
                type="submit" disabled={signupLoading}
                className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-all duration-150 disabled:opacity-60"
                style={{ background: signupLoading ? '#818CF8' : '#6366F1' }}
                onMouseEnter={(e) => { if (!signupLoading) e.currentTarget.style.background = '#4F46E5' }}
                onMouseLeave={(e) => { if (!signupLoading) e.currentTarget.style.background = '#6366F1' }}
              >
                {signupLoading ? 'Criando conta...' : 'Criar conta'}
              </button>

              <button type="button" onClick={() => { setView('login'); setSignupError('') }} className="w-full text-[12px] text-[#9CA3AF] hover:text-[#6B7280] transition-colors pt-1">
                ← Voltar para o login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">
          Grupo Med-Review · Sistema interno
        </p>
      </div>
    </div>
  )
}
