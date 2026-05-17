import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callLLMJson } from '@/lib/ai/llm-client'

const SYSTEM_PROMPT = `Você é um consultor comercial da Med-Review, empresa de educação médica.

Com base no conteúdo abaixo, gere UMA dica prática de vendas em no máximo 3 frases.
A dica deve ser:
- Curta e direta (máximo 280 caracteres)
- Aplicável a uma conversa de vendas no WhatsApp com médicos
- Contextualizada para venda de cursos preparatórios para provas médicas (TEA, TSA, CBO, TEOT, R1)
- Sem jargão de marketing, sem "gatilhos mentais", sem clichês

Formato da resposta: apenas o texto da dica, sem título, sem aspas, sem explicação.`

async function generateTip(title: string, content: string): Promise<string> {
  try {
    const result = await callLLMJson({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `CONTEÚDO DE REFERÊNCIA:\n${title}\n${content.slice(0, 2000)}`,
      temperature: 0.4,
      maxTokens: 150,
    })
    return result.trim() || content.slice(0, 280)
  } catch {
    return content.slice(0, 280)
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('knowledge_base')
      .select('id, title, content, cached_tip, cached_tip_date')
      .in('category', ['tecnica-comercial', 'playbook'])
      .eq('is_active', true)
      .order('id', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data?.length) return NextResponse.json({ data: null })

    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
    const doc = data[dayOfYear % data.length]

    const todayStr = now.toISOString().slice(0, 10)

    if (doc.cached_tip && doc.cached_tip_date === todayStr) {
      return NextResponse.json({ data: { id: doc.id, title: doc.title, content: doc.cached_tip } })
    }

    const tip = await generateTip(doc.title, doc.content)

    admin
      .from('knowledge_base')
      .update({ cached_tip: tip, cached_tip_date: todayStr })
      .eq('id', doc.id)
      .then(() => {})
      .catch((err: unknown) => console.error('[dica-do-dia] cache update failed:', err))

    return NextResponse.json({ data: { id: doc.id, title: doc.title, content: tip } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
