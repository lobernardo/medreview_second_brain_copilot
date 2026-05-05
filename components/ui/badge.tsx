import { VERTICAL_CONFIG, EVENT_TYPE_CONFIG, EVENT_TYPE_LABELS, RESULT_CONFIG } from '@/lib/utils/constants'

export function VerticalBadge({ vertical }: { vertical: string | null }) {
  if (!vertical) return null
  const cfg = VERTICAL_CONFIG[vertical] ?? { color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {vertical}
    </span>
  )
}

export function EventBadge({ eventType }: { eventType: string }) {
  const cfg = EVENT_TYPE_CONFIG[eventType] ?? { color: '#6B7280', bg: '#F3F4F6' }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {EVENT_TYPE_LABELS[eventType] ?? eventType}
    </span>
  )
}

export function ResultBadge({ result }: { result: string | null }) {
  if (!result) return null
  const cfg = RESULT_CONFIG[result] ?? { color: '#6B7280', bg: '#F3F4F6', label: result }
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}
