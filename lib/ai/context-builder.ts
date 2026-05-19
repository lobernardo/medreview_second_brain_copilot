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

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const cut = text.lastIndexOf('.', maxChars)
  return cut > maxChars * 0.8 ? text.slice(0, cut + 1) : text.slice(0, maxChars) + '…'
}

const VERTICAL_KEYWORDS: Record<string, string[]> = {
  Anest: ['anest', 'anestesiologia', 'tea'],
  Oft:   ['oft', 'oftalmologia', 'cbo'],
  Ortop: ['ortop', 'ortopedia', 'taro'],
  R1:    ['r1', 'residência', 'residencia', 'revalida'],
}

function detectVertical(text: string): string | null {
  const lower = text.toLowerCase()
  for (const [vertical, keywords] of Object.entries(VERTICAL_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return vertical
  }
  return null
}

type SupabaseClient = ReturnType<typeof getServiceClient>

async function matchKb(supabase: SupabaseClient, embedding: number[], parts: string[], sources: ContextSource[], vertical: string | null): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('match_knowledge_base', {
      query_embedding: embedding,
      match_count: 5,
      match_threshold: 0.45,
      filter_vertical: vertical,
    })
    if (data?.length) {
      const text = data
        .map((d: any) => `### ${d.title}${d.vertical ? ` (${d.vertical})` : ''}\n${d.content}`)
        .join('\n\n')
      parts.push(`## Base de Conhecimento\n\n${text}`)
      data.forEach((d: any) => sources.push({ id: d.id, title: d.title, similarity: d.similarity ?? 0 }))
      return true
    }
    return false
  } catch (err) {
    console.error('[RAG] match_knowledge_base failed:', err)
    return false
  }
}

async function matchFaq(supabase: SupabaseClient, embedding: number[], parts: string[], sources: ContextSource[], vertical: string | null) {
  try {
    const { data } = await supabase.rpc('match_faq', {
      query_embedding: embedding,
      match_count: 3,
      match_threshold: 0.5,
      filter_vertical: vertical,
    })
    if (data?.length) {
      const text = data.map((d: any) => {
        const score = ((d.similarity ?? 0) * 100).toFixed(0)
        return `**Q:** ${d.question} [relevância: ${score}%]\n**A:** ${d.answer}`
      }).join('\n\n')
      parts.push(`## FAQ\n\n${text}`)
      data.forEach((d: any) =>
        sources.push({ id: d.id, title: d.question.slice(0, 60), similarity: d.similarity ?? 0 })
      )
    }
  } catch (err) {
    console.error('[RAG] match_faq failed:', err)
  }
}

async function matchObjections(
  supabase: SupabaseClient,
  embedding: number[],
  parts: string[],
  userId?: string,
  vertical?: string | null
) {
  try {
    const { data } = await supabase.rpc('match_objections', {
      query_embedding: embedding,
      match_count: 4,
      match_threshold: 0.45,
      filter_vertical: vertical ?? null,
    })
    if (!data?.length) return

    let personalResponses: Record<string, string> = {}
    if (userId) {
      const ids = data.map((o: any) => o.id)
      const { data: userResps } = await supabase
        .from('user_objection_responses')
        .select('objection_id, response_text')
        .eq('user_id', userId)
        .in('objection_id', ids)
      if (userResps?.length) {
        personalResponses = Object.fromEntries(userResps.map((r: any) => [r.objection_id, r.response_text]))
      }
    }

    const text = data
      .map(
        (o: any) =>
          `**${o.topic}** (win rate: ${o.win_rate ?? '?'}%)\n` +
          `Significado real: ${o.real_meaning ?? '-'}\n` +
          `Resposta recomendada: ${o.recommended_response ?? '-'}\n` +
          (personalResponses[o.id] ? `Resposta pessoal do closer: ${personalResponses[o.id]}\n` : '') +
          `Não dizer: ${o.what_not_to_say ?? '-'}`
      )
      .join('\n\n')
    parts.push(`## Matriz de Objeções\n\n${text}`)
  } catch (err) {
    console.error('[RAG] match_objections failed:', err)
  }
}

