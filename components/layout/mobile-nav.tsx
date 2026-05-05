'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Bot, GraduationCap, Mail, MoreHorizontal } from 'lucide-react'
import type { Profile } from '@/lib/utils/types'

type Role = 'closer' | 'gestor' | 'onboarding'

interface MobileNavProps {
  profile: Profile | null
}

const vendas = { href: '/copilot-vendas', label: 'Vendas', icon: Bot, roles: ['closer', 'gestor'] as Role[] }
const onboarding = { href: '/copilot-onboarding', label: 'Onboarding', icon: GraduationCap, roles: ['onboarding', 'gestor'] as Role[] }
const copys = { href: '/copys', label: 'Copys', icon: Mail, roles: ['closer', 'gestor'] as Role[] }

function getItems(role: Role) {
  const base = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['closer', 'gestor', 'onboarding'] as Role[] },
  ]
  if (role === 'onboarding') base.push(onboarding)
  else base.push(vendas)
  base.push(copys)
  return base.filter((item) => item.roles.includes(role))
}

export default function MobileNav({ profile }: MobileNavProps) {
  const pathname = usePathname()
  const role: Role = (profile?.role as Role) || 'closer'
  const items = getItems(role)

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E7EB] z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg min-w-[56px] transition-colors duration-150',
                isActive ? 'text-[#6366F1]' : 'text-[#9CA3AF]',
              ].join(' ')}
            >
              <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
              <span className={['text-[10px]', isActive ? 'font-semibold' : 'font-normal'].join(' ')}>
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Menu shortcut */}
        <Link
          href="/settings"
          className={[
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg min-w-[56px] transition-colors duration-150',
            pathname === '/settings' ? 'text-[#6366F1]' : 'text-[#9CA3AF]',
          ].join(' ')}
        >
          <MoreHorizontal size={22} strokeWidth={1.5} />
          <span className="text-[10px]">Menu</span>
        </Link>
      </div>
    </nav>
  )
}
