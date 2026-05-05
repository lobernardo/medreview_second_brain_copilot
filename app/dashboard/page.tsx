import { createClient } from '@/lib/supabase/server'
import DashboardClient from '@/components/dashboard/dashboard-client'

export default async function DashboardPage() {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  } catch {
    /* Supabase not configured */
  }
  return <DashboardClient userId={userId} />
}
