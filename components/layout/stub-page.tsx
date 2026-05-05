import { Construction } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StubPageProps {
  title: string
  description: string
  icon: LucideIcon
  phase?: string
  accessLabel?: string
}

export default function StubPage({
  title,
  description,
  icon: Icon,
  phase,
  accessLabel,
}: StubPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="bg-[#EEF2FF] rounded-2xl p-5 mb-6">
        <Icon size={40} className="text-[#6366F1]" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-semibold text-[#111827] mb-2">{title}</h1>
      <p className="text-sm text-[#6B7280] max-w-sm leading-relaxed mb-6">{description}</p>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 bg-[#FFFBEB] border border-[#F59E0B]/30 rounded-full px-4 py-1.5">
          <Construction size={13} className="text-[#F59E0B]" />
          <span className="text-xs font-medium text-[#F59E0B]">
            {phase ? `${phase} · Em construção` : 'Em construção'}
          </span>
        </div>

        {accessLabel && (
          <div className="flex items-center gap-1.5 bg-[#EEF2FF] rounded-full px-3 py-1">
            <span className="text-[11px] font-medium text-[#6366F1]">{accessLabel}</span>
          </div>
        )}
      </div>
    </div>
  )
}
