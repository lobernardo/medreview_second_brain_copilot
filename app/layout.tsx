import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/app-shell'
import type { Profile } from '@/lib/utils/types'

export const metadata: Metadata = {
  title: 'Med-Review Copilot',
  description: 'Sistema interno de inteligência comercial',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let profile: Profile | null = null

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user

    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      profile = profileData
    }
  } catch {
    // Supabase not configured yet — dev mode
  }

  return (
    <html lang="pt-BR" className="h-full">
      <body className="h-full antialiased">
        <AppShell user={user} profile={profile}>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
