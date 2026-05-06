interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface GroqOptions {
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export async function callGroqStream({ systemPrompt, messages }: GroqOptions): Promise<ReadableStream<Uint8Array>> {
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
        ...messages,
      ] as GroqMessage[],
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => response.statusText)
    throw new Error(`Groq API error ${response.status}: ${err}`)
  }

  if (!response.body) throw new Error('Groq API returned empty body')
  return response.body
}
