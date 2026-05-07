'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Copy, ThumbsUp, ThumbsDown, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { QuoteCard, hasQuoteBlock } from '@/components/chat/quote-card'
import { createBrowserClient } from '@supabase/ssr'

const MODES = [
  { id: 'diagnose', label: '/diagnose' },
  { id: 'objeção', label: '/objeção' },
  { id: 'proposta', label: '/proposta' },
  { id: 'produto', label: '/produto' },
  { id: 'follow-up', label: '/follow-up' },
  { id: 'regra', label: '/regra' },
  { id: 'copys', label: '/copys' },
  { id: 'livre', label: '/livre' },
] as const

type ModeId = (typeof MODES)[number]['id']

interface Source {
  id: string
  title: string
  similarity: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  mode?: ModeId
  feedback?: 'up' | 'down'
  copied?: boolean
}

function useSupabaseUser() {
  const [userId, setUserId] = useState<string | undefined>()
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id))
  }, [])
  return userId
}

function CopilotVendasContent() {
  const userId = useSupabaseUser()
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<ModeId>('livre')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const autoSentRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const sendMessage = useCallback(async (overrideText?: string, overrideMode?: ModeId) => {
    const text = (overrideText ?? input).trim()
    const activeMode = overrideMode ?? mode
    if (!text || streaming) return

    if (!overrideText) {
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text, mode: activeMode }
    setMessages((prev) => [...prev, userMsg])

    const assistantId = crypto.randomUUID()
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '', mode: activeMode }])
    setStreaming(true)

    try {
      const history = messages
        .filter((m) => m.content)
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }))

      const res = await fetch('/api/copilot-vendas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: activeMode, user_id: userId, messages: history }),
      })

      if (!res.ok) throw new Error(`API error ${res.status}`)
      if (!res.body) throw new Error('No body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'sources') {
              setSources(parsed.sources ?? [])
              continue
            }
            const delta = parsed.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              accumulated += delta
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
              )
            }
          } catch {
            // non-JSON SSE line
          }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Erro ao conectar com o Second Brain. Tente novamente.' }
            : m
        )
      )
    } finally {
      setStreaming(false)
    }
  }, [input, mode, messages, streaming, userId])

  // Auto-send lead context from query params (e.g. coming from /leads)
  useEffect(() => {
    if (!userId || autoSentRef.current) return
    const lead = searchParams.get('lead')
    if (!lead) return
    autoSentRef.current = true

    const vertical = searchParams.get('vertical')
    const produto = searchParams.get('produto')
    const objecao = searchParams.get('objecao')

    const parts: string[] = [`Lead: ${lead}`]
    if (vertical) parts.push(`Vertical: ${vertical}`)
    if (produto) parts.push(`Produto: ${produto}`)
    if (objecao) parts.push(`Objeção: ${objecao}`)

    const text = `Contexto do lead — ${parts.join(' | ')}\n\nMe ajuda a diagnosticar e preparar uma abordagem para este lead.`
    setMode('diagnose')
    sendMessage(text, 'diagnose')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function copyMessage(id: string, content: string) {
    navigator.clipboard.writeText(content).then(() => {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, copied: true } : m)))
      setTimeout(() => {
        setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, copied: false } : m)))
      }, 2000)
    })
  }

  function setFeedback(id: string, fb: 'up' | 'down') {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, feedback: fb } : m)))
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full" style={{ background: '#F9FAFB' }}>
      {/* Mode selector */}
      <div className="flex-shrink-0 bg-white border-b px-4 py-3" style={{ borderColor: '#E5E7EB' }}>
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150"
              style={
                mode === m.id
                  ? { background: '#6366F1', color: '#fff' }
                  : { background: '#F3F4F6', color: '#6B7280' }
              }
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: '#EEF2FF' }}
            >
              <span className="text-2xl">🤖</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Second Brain de Vendas</h2>
            <p className="text-sm text-gray-500 max-w-xs">
              Seu segundo cérebro em tempo real. Selecione um modo e comece a conversa.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 max-w-sm w-full">
              {[
                { m: 'diagnose' as ModeId, text: 'Mapear momento do lead' },
                { m: 'objeção' as ModeId, text: 'Tratar uma objeção' },
                { m: 'proposta' as ModeId, text: 'Montar um orçamento' },
                { m: 'livre' as ModeId, text: 'Tirar uma dúvida' },
              ].map((s) => (
                <button
                  key={s.m}
                  onClick={() => {
                    setMode(s.m)
                    setInput(s.text)
                    setTimeout(() => textareaRef.current?.focus(), 50)
                  }}
                  className="text-left p-3 bg-white border rounded-xl text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div
                className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-indigo-900 whitespace-pre-wrap"
                style={{ background: '#EEF2FF' }}
              >
                {msg.content}
              </div>
            ) : (
              <div className="max-w-[85%] flex flex-col gap-1.5">
                <div
                  className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  {msg.content === '' && streaming ? (
                    <div className="flex items-center gap-2 text-gray-400 text-sm py-1">
                      <Loader2 size={14} className="animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  ) : hasQuoteBlock(msg.content) ? (
                    <QuoteCard content={msg.content} />
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {msg.content && !streaming && (
                  <div className="flex items-center gap-1 pl-1">
                    <button
                      onClick={() => copyMessage(msg.id, msg.content)}
                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 px-1.5 py-1 rounded transition-colors"
                    >
                      {msg.copied ? <Check size={12} /> : <Copy size={12} />}
                      {msg.copied ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => setFeedback(msg.id, 'up')}
                      className={`p-1 rounded transition-colors ${
                        msg.feedback === 'up' ? 'text-emerald-500' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <ThumbsUp size={12} />
                    </button>
                    <button
                      onClick={() => setFeedback(msg.id, 'down')}
                      className={`p-1 rounded transition-colors ${
                        msg.feedback === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <ThumbsDown size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Context inspector */}
      <div className="flex-shrink-0 border-t" style={{ borderColor: '#E5E7EB' }}>
        <button
          onClick={() => setShowContext(!showContext)}
          className="w-full flex items-center justify-between px-4 py-2 text-[11px] text-gray-400 hover:text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <span>
            Modo: <strong className="text-indigo-600">{mode}</strong>
            {sources.length > 0 && (
              <> · <span className="text-indigo-500">{sources.length} fonte{sources.length !== 1 ? 's' : ''} RAG</span></>
            )}
          </span>
          {showContext ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
        </button>
        {showContext && (
          <div className="px-4 pb-3 bg-gray-50">
            {sources.length > 0 ? (
              <ul className="space-y-1">
                {sources.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-[11px] text-gray-500">
                    <span className="truncate max-w-[80%]">{s.title}</span>
                    {s.similarity > 0 && (
                      <span className="text-indigo-400 font-mono ml-2 flex-shrink-0">
                        {(s.similarity * 100).toFixed(0)}%
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-gray-400">
                Envie uma mensagem para ver as fontes consultadas pelo RAG.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t px-4 py-3" style={{ borderColor: '#E5E7EB' }}>
        <div
          className="flex items-end gap-2 bg-white border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-200 transition-shadow"
          style={{ borderColor: '#E5E7EB' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder={`Mensagem no modo ${mode}… (Enter envia · Shift+Enter nova linha)`}
            className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent leading-relaxed"
            style={{ minHeight: '36px', maxHeight: '160px' }}
            rows={1}
            disabled={streaming}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-40"
            style={{ background: input.trim() && !streaming ? '#6366F1' : '#D1D5DB' }}
          >
            {streaming ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Send size={14} className="text-white" />
            )}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-1.5">
          Respostas geradas por IA — verifique preços e regras com o gestor.
        </p>
      </div>
    </div>
  )
}

export default function CopilotVendasPage() {
  return (
    <Suspense fallback={null}>
      <CopilotVendasContent />
    </Suspense>
  )
}
