import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function extractSnippet(content: string): string {
  const first = content.indexOf('\n\n')
  const second = first >= 0 ? content.indexOf('\n\n', first + 2) : -1
  const twoParas = second >= 0 ? content.slice(0, second) : content
  if (twoParas.length <= 500) return twoParas.trim()
  return twoParas.slice(0, 500).trimEnd() + '…'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('knowledge_base')
      .select('id, title, content')
      .in('category', ['tecnica-comercial', 'playbook'])
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ data: null })

    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
    const raw = data[dayOfYear % data.length]
    const tip = { ...raw, content: extractSnippet(raw.content) }

    return NextResponse.json({ data: tip })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
