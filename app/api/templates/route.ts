import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const [templatesRes, favsRes] = await Promise.all([
      admin.from('whatsapp_templates').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      admin.from('user_favorite_templates').select('id,user_id,template_id').eq('user_id', user.id),
    ])
    if (templatesRes.error) return NextResponse.json({ error: templatesRes.error.message }, { status: 500 })
    if (favsRes.error) return NextResponse.json({ error: favsRes.error.message }, { status: 500 })
    return NextResponse.json({ templates: templatesRes.data, favorites: favsRes.data })
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
      const { error } = await admin.from('whatsapp_templates').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      const { data, error } = await admin.from('whatsapp_templates').insert({ ...payload, updated_at: new Date().toISOString() }).select('id,created_at').single()
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
    const { error } = await admin.from('whatsapp_templates').update({ is_active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
