import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const targetUserId = request.nextUrl.searchParams.get('user_id')

    if (targetUserId && targetUserId !== user.id) {
      const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'gestor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const queryUserId = (targetUserId && targetUserId !== user.id) ? targetUserId : user.id
    const { data, error } = await admin
      .from('onboarding_quiz_results')
      .select('*')
      .eq('user_id', queryUserId)
      .order('created_at', { ascending: true })
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

    const { topic_index, topic_title, question, user_answer, is_correct, copilot_feedback } = await request.json()
    if (topic_index === undefined || !topic_title || !question || !user_answer) {
      return NextResponse.json({ error: 'topic_index, topic_title, question, user_answer required' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from('onboarding_quiz_results').insert({
      user_id: user.id,
      topic_index,
      topic_title,
      question,
      user_answer,
      is_correct: is_correct ?? null,
      copilot_feedback: copilot_feedback ?? null,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
