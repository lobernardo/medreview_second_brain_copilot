import StubPage from '@/components/layout/stub-page'
import { FileText } from 'lucide-react'

export default function LogsPage() {
  return (
    <StubPage
      title="Logs"
      description="Registro diário de conversas, objeções, wins e losses. Alimenta o dashboard de métricas e o copilot com dados reais."
      icon={FileText}
      phase="Fase 3"
      accessLabel="Closer · Gestor"
    />
  )
}
