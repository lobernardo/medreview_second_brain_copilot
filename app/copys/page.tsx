import StubPage from '@/components/layout/stub-page'
import { Mail } from 'lucide-react'

export default function CopysPage() {
  return (
    <StubPage
      title="Copys & Macros"
      description="Biblioteca de mensagens prontas por categoria, vertical e fase do funil. Compartilhadas pelo time, consultadas pelo copilot."
      icon={Mail}
      phase="Fase 6"
      accessLabel="Closer · Gestor"
    />
  )
}
