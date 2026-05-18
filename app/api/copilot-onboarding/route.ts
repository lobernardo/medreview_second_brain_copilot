import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { buildContext } from '@/lib/ai/context-builder'
import { buildOnboardingSystemPrompt, type OnboardingConfig } from '@/lib/ai/onboarding-prompt'
import { callLLMStream } from '@/lib/ai/llm-client'

export const runtime = 'nodejs'

async function fetchOnboardingConfig(): Promise<OnboardingConfig | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('onboarding_config')
      .select('trail, custom_instructions, welcome_message, tone, max_complexity, focus_verticals')
      .limit(1)
      .maybeSingle()
    if (!data) return null
    return {
      trail: Array.isArray(data.trail) ? data.trail : [],
      custom_instructions: data.custom_instructions ?? null,
      welcome_message: data.welcome_message ?? null,
      tone: data.tone ?? null,
      max_complexity: data.max_complexity ?? null,
      focus_verticals: data.focus_verticals ?? null,
    }
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      message,
      user_id,
      current_topic_index = 0,
      messages = [],
    } = body as {
      message: string
      user_id?: string
      current_topic_index?: number
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const [{ context, sources, profile }, config] = await Promise.all([
      buildContext(message, 'onboarding', user_id),
      fetchOnboardingConfig(),
    ])

    const systemPrompt = buildOnboardingSystemPrompt(config, context, current_topic_index, profile)

    const historyMessages = messages.slice(-10)
    const allMessages = [...historyMessages, { role: 'user' as const, content: message }]

    const groqStream = await callLLMStream({ systemPrompt, messages: allMessages })

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
    console.error('[copilot-onboarding]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
