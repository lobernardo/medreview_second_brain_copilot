import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

export async function POST(request: Request) {
  // Require authentication
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Erro de autenticação.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Arquivo excede o limite de 25 MB.' }, { status: 413 })
  }

  try {
    const body = new FormData()
    body.append('file', file)
    body.append('model', 'whisper-1')
    body.append('language', 'pt')

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body,
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: (err as { error?: { message?: string } })?.error?.message ?? 'Erro na transcrição.' },
        { status: res.status },
      )
    }

    const data = await res.json() as { text: string }
    return NextResponse.json({ text: data.text })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
