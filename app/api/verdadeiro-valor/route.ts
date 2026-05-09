import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const [vvRes, bnsRes] = await Promise.all([
      admin.from('verdadeiro_valor').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('big_numbers').select('*').eq('is_active', true).order('label'),
    ])
    if (vvRes.error) return NextResponse.json({ error: vvRes.error.message }, { status: 500 })
    if (bnsRes.error) return NextResponse.json({ error: bnsRes.error.message }, { status: 500 })
    return NextResponse.json({ vv: vvRes.data, bns: bnsRes.data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id, content } = await request.json()
    const admin = createAdminClient()

    if (id) {
      const { error } = await admin.from('verdadeiro_valor').update({ content, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      const { data, error } = await admin.from('verdadeiro_valor').insert({ content, updated_at: new Date().toISOString() }).select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
