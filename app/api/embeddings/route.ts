import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const runtime = 'nodejs'

const ALLOWED_TABLES = new Set([
  'knowledge_base',
  'faq_items',
  'user_copys',
  'quote_examples',
  'objection_patterns',
  'whatsapp_templates',
])

export async function POST(request: NextRequest) {
  try {
    const { table, id, content } = (await request.json()) as {
      table: string
      id: string
      content: string
    }

    if (!table || !id || !content) {
      return NextResponse.json({ error: 'table, id and content are required' }, { status: 400 })
    }

    if (!ALLOWED_TABLES.has(table)) {
      return NextResponse.json({ error: 'table not allowed' }, { status: 400 })
    }

    const embedding = await generateEmbedding(content)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabase.from(table).update({ embedding }).eq('id', id)

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[embeddings]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
