import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const [patternsRes, responsesRes] = await Promise.all([
      admin
        .from('objection_patterns')
        .select('id,topic,definition,real_meaning,vertical,recommended_response,what_not_to_say,proof_points,times_seen_total,win_rate,updated_at')
        .order('times_seen_total', { ascending: false }),
      admin
        .from('user_objection_responses')
        .select('id,user_id,objection_id,response_text')
        .eq('user_id', user.id),
    ])
    if (patternsRes.error) return NextResponse.json({ error: patternsRes.error.message }, { status: 500 })
    if (responsesRes.error) return NextResponse.json({ error: responsesRes.error.message }, { status: 500 })
    return NextResponse.json({ patterns: patternsRes.data, responses: responsesRes.data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { id, ...payload } = body
    const admin = createAdminClient()

    if (id) {
      const { error } = await admin.from('objection_patterns').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      const { data, error } = await admin.from('objection_patterns').insert({ ...payload, updated_at: new Date().toISOString() }).select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('objection_patterns').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
