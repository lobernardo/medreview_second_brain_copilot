import { VERTICAL_CONFIG } from '@/lib/utils/constants'

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
