import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: requester } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (requester?.role !== 'gestor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { userId } = await params

    const [
      { data: profile },
      { data: progress },
      { data: quizResults },
      conversationsResult,
    ] = await Promise.all([
      admin.from('profiles').select('id, name, role, vertical_focus').eq('id', userId).single(),
      admin.from('onboarding_progress').select('*').eq('user_id', userId).order('topic_index'),
      admin.from('onboarding_quiz_results').select('*').eq('user_id', userId).order('created_at'),
      Promise.resolve(
        admin
          .from('conversations')
          .select('id, messages, created_at')
          .eq('user_id', userId)
          .eq('copilot_type', 'onboarding')
          .order('created_at', { ascending: false })
          .limit(5)
      ).catch(() => ({ data: [] })),
    ])

    return NextResponse.json({
      data: {
        profile,
        progress: progress ?? [],
        quizResults: quizResults ?? [],
        conversations: (conversationsResult as { data: unknown[] | null }).data ?? [],
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
