'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Copy, Check } from 'lucide-react'

interface QuoteData {
  contexto: string
  solucao: string
  entregaveis: string
  investimento: string
  diferenciais: string
  proximos_passos: string
}

interface QuoteCardProps {
  content: string
  onResult?: (result: 'win' | 'loss') => void
}

function extractQuote(content: string): QuoteData | null {
  const match = content.match(/```json\s*([\s\S]*?)```/)
  if (!match) return null
  try {
    return JSON.parse(match[1]) as QuoteData
  } catch {
    return null
  }
}

const sections: { key: keyof QuoteData; label: string; color: string }[] = [
  { key: 'contexto', label: 'Contexto', color: '#6366F1' },
  { key: 'solucao', label: 'Solução', color: '#10B981' },
  { key: 'entregaveis', label: 'Entregáveis', color: '#3B82F6' },
  { key: 'investimento', label: 'Investimento', color: '#F59E0B' },
  { key: 'diferenciais', label: 'Diferenciais', color: '#8B5CF6' },
  { key: 'proximos_passos', label: 'Próximos Passos', color: '#EF4444' },
]

export function QuoteCard({ content, onResult }: QuoteCardProps) {
  const [copied, setCopied] = useState(false)
  const [resultSet, setResultSet] = useState<'win' | 'loss' | null>(null)

  const quote = extractQuote(content)
  if (!quote) return null

  const intro = content.split('```json')[0].trim()

  const fullText = sections.map((s) => `${s.label}:\n${quote[s.key]}`).join('\n\n')

  function handleCopy() {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleResult(r: 'win' | 'loss') {
    setResultSet(r)
    onResult?.(r)
  }

  return (
    <div>
      {intro && <p className="text-sm text-gray-700 mb-3">{intro}</p>}

      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}
        >
          <div>
            <div className="text-white font-semibold text-sm">Proposta Personalizada</div>
            <div className="text-indigo-200 text-xs mt-0.5">Med-Review</div>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {sections.map((s) => (
            <div key={s.key} className="px-4 py-3">
              <div
                className="text-[11px] font-semibold uppercase tracking-wide mb-1"
                style={{ color: s.color }}
              >
                {s.label}
              </div>
              <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                {quote[s.key]}
              </div>
            </div>
          ))}
        </div>

        {!resultSet && onResult && (
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center gap-2" style={{ borderColor: '#E5E7EB' }}>
            <span className="text-xs text-gray-500 mr-1">Marcar resultado:</span>
            <button
              onClick={() => handleResult('win')}
              className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <CheckCircle size={13} /> Fechou
            </button>
            <button
              onClick={() => handleResult('loss')}
              className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <XCircle size={13} /> Perdeu
            </button>
          </div>
        )}

        {resultSet && (
          <div
            className={`px-4 py-2 text-xs font-medium text-center ${
              resultSet === 'win'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {resultSet === 'win' ? 'Marcado como fechado — adicionado aos exemplos que convertem!' : 'Marcado como perdido.'}
          </div>
        )}
      </div>
    </div>
  )
}

export function hasQuoteBlock(content: string): boolean {
  return /```json\s*\{[\s\S]*?"proximos_passos"/.test(content)
}
