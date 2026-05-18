'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Send,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowRight,
  GraduationCap,
} from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { getWelcomeMessage, type OnboardingConfig, type TrailItem } from '@/lib/ai/onboarding-prompt'
import { useProfile } from '@/lib/context/profile-context'

interface Source {
  id: string
  title: string
  similarity: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
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

function useOnboardingConfig() {
  const [config, setConfig] = useState<OnboardingConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    async function load() {
      try {
        const { data } = await supabase
          .from('onboarding_config')
          .select('trail, custom_instructions, welcome_message, tone, max_complexity, focus_verticals')
          .limit(1)
          .maybeSingle()
        if (data) {
          setConfig({
            trail: Array.isArray(data.trail) ? (data.trail as TrailItem[]) : [],
            custom_instructions: data.custom_instructions ?? null,
            welcome_message: data.welcome_message ?? null,
            tone: data.tone ?? null,
            max_complexity: data.max_complexity ?? null,
            focus_verticals: data.focus_verticals ?? null,
          })
        }
      } catch { /* table not set up yet */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return { config, loading }
}

export default function CopilotOnboardingPage() {
  const userId = useSupabaseUser()
  const { config, loading } = useOnboardingConfig()
  const profile = useProfile()
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [initialized, setInitialized] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Inject welcome message once config loads
  useEffect(() => {
    if (!loading && !initialized) {
      setInitialized(true)
      const welcome = getWelcomeMessage(config, profile?.name)
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', content: welcome }])
    }
  }, [loading, initialized, config])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim()
      if (!text || streaming) return

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
      setMessages((prev) => [...prev, userMsg])
      setInput('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])
      setStreaming(true)

      try {
        const history = messages
          .filter((m) => m.content)
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }))

        const res = await fetch('/api/copilot-onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            user_id: userId,
            current_topic_index: currentTopicIndex,
            messages: history,
          }),
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
                  prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
                )
              }
            } catch { /* non-JSON SSE line */ }
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
    },
    [input, messages, streaming, userId, currentTopicIndex]
  )

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

  function advanceTopic() {
    const trail = config?.trail ?? []
    if (currentTopicIndex < trail.length - 1) {
      const nextIndex = currentTopicIndex + 1
      setCurrentTopicIndex(nextIndex)
      const nextTitle = trail[nextIndex]?.title ?? 'próximo tema'
      sendMessage(`Vamos para o próximo tema: "${nextTitle}"`)
    }
  }

  const trail = config?.trail ?? []
  const progress = trail.length > 0 ? ((currentTopicIndex + 1) / trail.length) * 100 : 0
  const currentTopic = trail[currentTopicIndex]
  const isLastTopic = currentTopicIndex >= trail.length - 1

  return (
    <div className="flex flex-col h-full" style={{ background: '#F9FAFB' }}>
      {/* Progress bar */}
      {trail.length > 0 && (
        <div className="flex-shrink-0 bg-white border-b px-4 py-3" style={{ borderColor: '#E5E7EB' }}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-indigo-500" strokeWidth={1.5} />
              <span className="text-[12px] font-medium text-gray-700">
                {currentTopic?.title ?? 'Trilha'}
              </span>
            </div>
            <span className="text-[11px] text-gray-400">
              {currentTopicIndex + 1} de {trail.length}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: '#6366F1' }}
            />
          </div>
          {trail.length > 1 && (
            <div className="flex gap-1 mt-2 overflow-x-auto pb-0.5">
              {trail.map((t, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 flex items-center gap-1"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i < currentTopicIndex
                        ? 'bg-indigo-400'
                        : i === currentTopicIndex
                        ? 'bg-indigo-600'
                        : 'bg-gray-200'
                    }`}
                  />
                  <span
                    className={`text-[10px] whitespace-nowrap ${
                      i === currentTopicIndex ? 'text-indigo-600 font-medium' : 'text-gray-400'
                    }`}
                  >
                    {t.title}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Carregando trilha...</span>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' ? (
              <div
                className="max-w-[75%] px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm leading-relaxed text-indigo-900"
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
                  ) : (
                    <div className="prose prose-sm max-w-none text-gray-800">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>

                {msg.content && !streaming && (
                  <div className="flex items-center gap-1 pl-1 flex-wrap">
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

                    {/* Show "Próximo tema" only on last assistant message */}
                    {idx === messages.length - 1 && trail.length > 0 && !isLastTopic && (
                      <button
                        onClick={advanceTopic}
                        className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-full border border-indigo-200 hover:bg-indigo-50 transition-colors ml-1"
                      >
                        Próximo tema
                        <ArrowRight size={11} />
                      </button>
                    )}
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
            Second Brain Onboarding
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
            placeholder="Pergunte ou responda o quiz… (Enter envia · Shift+Enter nova linha)"
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
          Respostas geradas por IA — confirme informações críticas com o gestor.
        </p>
      </div>
    </div>
  )
}
