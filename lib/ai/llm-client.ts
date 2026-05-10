interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMStreamOptions {
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface LLMJsonOptions {
  systemPrompt: string
  userMessage: string
  temperature?: number
  maxTokens?: number
}

const TIMEOUT_MS = 15_000

function withTimeout(ms: number): AbortController {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), ms)
  return controller
}

// ── Streaming calls ──────────────────────────────────────────────────────────

async function openAIStream(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const controller = withTimeout(TIMEOUT_MS)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
    signal: controller.signal,
  })
  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`OpenAI ${response.status}: ${err}`)
  }
  if (!response.body) throw new Error('OpenAI returned empty body')
  return response.body
}

async function groqStream(messages: LLMMessage[]): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
  })
  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`Groq ${response.status}: ${err}`)
  }
  if (!response.body) throw new Error('Groq returned empty body')
  return response.body
}

export async function callLLMStream({ systemPrompt, messages }: LLMStreamOptions): Promise<ReadableStream<Uint8Array>> {
  const all: LLMMessage[] = [{ role: 'system', content: systemPrompt }, ...messages]
  try {
    return await openAIStream(all)
  } catch (err) {
    console.error('[LLM] OpenAI failed, falling back to Groq:', err)
    return await groqStream(all)
  }
}

// ── Non-streaming JSON calls (process-document) ──────────────────────────────

async function openAIJson({ systemPrompt, userMessage, temperature = 0.1, maxTokens = 4096 }: LLMJsonOptions): Promise<string> {
  const controller = withTimeout(TIMEOUT_MS)
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
    signal: controller.signal,
  })
  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`OpenAI ${response.status}: ${err}`)
  }
  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

async function groqJson({ systemPrompt, userMessage, temperature = 0.1, maxTokens = 4096 }: LLMJsonOptions): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }),
  })
  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`Groq ${response.status}: ${err}`)
  }
  const data = await response.json() as { choices: { message: { content: string } }[] }
  return data.choices?.[0]?.message?.content ?? ''
}

export async function callLLMJson(options: LLMJsonOptions): Promise<string> {
  try {
    return await openAIJson(options)
  } catch (err) {
    console.error('[LLM] OpenAI failed, falling back to Groq:', err)
    return await groqJson(options)
  }
}
