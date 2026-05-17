import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST() {
  try {
    const admin = createAdminClient()

    const { data: produtos, error } = await admin
      .from('knowledge_base')
      .select('id, content')
      .eq('category', 'produto')
      .eq('is_active', true)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!produtos?.length) return NextResponse.json({ processed: 0 })

    let processed = 0
    const errors: string[] = []

    for (const produto of produtos) {
      try {
        const embedding = await generateEmbedding(produto.content)
        const { error: updateError } = await admin
          .from('knowledge_base')
          .update({ embedding })
          .eq('id', produto.id)
        if (updateError) throw updateError
        processed++
      } catch (err) {
        errors.push(`${produto.id}: ${String(err)}`)
      }
    }

    return NextResponse.json({ processed, total: produtos.length, errors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
