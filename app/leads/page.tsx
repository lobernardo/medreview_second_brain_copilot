import StubPage from '@/components/layout/stub-page'
import { Flame } from 'lucide-react'

export default function LeadsPage() {
  return (
    <StubPage
      title="Leads Quentes"
      description="Pipeline de leads em andamento — verticais, estágio, próxima ação e histórico de contato. Integrado ao CRM."
      icon={Flame}
      phase="Fase 9"
      accessLabel="Closer · Gestor"
    />
  )
}
