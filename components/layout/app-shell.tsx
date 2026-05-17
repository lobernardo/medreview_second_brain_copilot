'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './sidebar'
import Header from './header'
import MobileNav from './mobile-nav'
import { ProfileProvider } from '@/lib/context/profile-context'
import type { Profile } from '@/lib/utils/types'

interface AppShellProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  profile: Profile | null
  children: React.ReactNode
}

export default function AppShell({ user, profile, children }: AppShellProps) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login'

  if (isAuthPage || !user) {
    return <>{children}</>
  }

  return (
    <ProfileProvider profile={profile}>
      <div className="flex h-full overflow-hidden">
        {/* Sidebar — lg+ */}
        <div className="hidden lg:flex lg:flex-shrink-0">
          <Sidebar profile={profile} />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <Header user={user} profile={profile} />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-[#F9FAFB] p-4 pb-20 lg:p-6 lg:pb-6">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <MobileNav profile={profile} />
      </div>
    </ProfileProvider>
  )
}
