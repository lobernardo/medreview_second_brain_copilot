export const VERTICAL_CONFIG: Record<string, { color: string; bg: string }> = {
  R1: { color: '#3B82F6', bg: '#EFF6FF' },
  Anest: { color: '#8B5CF6', bg: '#F5F3FF' },
  Oft: { color: '#06B6D4', bg: '#ECFEFF' },
  Ortop: { color: '#F97316', bg: '#FFF7ED' },
}

export const EVENT_TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  conversa: { color: '#6366F1', bg: '#EEF2FF' },
  'objeção': { color: '#F59E0B', bg: '#FFFBEB' },
  win: { color: '#10B981', bg: '#ECFDF5' },
  loss: { color: '#EF4444', bg: '#FEF2F2' },
  feedback: { color: '#6B7280', bg: '#F3F4F6' },
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  conversa: 'Conversa',
  'objeção': 'Objeção',
  win: 'Win',
  loss: 'Loss',
  feedback: 'Feedback',
}

export const RESULT_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  win: { color: '#10B981', bg: '#ECFDF5', label: 'Win' },
  loss: { color: '#EF4444', bg: '#FEF2F2', label: 'Loss' },
  open: { color: '#6B7280', bg: '#F3F4F6', label: 'Aberto' },
}

export const VERTICALS = ['R1', 'Anest', 'Oft', 'Ortop'] as const
export const EVENT_TYPES = ['conversa', 'objeção', 'win', 'loss', 'feedback'] as const
export const LEAD_STAGES = ['Novo', 'Warm', 'Quente'] as const
export const RESULTS = ['win', 'loss', 'open'] as const
