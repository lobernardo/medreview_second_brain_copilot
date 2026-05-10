import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callLLMJson } from '@/lib/ai/llm-client'

const SYSTEM_PROMPT = `Você é um organizador de documentos para uma base de conhecimento comercial da Med-Review (educação médica). Analise o conteúdo e retorne APENAS um JSON com: suggested_category (uma de: produto, playbook, objeção-resposta, regra-comercial, diferencial, faq, template-followup, case-sucesso, script-copy), suggested_vertical (R1, Anest, Oft, Ortop ou null), suggested_tags (array de 3-5 strings), suggested_title (formato: '[Vertical] — [Tema específico]'), formatted_content (mesmo conteúdo reorganizado em Markdown limpo com ## headings e - bullets), should_split (boolean, true se >2000 palavras), chunks (array de {title, content} se should_split=true, cada chunk 500-1500 palavras). Responda APENAS o JSON, sem markdown fences.`

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { title, content, category, vertical } = await request.json()
    if (!content?.trim()) return NextResponse.json({ error: 'content required' }, { status: 400 })

    const userMessage = `Título atual: ${title || '(sem título)'}
Categoria sugerida pelo usuário: ${category || '(não informada)'}
Vertical sugerida pelo usuário: ${vertical || '(não informada)'}

Conteúdo a analisar:
${content}`

    const raw = await callLLMJson({ systemPrompt: SYSTEM_PROMPT, userMessage, temperature: 0.1 })
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(cleaned)

    return NextResponse.json({ success: true, data: parsed })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
