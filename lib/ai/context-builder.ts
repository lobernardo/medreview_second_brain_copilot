import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './embeddings'
import type { Profile } from '@/lib/utils/types'

export interface ContextSource {
  id: string
  title: string
  similarity: number
}

export type UserProfile = Pick<Profile, 'name' | 'style_notes' | 'default_greeting' | 'vertical_focus'>

export interface BuiltContext {
  context: string
  sources: ContextSource[]
  profile: UserProfile | null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

function truncate(text: string, maxChars = 12000): string {
  return text.length > maxChars ? text.slice(0, maxChars) + '…' : text
}

type SupabaseClient = ReturnType<typeof getServiceClient>

async function matchKb(supabase: SupabaseClient, embedding: number[], parts: string[], sources: ContextSource[]) {
  try {
    const { data } = await supabase.rpc('match_knowledge_base', {
      query_embedding: embedding,
      match_count: 5,
      match_threshold: 0.5,
    })
    if (data?.length) {
      const text = data
        .map((d: any) => `### ${d.title}${d.vertical ? ` (${d.vertical})` : ''}\n${d.content}`)
        .join('\n\n')
      parts.push(`## Base de Conhecimento\n\n${text}`)
      data.forEach((d: any) => sources.push({ id: d.id, title: d.title, similarity: d.similarity ?? 0 }))
    }
  } catch { /* RPC not available yet */ }
}

async function matchFaq(supabase: SupabaseClient, embedding: number[], parts: string[], sources: ContextSource[]) {
  try {
    const { data } = await supabase.rpc('match_faq', {
      query_embedding: embedding,
      match_count: 3,
      match_threshold: 0.5,
    })
    if (data?.length) {
      const text = data.map((d: any) => `**Q:** ${d.question}\n**A:** ${d.answer}`).join('\n\n')
      parts.push(`## FAQ\n\n${text}`)
      data.forEach((d: any) =>
        sources.push({ id: d.id, title: d.question.slice(0, 60), similarity: d.similarity ?? 0 })
      )
    }
  } catch { /* RPC not available yet */ }
}

async function matchObjections(supabase: SupabaseClient, embedding: number[], parts: string[]) {
  try {
    const { data } = await supabase.rpc('match_objections', {
      query_embedding: embedding,
      match_count: 4,
      match_threshold: 0.45,
    })
    if (data?.length) {
      const text = data
        .map(
          (o: any) =>
            `**${o.topic}** (win rate: ${o.win_rate ?? '?'}%)\n` +
            `Significado real: ${o.real_meaning ?? '-'}\n` +
            `Resposta: ${o.recommended_response ?? '-'}\n` +
            `Não dizer: ${o.what_not_to_say ?? '-'}`
        )
        .join('\n\n')
      parts.push(`## Matriz de Objeções\n\n${text}`)
    }
  } catch { /* RPC not available yet */ }
}

async function matchCopys(
  supabase: SupabaseClient,
  embedding: number[],
  userId: string | undefined,
  parts: string[]
) {
  try {
    const { data } = await supabase.rpc('match_copys', {
      query_embedding: embedding,
      match_count: 4,
      match_threshold: 0.45,
      filter_user_id: userId ?? null,
    })
    if (data?.length) {
      const text = data
        .map(
          (c: any) =>
            `**${c.title}** [${c.category}${c.vertical ? `/${c.vertical}` : ''}]\n${c.message_text}` +
            (c.when_to_use ? `\nUsar quando: ${c.when_to_use}` : '')
        )
        .join('\n\n')
      parts.push(`## Copys do Time\n\n${text}`)
    }
  } catch { /* RPC not available yet */ }
}

async function matchQuotes(supabase: SupabaseClient, embedding: number[], parts: string[]) {
  try {
    const { data } = await supabase.rpc('match_quotes', {
      query_embedding: embedding,
      match_count: 3,
      match_threshold: 0.4,
    })
    if (data?.length) {
      const text = data
        .map(
          (q: any) =>
            `**${q.product} (${q.vertical})**\nContexto: ${q.context ?? '-'}\n\n${q.quote_text}`
        )
        .join('\n\n---\n\n')
      parts.push(`## Orçamentos que Converteram\n\n${text}`)
    }
  } catch { /* RPC not available yet */ }
}

function fmtCtxDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function daysUntilCtx(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr + 'T00:00:00').getTime() - today.getTime()) / 86400000)
}

