import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  return { error: null, status: 200 as const }
}

async function requireGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 as const }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'gestor') return { error: 'Forbidden', status: 403 as const }
  return { error: null, status: 200 as const }
}

export async function GET() {
  try {
    const { error, status } = await requireAuth()
    if (error) return NextResponse.json({ error }, { status })

    const admin = createAdminClient()
    const { data } = await admin
      .from('onboarding_config')
      .select('id, trail, custom_instructions, welcome_message, tone')
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ data: data ?? null })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { error, status } = await requireGestor()
    if (error) return NextResponse.json({ error }, { status })

    const admin = createAdminClient()
    const body = await request.json()
    const { id, ...payload } = body

    if (id) {
      const { error: upErr } = await admin
        .from('onboarding_config')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      const { data, error: insErr } = await admin
        .from('onboarding_config')
        .insert({ ...payload, updated_at: new Date().toISOString() })
        .select('id')
        .single()
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
