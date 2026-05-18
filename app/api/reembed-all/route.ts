import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/ai/embeddings'

export const runtime = 'nodejs'
export const maxDuration = 300

const REEMBED_SECRET = 'reembed-medreview-2026'

type TableResult = {
  found: number
  processed: number
  failed: number
  errors: string[]
  skipped?: boolean
  reason?: string
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-reembed-secret')
  if (secret !== REEMBED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const summary: Record<string, TableResult> = {}

  // ── knowledge_base ───────────────────────────────────────────────────────────
  {
    const { data, error } = await admin
      .from('knowledge_base')
      .select('id, title, content')
      .eq('is_active', true)
      .is('embedding', null)

    if (error) {
      summary.knowledge_base = { found: 0, processed: 0, failed: 0, errors: [], skipped: true, reason: error.message }
    } else {
      const rows = data ?? []
      const result: TableResult = { found: rows.length, processed: 0, failed: 0, errors: [] }
      for (const row of rows) {
        try {
          const text = `${row.title}\n\n${row.content}`
          const embedding = await generateEmbedding(text)
          const { error: upErr } = await admin.from('knowledge_base').update({ embedding }).eq('id', row.id)
          if (upErr) throw upErr
          console.log(`[reembed] knowledge_base | ${row.id} | ${row.title} | OK`)
          result.processed++
        } catch (err) {
          console.error(`[reembed] knowledge_base | ${row.id} | ERROR:`, err)
          result.failed++
          result.errors.push(`${row.id}: ${String(err)}`)
        }
        await sleep(200)
      }
      summary.knowledge_base = result
    }
  }

  // ── faq_items ────────────────────────────────────────────────────────────────
  {
    const { data, error } = await admin
      .from('faq_items')
      .select('id, question, answer')
      .eq('is_active', true)
      .is('embedding', null)

    if (error) {
      summary.faq_items = { found: 0, processed: 0, failed: 0, errors: [], skipped: true, reason: error.message }
    } else {
      const rows = data ?? []
      const result: TableResult = { found: rows.length, processed: 0, failed: 0, errors: [] }
      for (const row of rows) {
        try {
          const text = `${row.question} ${row.answer}`
          const embedding = await generateEmbedding(text)
          const { error: upErr } = await admin.from('faq_items').update({ embedding }).eq('id', row.id)
          if (upErr) throw upErr
          console.log(`[reembed] faq_items | ${row.id} | ${row.question?.slice(0, 60)} | OK`)
          result.processed++
        } catch (err) {
          console.error(`[reembed] faq_items | ${row.id} | ERROR:`, err)
          result.failed++
          result.errors.push(`${row.id}: ${String(err)}`)
        }
        await sleep(200)
      }
      summary.faq_items = result
    }
  }

  // ── objection_patterns ───────────────────────────────────────────────────────
  {
    const { data, error } = await admin
      .from('objection_patterns')
      .select('id, topic, definition, real_meaning, recommended_response')
      .is('embedding', null)

    if (error) {
      summary.objection_patterns = { found: 0, processed: 0, failed: 0, errors: [], skipped: true, reason: error.message }
    } else {
      const rows = data ?? []
      const result: TableResult = { found: rows.length, processed: 0, failed: 0, errors: [] }
      for (const row of rows) {
        try {
          const text = [row.topic, row.definition, row.real_meaning, row.recommended_response]
            .filter(Boolean)
            .join(' ')
          const embedding = await generateEmbedding(text)
          const { error: upErr } = await admin.from('objection_patterns').update({ embedding }).eq('id', row.id)
          if (upErr) throw upErr
          console.log(`[reembed] objection_patterns | ${row.id} | ${row.topic} | OK`)
          result.processed++
        } catch (err) {
          console.error(`[reembed] objection_patterns | ${row.id} | ERROR:`, err)
          result.failed++
          result.errors.push(`${row.id}: ${String(err)}`)
        }
        await sleep(200)
      }
      summary.objection_patterns = result
    }
  }

  // ── user_copys ───────────────────────────────────────────────────────────────
  {
    const { data, error } = await admin
      .from('user_copys')
      .select('id, title, message_text')
      .eq('is_active', true)
      .is('embedding', null)

    if (error) {
      summary.user_copys = { found: 0, processed: 0, failed: 0, errors: [], skipped: true, reason: error.message }
    } else {
      const rows = data ?? []
      const result: TableResult = { found: rows.length, processed: 0, failed: 0, errors: [] }
      for (const row of rows) {
        try {
          const text = `${row.title} ${row.message_text}`
          const embedding = await generateEmbedding(text)
          const { error: upErr } = await admin.from('user_copys').update({ embedding }).eq('id', row.id)
          if (upErr) throw upErr
          console.log(`[reembed] user_copys | ${row.id} | ${row.title} | OK`)
          result.processed++
        } catch (err) {
          console.error(`[reembed] user_copys | ${row.id} | ERROR:`, err)
          result.failed++
          result.errors.push(`${row.id}: ${String(err)}`)
        }
        await sleep(200)
      }
      summary.user_copys = result
    }
  }

  // ── whatsapp_templates ───────────────────────────────────────────────────────
  {
    const { data, error } = await admin
      .from('whatsapp_templates')
      .select('id, name, momento, copy_text')
      .eq('is_active', true)
      .is('embedding', null)

    if (error) {
      summary.whatsapp_templates = { found: 0, processed: 0, failed: 0, errors: [], skipped: true, reason: error.message }
    } else {
      const rows = data ?? []
      const result: TableResult = { found: rows.length, processed: 0, failed: 0, errors: [] }
      for (const row of rows) {
        try {
          const text = `${row.name} ${row.momento} ${row.copy_text}`
          const embedding = await generateEmbedding(text)
          const { error: upErr } = await admin.from('whatsapp_templates').update({ embedding }).eq('id', row.id)
          if (upErr) throw upErr
          console.log(`[reembed] whatsapp_templates | ${row.id} | ${row.name} | OK`)
          result.processed++
        } catch (err) {
          console.error(`[reembed] whatsapp_templates | ${row.id} | ERROR:`, err)
          result.failed++
          result.errors.push(`${row.id}: ${String(err)}`)
        }
        await sleep(200)
      }
      summary.whatsapp_templates = result
    }
  }

  return NextResponse.json({ ok: true, summary })
}
