import StubPage from '@/components/layout/stub-page'
import { NotebookPen } from 'lucide-react'

export default function LeadsPage() {
  return (
    <StubPage
      title="Meus Leads"
      description="Bloco de notas dos seus leads — anotações rápidas de contexto, próximas ações e histórico de contato. Simples e direto."
      icon={NotebookPen}
      phase="Fase 9"
      accessLabel="Closer · Gestor"
    />
  )
}
