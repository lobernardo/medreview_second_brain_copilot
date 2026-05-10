import { NextRequest, NextResponse } from 'next/server'
import { buildContext } from '@/lib/ai/context-builder'
import { buildVendasSystemPrompt } from '@/lib/ai/vendas-prompt'
import { callGroqStream } from '@/lib/ai/groq-client'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, mode = 'livre', user_id, messages = [] } = body as {
      message: string
      mode: string
      user_id?: string
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const { context, sources, profile } = await buildContext(message, mode, user_id)
    const systemPrompt = buildVendasSystemPrompt(mode, context, profile)

    const historyMessages = messages.slice(-10)
    const allMessages = [...historyMessages, { role: 'user' as const, content: message }]

    const groqStream = await callGroqStream({ systemPrompt, messages: allMessages })

    const encoder = new TextEncoder()
    const sourcesEvent = `data: ${JSON.stringify({ type: 'sources', sources })}\n\n`

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(encoder.encode(sourcesEvent))
        const reader = groqStream.getReader()
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            controller.enqueue(value)
          }
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    console.error('[copilot-vendas]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
