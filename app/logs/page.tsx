import { createClient } from '@/lib/supabase/server'
import LogsClient from '@/components/logs/logs-client'

export default async function LogsPage() {
  let userId: string | undefined
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  } catch {
    /* Supabase not configured */
  }
  return <LogsClient userId={userId} />
}
