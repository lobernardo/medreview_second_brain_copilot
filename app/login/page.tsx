'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : authError.message
      )
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: '#F9FAFB' }}
    >
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)' }}
          >
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-[22px] font-bold text-[#111827] tracking-tight">
            Med-Review
          </h1>
          <p
            className="text-xs font-semibold tracking-[0.2em] uppercase mt-1"
            style={{ color: '#6366F1' }}
          >
            Copilot
          </p>
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-[12px] p-8"
          style={{
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <h2 className="text-base font-semibold text-[#111827] mb-1">
            Bem-vindo de volta
          </h2>
          <p className="text-sm text-[#6B7280] mb-6">
            Entre com suas credenciais para continuar
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-3 py-2 text-sm text-[#111827] bg-white rounded-lg placeholder:text-[#9CA3AF] transition-colors outline-none"
                style={{
                  border: '1px solid #E5E7EB',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid #6366F1'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid #E5E7EB'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[#9CA3AF] mb-1.5">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3 py-2 text-sm text-[#111827] bg-white rounded-lg placeholder:text-[#9CA3AF] transition-colors outline-none"
                style={{ border: '1px solid #E5E7EB' }}
                onFocus={(e) => {
                  e.currentTarget.style.border = '1px solid #6366F1'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = '1px solid #E5E7EB'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>

            {error && (
              <div
                className="text-xs rounded-lg px-3 py-2.5"
                style={{
                  background: '#FEF2F2',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#EF4444',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white text-sm font-medium py-2.5 rounded-lg transition-all duration-150 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: loading ? '#818CF8' : '#6366F1',
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = '#4F46E5'
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = '#6366F1'
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">
          Grupo Med-Review · Sistema interno
        </p>
      </div>
    </div>
  )
}