async function fetchExamDates(supabase: SupabaseClient): Promise<string> {
  try {
    const { data } = await supabase
      .from('exam_dates')
      .select('vertical, name, exam_date, registration_start, registration_end')
      .eq('is_active', true)
      .order('exam_date', { ascending: true })

    if (!data?.length) return ''

    const upcoming = data.filter((e: any) => daysUntilCtx(e.exam_date) >= -7)
    if (!upcoming.length) return ''

    const lines = upcoming.map((e: any) => {
      const days = daysUntilCtx(e.exam_date)
      let line = `• ${e.vertical} — ${e.name}: ${fmtCtxDate(e.exam_date)} (em ${days} dias)`
      if (e.registration_start) {
        line += `\n  Inscrições: ${fmtCtxDate(e.registration_start)}`
        if (e.registration_end) line += ` a ${fmtCtxDate(e.registration_end)}`
      }
      return line
    })

    return `DATAS DE PROVAS:\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

async function fetchUpcomingEvents(supabase: SupabaseClient): Promise<string> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = new Date(today.getTime() + 30 * 86400000)
    const todayStr = today.toISOString().slice(0, 10)
    const limitStr = limit.toISOString().slice(0, 10)

    const { data } = await supabase
      .from('company_events')
      .select('type, title, description, event_date, verticals, responsible')
      .eq('is_active', true)
      .gte('event_date', todayStr)
      .lte('event_date', limitStr)
      .order('event_date', { ascending: true })

    if (!data?.length) return ''

    const lines = data.map((e: any) => {
      const days = daysUntilCtx(e.event_date)
      let line = `• [${e.type}] ${e.title}: ${fmtCtxDate(e.event_date)} (em ${days} dias)`
      if (e.verticals?.length) line += `\n  Verticais: ${e.verticals.join(', ')}`
      if (e.description) line += `\n  ${e.description}`
      return line
    })

    return `EVENTOS PRÓXIMOS (30 dias):\n${lines.join('\n')}`
  } catch {
    return ''
  }
}

async function fetchVerdadeiroValor(supabase: SupabaseClient): Promise<string> {
  try {
    const { data: vv } = await supabase
      .from('verdadeiro_valor')
      .select('content')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: bns } = await supabase
      .from('big_numbers')
      .select('value, label, description, category, vertical')

    const lines: string[] = []

    if (vv?.content) {
      lines.push(`VERDADEIRO VALOR DA MED-REVIEW:\n${vv.content}`)
    }

    if (bns?.length) {
      const formatted = bns
        .map((b: any) => {
          let entry = `• ${b.value} — ${b.label}`
          if (b.description) entry += `: ${b.description}`
          if (b.vertical) entry += ` (${b.vertical})`
          if (b.category) entry += ` [${b.category}]`
          return entry
        })
        .join('\n')
      lines.push(`BIG NUMBERS:\n${formatted}`)
    }

    return lines.join('\n\n')
  } catch {
    return ''
  }
}

async function fetchUserProfile(supabase: SupabaseClient, userId: string): Promise<UserProfile | null> {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('name, style_notes, default_greeting, vertical_focus')
      .eq('id', userId)
      .single()
    return data ?? null
  } catch {
    return null
  }
}

async function fallbackTextSearch(
  supabase: SupabaseClient,
  message: string,
  parts: string[],
  sources: ContextSource[]
) {
  try {
    const { data } = await supabase.rpc('search_knowledge_base_text', { search_query: message })
    if (data?.length) {
      const slice = data.slice(0, 3)
      const text = slice.map((d: any) => `### ${d.title}\n${d.content}`).join('\n\n')
      if (!parts.some((p) => p.startsWith('## Base de Conhecimento'))) {
        parts.push(`## Base de Conhecimento\n\n${text}`)
      }
      slice.forEach((d: any) => {
        if (!sources.some((s) => s.id === d.id)) {
          sources.push({ id: d.id, title: d.title, similarity: 0 })
        }
      })
    }
  } catch { /* table not available yet */ }
}

export async function buildContext(
  message: string,
  mode: string,
  userId?: string
): Promise<BuiltContext> {
  const supabase = getServiceClient()
  const parts: string[] = []
  const sources: ContextSource[] = []

  const [vvBlock, examBlock, eventBlock, embedding, profile] = await Promise.all([
    fetchVerdadeiroValor(supabase),
    fetchExamDates(supabase),
    fetchUpcomingEvents(supabase),
    generateEmbedding(message).catch(() => null),
    userId ? fetchUserProfile(supabase, userId) : Promise.resolve(null),
  ])

  if (vvBlock) parts.push(vvBlock)
  if (examBlock) parts.push(examBlock)
  if (eventBlock) parts.push(eventBlock)

  if (!embedding) {
    await fallbackTextSearch(supabase, message, parts, sources)
    return { context: truncate(parts.join('\n\n---\n\n')), sources, profile }
  }

  const calls: Promise<void>[] = [
    matchKb(supabase, embedding, parts, sources),
    matchFaq(supabase, embedding, parts, sources),
  ]

  if (mode === 'objeção') calls.push(matchObjections(supabase, embedding, parts))
  if (['follow-up', 'proposta', 'copys'].includes(mode)) calls.push(matchCopys(supabase, embedding, userId, parts))
  if (mode === 'proposta') calls.push(matchQuotes(supabase, embedding, parts))

  await Promise.all(calls)

  if (sources.length < 2) {
    await fallbackTextSearch(supabase, message, parts, sources)
  }

  return { context: truncate(parts.join('\n\n---\n\n')), sources, profile }
}
