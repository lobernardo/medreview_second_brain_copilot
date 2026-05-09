import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { objection_id, response_text } = await request.json()
    if (!objection_id || !response_text?.trim()) {
      return NextResponse.json({ error: 'objection_id and response_text required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('user_objection_responses')
      .upsert(
        { user_id: user.id, objection_id, response_text: response_text.trim(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id,objection_id' },
      )
      .select('id,user_id,objection_id,response_text')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, data })
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
    const { error } = await admin.from('user_objection_responses').delete().eq('id', id).eq('user_id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
