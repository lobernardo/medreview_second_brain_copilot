import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './embeddings'

export interface ContextSource {
  id: string
  title: string
  similarity: number
}

export interface BuiltContext {
  context: string
  sources: ContextSource[]
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

  let embedding: number[] | null = null
  try {
    embedding = await generateEmbedding(message)
  } catch { /* OPENAI_API_KEY not active — fall through to text search */ }

  if (!embedding) {
    await fallbackTextSearch(supabase, message, parts, sources)
    return { context: truncate(parts.join('\n\n---\n\n')), sources }
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

  return { context: truncate(parts.join('\n\n---\n\n')), sources }
}
