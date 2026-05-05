'use client'

import { CheckCircle2, XCircle, X } from 'lucide-react'

interface ToastProps {
  type: 'success' | 'error'
  message: string
  onClose: () => void
}

export function Toast({ type, message, onClose }: ToastProps) {
  const ok = type === 'success'
  return (
    <div className="fixed top-5 right-5 z-[200]">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl"
        style={{
          background: ok ? '#ECFDF5' : '#FEF2F2',
          border: ok ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          minWidth: '240px',
          maxWidth: '360px',
        }}
      >
        {ok
          ? <CheckCircle2 size={16} className="text-[#10B981] shrink-0" />
          : <XCircle size={16} className="text-[#EF4444] shrink-0" />
        }
        <span
          className="text-sm font-medium flex-1"
          style={{ color: ok ? '#065F46' : '#991B1B' }}
        >
          {message}
        </span>
        <button
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-[#374151] transition-colors ml-1"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
