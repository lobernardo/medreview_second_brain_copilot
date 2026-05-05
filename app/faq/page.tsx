import StubPage from '@/components/layout/stub-page'
import { HelpCircle } from 'lucide-react'

export default function FaqPage() {
  return (
    <StubPage
      title="FAQ"
      description="Perguntas frequentes internas do time comercial e de clientes. Validadas pelo gestor e usadas como fonte pelo copilot."
      icon={HelpCircle}
      phase="Fase 7"
      accessLabel="Todos"
    />
  )
}
