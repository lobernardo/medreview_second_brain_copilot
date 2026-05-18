import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function requireGestor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401, user: null }
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'gestor') return { error: 'Forbidden', status: 403, user: null }
  return { error: null, status: 200, user }
}

export async function GET() {
  try {
    const { error, status, user } = await requireGestor()
    if (error || !user) return NextResponse.json({ error }, { status })

    const admin = createAdminClient()

    const [{ data: profiles, error: profilesError }, authResult] = await Promise.all([
      admin.from('profiles').select('id, name, role, created_at').order('created_at', { ascending: false }),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ])

    if (profilesError) return NextResponse.json({ error: profilesError.message }, { status: 500 })

    const emailMap = new Map(authResult.data.users.map((u) => [u.id, u.email ?? '']))

    const data = (profiles ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      email: emailMap.get(p.id) ?? '',
      role: p.role,
      created_at: p.created_at,
    }))

    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: requester } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (requester?.role !== 'gestor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { user_id, role } = await request.json()
    if (!user_id || !role) return NextResponse.json({ error: 'user_id and role required' }, { status: 400 })
    if (!['closer', 'gestor', 'onboarding'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent self-demotion
    if (user_id === user.id && role !== 'gestor') {
      return NextResponse.json({ error: 'Você não pode remover seu próprio acesso de gestor.' }, { status: 400 })
    }

    const { error } = await admin.from('profiles').update({ role }).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
