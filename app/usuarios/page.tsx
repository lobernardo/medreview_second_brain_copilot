'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Loader2, AlertCircle } from 'lucide-react'
import { useProfile } from '@/lib/context/profile-context'

type Role = 'closer' | 'gestor' | 'onboarding'

interface UserRow {
  id: string
  name: string
  email: string
  role: Role
  created_at: string
}

const ROLE_LABELS: Record<Role, string> = {
  closer: 'Closer',
  gestor: 'Gestor',
  onboarding: 'Onboarding',
}

const ROLE_BADGE: Record<Role, string> = {
  gestor: 'bg-indigo-100 text-indigo-700',
  closer: 'bg-emerald-100 text-emerald-700',
  onboarding: 'bg-amber-100 text-amber-700',
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'closer', label: 'Closers' },
  { value: 'gestor', label: 'Gestores' },
  { value: 'onboarding', label: 'Onboarding' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function UsuariosPage() {
  const currentUser = useProfile()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRole, setFilterRole] = useState('all')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    fetch('/api/usuarios')
      .then((r) => r.json())
      .then((json) => { setUsers(json.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleRoleChange(userId: string, newRole: Role) {
    setSaving((prev) => ({ ...prev, [userId]: true }))
    setErrors((prev) => { const next = { ...prev }; delete next[userId]; return next })

    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, role: newRole }),
    })
    const json = await res.json()

    setSaving((prev) => ({ ...prev, [userId]: false }))

    if (!res.ok) {
      setErrors((prev) => ({ ...prev, [userId]: json.error ?? 'Erro ao salvar' }))
    } else {
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filterRole !== 'all' && u.role !== filterRole) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      }
      return true
    })
  }, [users, filterRole, search])

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Gestão de Usuários</h1>
        <p className="text-sm text-gray-500 mt-1">
          Visualize e altere o role de acesso de cada usuário.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email…"
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-200 transition-shadow placeholder-gray-400"
            style={{ borderColor: '#E5E7EB' }}
          />
        </div>

        {/* Role filter pills */}
        <div className="flex gap-1.5">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilterRole(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                filterRole === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border text-gray-600 hover:border-indigo-200 hover:text-indigo-600'
              }`}
              style={filterRole !== opt.value ? { borderColor: '#E5E7EB' } : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <section
        className="bg-white border rounded-xl overflow-hidden"
        style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Carregando usuários...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {search || filterRole !== 'all' ? 'Nenhum usuário encontrado para este filtro.' : 'Nenhum usuário cadastrado.'}
          </div>
        ) : (
          <>
            {/* Table header */}
            <div
              className="grid grid-cols-[1fr_1.4fr_120px_90px_140px] gap-4 px-6 py-3 border-b text-[11px] font-semibold text-gray-500 uppercase tracking-wide"
              style={{ borderColor: '#E5E7EB' }}
            >
              <span>Nome</span>
              <span>Email</span>
              <span>Role atual</span>
              <span>Criado em</span>
              <span>Alterar role</span>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
              {filtered.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-[1fr_1.4fr_120px_90px_140px] gap-4 items-center px-6 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    {/* Name */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: '#6366F1' }}
                      >
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {u.name}
                        {isSelf && <span className="ml-1.5 text-[10px] text-gray-400 font-normal">(você)</span>}
                      </span>
                    </div>

                    {/* Email */}
                    <span className="text-sm text-gray-500 truncate">{u.email || '—'}</span>

                    {/* Current role badge */}
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${ROLE_BADGE[u.role]}`}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </div>

                    {/* Created at */}
                    <span className="text-[12px] text-gray-400">{formatDate(u.created_at)}</span>

                    {/* Role change */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={u.role}
                          disabled={isSelf || saving[u.id]}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                          className={`text-sm border rounded-lg px-3 py-1.5 outline-none appearance-none pr-7 transition-all ${
                            isSelf
                              ? 'opacity-40 cursor-not-allowed bg-gray-50'
                              : 'bg-white hover:border-indigo-300 focus:ring-2 focus:ring-indigo-200 cursor-pointer'
                          }`}
                          style={{ borderColor: '#E5E7EB' }}
                          title={isSelf ? 'Você não pode alterar seu próprio role' : undefined}
                        >
                          <option value="closer">Closer</option>
                          <option value="gestor">Gestor</option>
                          <option value="onboarding">Onboarding</option>
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                      {saving[u.id] && <Loader2 size={13} className="animate-spin text-indigo-400 flex-shrink-0" />}
                    </div>

                    {/* Inline error — full row span */}
                    {errors[u.id] && (
                      <div className="col-span-5 -mt-2 pb-1 px-0 flex items-center gap-1.5 text-[12px] text-red-500">
                        <AlertCircle size={12} />
                        {errors[u.id]}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer count */}
            <div className="px-6 py-3 border-t text-[11px] text-gray-400" style={{ borderColor: '#F3F4F6' }}>
              {filtered.length} usuário{filtered.length !== 1 ? 's' : ''}
              {filterRole !== 'all' || search ? ` (de ${users.length} no total)` : ''}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
