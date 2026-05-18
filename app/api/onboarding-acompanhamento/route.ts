import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    const { data: requester } = await admin.from('profiles').select('role').eq('id', user.id).single()
    if (requester?.role !== 'gestor') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data: config } = await admin
      .from('onboarding_config')
      .select('trail')
      .limit(1)
      .maybeSingle()
    const totalTopics = Array.isArray(config?.trail) ? (config.trail as unknown[]).length : 0

    const { data: users, error: usersError } = await admin
      .from('profiles')
      .select('id, name, created_at')
      .eq('role', 'onboarding')
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 })

    const userIds = (users ?? []).map((u) => u.id)

    const [{ data: progressData }, { data: quizData }] = await Promise.all([
      userIds.length > 0
        ? admin
            .from('onboarding_progress')
            .select('user_id, topic_index, status, started_at, completed_at')
            .in('user_id', userIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
      userIds.length > 0
        ? admin
            .from('onboarding_quiz_results')
            .select('user_id, topic_index, topic_title, is_correct')
            .in('user_id', userIds)
        : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    ])

    // Aggregate per user
    const data = (users ?? []).map((u) => {
      const userProgress = (progressData ?? []).filter((p) => p.user_id === u.id)
      const completedCount = userProgress.filter((p) => p.status === 'completed').length
      const hasInProgress = userProgress.some((p) => p.status === 'in_progress')

      const startedAt = userProgress.reduce<string | null>((min, p) => {
        if (!p.started_at) return min
        return !min || (p.started_at as string) < min ? (p.started_at as string) : min
      }, null)
      const lastActivity = userProgress.reduce<string | null>((max, p) => {
        const ts = (p.completed_at ?? p.started_at) as string | null
        if (!ts) return max
        return !max || ts > max ? ts : max
      }, null)

      let status: 'not_started' | 'in_progress' | 'completed' | 'paused' = 'not_started'
      if (totalTopics > 0 && completedCount >= totalTopics) {
        status = 'completed'
      } else if (hasInProgress || completedCount > 0) {
        const daysSince = lastActivity
          ? (Date.now() - new Date(lastActivity).getTime()) / 86_400_000
          : 999
        status = daysSince > 7 ? 'paused' : 'in_progress'
      }

      return {
        user_id: u.id,
        name: u.name,
        started_at: startedAt,
        last_activity: lastActivity,
        topics_total: totalTopics,
        topics_completed: completedCount,
        completion_pct: totalTopics > 0 ? Math.round((completedCount / totalTopics) * 100) : 0,
        status,
      }
    })

    // Quiz error rates per topic (top 3)
    const topicMap: Record<string, { title: string; total: number; wrong: number }> = {}
    for (const qr of (quizData ?? [])) {
      const key = String(qr.topic_index)
      if (!topicMap[key]) topicMap[key] = { title: qr.topic_title as string, total: 0, wrong: 0 }
      topicMap[key].total++
      if (qr.is_correct === false) topicMap[key].wrong++
    }
    const quiz_error_topics = Object.entries(topicMap)
      .map(([idx, d]) => ({
        topic_index: Number(idx),
        title: d.title,
        error_rate: d.total > 0 ? Math.round((d.wrong / d.total) * 100) : 0,
        total_attempts: d.total,
      }))
      .sort((a, b) => b.error_rate - a.error_rate)
      .slice(0, 3)

    return NextResponse.json({ data, quiz_error_topics })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
