import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: products, error } = await admin
      .from('knowledge_base')
      .select('id, title, category, vertical, content, tags, is_active, updated_at')
      .in('category', ['produto', 'feature'])
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const kbIds = (products ?? []).map(p => p.id)
    let detailsMap: Record<string, unknown> = {}
    if (kbIds.length > 0) {
      const { data: details } = await admin
        .from('product_details')
        .select('*')
        .in('kb_id', kbIds)
      if (details) {
        detailsMap = Object.fromEntries(details.map((d: Record<string, unknown>) => [d.kb_id as string, d]))
      }
    }

    const data = (products ?? []).map(p => ({
      ...p,
      commercial: detailsMap[p.id] ?? null,
    }))

    return NextResponse.json({ data })
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
    const { kb_id, icp, pitch, commercial_copy, price, access_duration,
            payment_conditions, when_to_use, when_not_to_use, objections, strategy_notes } = body

    if (!kb_id) return NextResponse.json({ error: 'kb_id required' }, { status: 400 })

    const admin = createAdminClient()

    const { data: existing } = await admin
      .from('product_details')
      .select('id')
      .eq('kb_id', kb_id)
      .maybeSingle()

    const payload = {
      kb_id,
      icp:                 icp                 ?? null,
      pitch:               pitch               ?? null,
      commercial_copy:     commercial_copy     ?? null,
      price:               price               ?? null,
      access_duration:     access_duration     ?? null,
      payment_conditions:  payment_conditions  ?? null,
      when_to_use:         when_to_use         ?? null,
      when_not_to_use:     when_not_to_use     ?? null,
      objections:          objections          ?? null,
      strategy_notes:      strategy_notes      ?? null,
      updated_at:          new Date().toISOString(),
    }

    if (existing) {
      const { error } = await admin.from('product_details').update(payload).eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: { id: existing.id } })
    } else {
      const { data, error } = await admin.from('product_details').insert(payload).select('id').single()
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
    const { error } = await admin.from('knowledge_base').update({ is_active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
