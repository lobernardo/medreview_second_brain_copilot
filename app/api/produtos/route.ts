import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function buildContent(b: Record<string, string>): string {
  const parts: string[] = [`# ${b.nome}`]

  const meta: string[] = []
  if (b.vertical) meta.push(`**Vertical:** ${b.vertical}`)
  meta.push(`**Status:** ${b.status || 'ativo'}`)
  if (b.reference_price) meta.push(`**Preço de referência:** ${b.reference_price}`)
  if (meta.length) parts.push(meta.join(' | '))

  if (b.recommended_icp?.trim()) parts.push(`**ICP recomendado:** ${b.recommended_icp.trim()}`)

  const section = (heading: string, text: string) => {
    if (text?.trim()) parts.push(`\n## ${heading}\n${text.trim()}`)
  }

  section('Descrição', b.description)
  section('O que inclui', b.includes)
  section('Pitch principal', b.main_pitch)
  section('Condições comerciais', b.commercial_conditions)
  section('Objeções comuns', b.common_objections)
  section('Quando usar', b.when_to_use)
  section('Quando NÃO usar', b.when_not_to_use)
  section('Notas de estratégia', b.strategy_notes)

  return parts.join('\n')
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('knowledge_base')
      .select('id,title,category,vertical,content,tags,is_active,updated_at')
      .eq('category', 'produto')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
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

    const body = await request.json()
    const { id } = body

    const content = buildContent(body)
    const status = body.status || 'ativo'

    const record = {
      title: String(body.nome).trim(),
      category: 'produto' as const,
      vertical: body.vertical || null,
      content,
      tags: [status],
      source_type: 'texto' as const,
      is_active: true,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    }

    const admin = createAdminClient()
    if (id) {
      const { error } = await admin.from('knowledge_base').update(record).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data: { id } })
    } else {
      const { data, error } = await admin.from('knowledge_base').insert(record).select('id').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const admin = createAdminClient()
    const { error } = await admin.from('knowledge_base').update({ is_active: false }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
