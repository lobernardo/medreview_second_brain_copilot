import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('onboarding_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('topic_index', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
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

    const { topic_index, topic_title, status } = await request.json()
    if (topic_index === undefined || !topic_title || !status) {
      return NextResponse.json({ error: 'topic_index, topic_title, status required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('onboarding_progress')
      .select('id, status, started_at')
      .eq('user_id', user.id)
      .eq('topic_index', topic_index)
      .maybeSingle()

    // Don't downgrade a completed topic
    if (existing?.status === 'completed' && status !== 'completed') {
      return NextResponse.json({ success: true })
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { topic_title, status }

    if (status === 'in_progress' && !existing?.started_at) {
      updates.started_at = now
    }
    if (status === 'completed') {
      updates.completed_at = now
      if (!existing?.started_at) updates.started_at = now
    }

    if (existing) {
      const { error } = await admin
        .from('onboarding_progress')
        .update(updates)
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await admin
        .from('onboarding_progress')
        .insert({ user_id: user.id, topic_index, ...updates })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
