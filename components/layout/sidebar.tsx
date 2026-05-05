'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Bot,
  GraduationCap,
  Flame,
  FileText,
  Mail,
  HelpCircle,
  Shield,
  BookOpen,
  Target,
  Settings2,
  Settings,
} from 'lucide-react'
import type { Profile } from '@/lib/utils/types'

type Role = 'closer' | 'gestor' | 'onboarding'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: Role[]
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['closer', 'gestor', 'onboarding'] },
  { href: '/copilot-vendas', label: 'Copilot Vendas', icon: Bot, roles: ['closer', 'gestor'] },
  { href: '/copilot-onboarding', label: 'Copilot Onboarding', icon: GraduationCap, roles: ['onboarding', 'gestor'] },
  { href: '/leads', label: 'Leads quentes', icon: Flame, roles: ['closer', 'gestor'] },
  { href: '/logs', label: 'Logs', icon: FileText, roles: ['closer', 'gestor'] },
  { href: '/copys', label: 'Copys', icon: Mail, roles: ['closer', 'gestor'] },
  { href: '/faq', label: 'FAQ', icon: HelpCircle, roles: ['closer', 'gestor', 'onboarding'] },
  { href: '/objecoes', label: 'Objeções', icon: Shield, roles: ['closer', 'gestor', 'onboarding'] },
  { href: '/kb', label: 'Knowledge Base', icon: BookOpen, roles: ['closer', 'gestor', 'onboarding'] },
  { href: '/priorities', label: 'Prioridades', icon: Target, roles: ['gestor'] },
  { href: '/onboarding-config', label: 'Config Onboarding', icon: Settings2, roles: ['gestor'] },
  { href: '/settings', label: 'Configurações', icon: Settings, roles: ['closer', 'gestor', 'onboarding'] },
]

interface SidebarProps {
  profile: Profile | null
}

export default function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const role: Role = (profile?.role as Role) || 'closer'

  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <aside
      className="w-60 flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #1E1B4B 0%, #2D2A7A 100%)' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10 flex-shrink-0">
        <div className="text-white font-bold text-base tracking-widest uppercase">
          Med-Review
        </div>
        <div className="text-indigo-300 text-[11px] font-medium tracking-[0.2em] uppercase mt-0.5">
          Copilot
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-[#4338CA] text-white font-medium'
                  : 'text-[#C7D2FE] hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* User footer */}
      {profile && (
        <div className="px-4 py-4 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-400/25 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white uppercase">
                {profile.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {profile.name}
              </div>
              <div className="text-[11px] text-indigo-300 capitalize">{profile.role}</div>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