async function matchCopys(
  supabase: SupabaseClient,
  embedding: number[],
  userId: string | undefined,
  parts: string[],
  vertical: string | null
) {
  try {
    const { data } = await supabase.rpc('match_copys', {
      query_embedding: embedding,
      match_count: 4,
      match_threshold: 0.45,
      filter_user_id: userId ?? null,
      filter_vertical: vertical,
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
  } catch (err) {
    console.error('[RAG] match_copys failed:', err)
  }
}

async function matchQuotes(supabase: SupabaseClient, embedding: number[], parts: string[], vertical: string | null) {
  try {
    const { data } = await supabase.rpc('match_quotes', {
      query_embedding: embedding,
      match_count: 3,
      match_threshold: 0.4,
      filter_vertical: vertical,
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
  } catch (err) {
    console.error('[RAG] match_quotes failed:', err)
  }
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
  } catch (err) {
    console.error('[RAG] fetchExamDates failed:', err)
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
  } catch (err) {
    console.error('[RAG] fetchUpcomingEvents failed:', err)
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
  } catch (err) {
    console.error('[RAG] fetchVerdadeiroValor failed:', err)
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
  } catch (err) {
    console.error('[RAG] fetchUserProfile failed:', err)
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
  } catch (err) {
    console.error('[RAG] fallbackTextSearch failed:', err)
  }
}

const STOP_WORDS = new Set([
  'com', 'por', 'uma', 'um', 'que', 'para', 'sobre', 'falar', 'gerar', 'mais',
  'como', 'seu', 'sua', 'dos', 'das', 'nos', 'nas', 'num', 'numa', 'este',
  'essa', 'esse', 'isto', 'isso', 'aqui', 'ali', 'quando', 'onde', 'qual',
  'quem', 'copy', 'copys', 'texto', 'fazer', 'quero', 'pedir', 'dizer', 'ver',
  'pode', 'preciso', 'favor', 'obrigado', 'boa', 'bom', 'certo',
])

async function matchProductsByKeyword(
  supabase: SupabaseClient,
  message: string,
  parts: string[],
  sources: ContextSource[],
  vertical: string | null
) {
  try {
    const keywords = message
      .toLowerCase()
      .replace(/[^\w\sáéíóúãõâêôàü]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !STOP_WORDS.has(w))

    if (!keywords.length) return

    // AND: todas as keywords devem estar no título (evita false positives com words genéricas como "anest")
    let query = supabase
      .from('knowledge_base')
      .select('id, title, content, vertical')
      .eq('category', 'produto')
      .eq('is_active', true)
    keywords.forEach(kw => { query = query.ilike('title', `%${kw}%`) })

    if (vertical) {
      query = query.or(`vertical.eq.${vertical},vertical.is.null,vertical.eq.Geral`)
    }

    const { data } = await query.limit(2)
    if (!data?.length) return

    const newDocs = data.filter((d: any) => !sources.some(s => s.id === d.id))
    if (!newDocs.length) return

    // Busca dados comerciais em product_details para enriquecer o contexto
    const kbIds = newDocs.map((d: any) => d.id)
    const { data: details } = await supabase
      .from('product_details')
      .select('kb_id, icp, pitch, price, access_duration, payment_conditions, when_to_use, when_not_to_use, objections')
      .in('kb_id', kbIds)
    const detailsMap: Record<string, any> = {}
    if (details) details.forEach((d: any) => { detailsMap[d.kb_id] = d })

    const text = newDocs.map((d: any) => {
      let block = `### ${d.title}${d.vertical ? ` (${d.vertical})` : ''}\n${d.content}`
      const det = detailsMap[d.id]
      if (det) {
        const commercial: string[] = []
        if (det.icp)                commercial.push(`**ICP:** ${det.icp}`)
        if (det.price)              commercial.push(`**Preço:** ${det.price}`)
        if (det.access_duration)    commercial.push(`**Acesso:** ${det.access_duration}`)
        if (det.payment_conditions) commercial.push(`**Condições:** ${det.payment_conditions}`)
        if (det.pitch)              commercial.push(`**Pitch:** "${det.pitch}"`)
        if (det.when_to_use)        commercial.push(`**Quando indicar:** ${det.when_to_use}`)
        if (det.when_not_to_use)    commercial.push(`**Quando NÃO indicar:** ${det.when_not_to_use}`)
        if (det.objections)         commercial.push(`**Objeções:** ${det.objections}`)
        if (commercial.length) block += `\n\n**— Dados Comerciais —**\n${commercial.join('\n')}`
      }
      return block
    }).join('\n\n')

    // Produto primeiro no contexto RAG
    parts.push(`## Produto\n\n${text}`)

    newDocs.forEach((d: any) => {
      if (!sources.some(s => s.id === d.id)) {
        sources.push({ id: d.id, title: d.title, similarity: 1 })
      }
    })
    console.log(`[RAG] matchProductsByKeyword: ${newDocs.length} produto(s) — ${newDocs.map((d: any) => d.title).join(', ')}`)
  } catch (err) {
    console.error('[RAG] matchProductsByKeyword failed:', err)
  }
}

const MAX_RAG_CHARS   = 8000
const MAX_FIXED_CHARS = 4000

export async function buildContext(
  message: string,
  mode: string,
  userId?: string
): Promise<BuiltContext> {
  const supabase = getServiceClient()
  const productParts: string[] = []
  const ragParts:   string[] = []
  const fixedParts: string[] = []
  const sources: ContextSource[] = []

  const [vvBlock, examBlock, eventBlock, embedding, profile] = await Promise.all([
    fetchVerdadeiroValor(supabase),
    fetchExamDates(supabase),
    fetchUpcomingEvents(supabase),
    generateEmbedding(message).catch(() => null),
    userId ? fetchUserProfile(supabase, userId) : Promise.resolve(null),
  ])

  const vertical =
    detectVertical(message) ||
    (profile?.vertical_focus ? profile.vertical_focus.split(',')[0].trim() : null)

  if (vvBlock)    fixedParts.push(vvBlock)
  if (examBlock)  fixedParts.push(examBlock)
  if (eventBlock) fixedParts.push(eventBlock)

  if (!embedding) {
    await fallbackTextSearch(supabase, message, ragParts, sources)
    const context = buildFinalContext(ragParts, fixedParts)
    return { context, sources, profile }
  }

  const extraCalls: Promise<void>[] = []
  // Modo produto: produto vai para productParts (posição primária no contexto)
  if (mode === 'produto') extraCalls.push(matchProductsByKeyword(supabase, message, productParts, sources, vertical))
  if (mode === 'objeção') extraCalls.push(matchObjections(supabase, embedding, ragParts, userId, vertical))
  if (['follow-up', 'proposta', 'copys'].includes(mode)) extraCalls.push(matchCopys(supabase, embedding, userId, ragParts, vertical))
  if (mode === 'proposta') extraCalls.push(matchQuotes(supabase, embedding, ragParts, vertical))

  const [kbFound] = await Promise.all([
    matchKb(supabase, embedding, ragParts, sources, vertical),
    matchFaq(supabase, embedding, ragParts, sources, vertical),
    ...extraCalls,
  ])

  if (sources.length < 2 || !kbFound) {
    await fallbackTextSearch(supabase, message, ragParts, sources)
  }

  // Produto sempre primeiro no contexto RAG para o LLM priorizar
  const allRagParts = [...productParts, ...ragParts]
  return { context: buildFinalContext(allRagParts, fixedParts), sources, profile }
}

function buildFinalContext(ragParts: string[], fixedParts: string[]): string {
  const rag   = ragParts.length   ? truncate(ragParts.join('\n\n---\n\n'),   MAX_RAG_CHARS)   : ''
  const fixed = fixedParts.length ? truncate(fixedParts.join('\n\n---\n\n'), MAX_FIXED_CHARS) : ''
  return [rag, fixed].filter(Boolean).join('\n\n---\n\n')
}
