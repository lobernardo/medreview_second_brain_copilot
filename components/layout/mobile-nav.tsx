'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bot,
  GraduationCap,
  Mail,
  NotebookPen,
  HelpCircle,
  Shield,
  BookOpen,
  Settings2,
  Settings,
  Menu,
  X,
  MessageSquareText,
} from 'lucide-react'
import type { Profile } from '@/lib/utils/types'

type Role = 'closer' | 'gestor' | 'onboarding'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const ALL_ITEMS: Record<string, NavItem> = {
  vendas:     { href: '/copilot-vendas',    label: 'Copilot',     icon: Bot },
  onboarding: { href: '/copilot-onboarding', label: 'Onboarding', icon: GraduationCap },
  copys:      { href: '/copys',             label: 'Copys',       icon: Mail },
  leads:      { href: '/leads',             label: 'Radar',       icon: NotebookPen },
  templates:  { href: '/templates',         label: 'Templates',   icon: MessageSquareText },
  faq:        { href: '/faq',               label: 'FAQ',         icon: HelpCircle },
  objecoes:   { href: '/objecoes',          label: 'Objeções',    icon: Shield },
  kb:         { href: '/kb',                label: 'KB',          icon: BookOpen },
  config:     { href: '/onboarding-config', label: 'Config',      icon: Settings2 },
  settings:   { href: '/settings',          label: 'Config',      icon: Settings },
}

const BOTTOM_ITEMS: Record<Role, string[]> = {
  closer:     ['vendas', 'copys', 'leads', 'faq'],
  gestor:     ['vendas', 'onboarding', 'copys', 'leads'],
  onboarding: ['onboarding', 'faq', 'kb', 'settings'],
}

const DRAWER_ITEMS: Record<Role, string[]> = {
  closer:     ['templates', 'objecoes', 'kb', 'settings'],
  gestor:     ['templates', 'faq', 'objecoes', 'kb', 'config', 'settings'],
  onboarding: [],
}

export default function MobileNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname()
  const role: Role = (profile?.role as Role) || 'closer'
  const [drawerOpen, setDrawerOpen] = useState(false)

  const bottomKeys = BOTTOM_ITEMS[role]
  const drawerKeys = DRAWER_ITEMS[role]

  function NavLink({ itemKey, onClick }: { itemKey: string; onClick?: () => void }) {
    const item = ALL_ITEMS[itemKey]
    if (!item) return null
    const Icon = item.icon
    const isActive = pathname === item.href
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={[
          'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] transition-colors duration-150',
          isActive ? 'text-[#6366F1]' : 'text-[#9CA3AF]',
        ].join(' ')}
      >
        <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
        <span className={['text-[10px] leading-none', isActive ? 'font-semibold' : 'font-normal'].join(' ')}>
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <>
      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t z-50" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center justify-around px-1 py-1.5 pb-safe">
          {bottomKeys.map(key => (
            <NavLink key={key} itemKey={key} />
          ))}

          {/* Menu button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] text-[#9CA3AF] transition-colors duration-150"
          >
            <Menu size={22} strokeWidth={1.5} />
            <span className="text-[10px] leading-none font-normal">Menu</span>
          </button>
        </div>
      </nav>

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-[60]"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={[
          'lg:hidden fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-2xl transition-transform duration-300 ease-out',
          drawerOpen ? 'translate-y-0' : 'translate-y-full',
        ].join(' ')}
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: '#F3F4F6' }}>
          <div>
            <span className="text-sm font-semibold text-gray-900">Med-Review</span>
            {profile && <span className="ml-2 text-xs text-gray-400 capitalize">{profile.name}</span>}
          </div>
          <button onClick={() => setDrawerOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Drawer items */}
        <div className="px-4 py-4 grid grid-cols-4 gap-2 pb-safe">
          {drawerKeys.map(key => {
            const item = ALL_ITEMS[key]
            if (!item) return null
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={key}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-colors"
                style={isActive
                  ? { background: '#EEF2FF', color: '#6366F1' }
                  : { background: '#F9FAFB', color: '#6B7280' }
                }
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className={['text-[11px] text-center leading-tight', isActive ? 'font-semibold' : ''].join(' ')}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>

        {/* Safe area spacer for iOS */}
        <div className="h-5" />
      </div>
    </>
  )
}
