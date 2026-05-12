'use client'

import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/utils/types'

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/copilot-vendas': 'Copilot Vendas',
  '/copilot-onboarding': 'Copilot Onboarding',
  '/leads': 'No Radar',
  '/copys': 'Copys & Macros',
  '/templates': 'Templates',
  '/faq': 'FAQ',
  '/objecoes': 'Matriz de Objeções',
  '/kb': 'Knowledge Base',
  '/verdadeiro-valor': 'Verdadeiro Valor',
  '/agenda': 'Agenda',
  '/produtos': 'Catálogo de Produtos',
  '/onboarding-config': 'Config Onboarding',
  '/settings': 'Configurações',
}

interface HeaderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  profile: Profile | null
}

export default function Header({ user, profile }: HeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const title = pageTitles[pathname] || 'Med-Review Second Brain'
  const displayName = profile?.name || user?.email || ''

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-[#E5E7EB] px-6 h-14 flex items-center justify-between flex-shrink-0">
      <h1 className="text-[15px] font-semibold text-[#111827]">{title}</h1>

      <div className="flex items-center gap-3">
        {displayName && (
          <span className="text-sm text-[#6B7280] hidden sm:block">{displayName}</span>
        )}
        <button
          onClick={handleSignOut}
          className="p-2 text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors duration-150"
          title="Sair"
        >
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </div>
    </header>
  )
}
