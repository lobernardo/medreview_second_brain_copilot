import StubPage from '@/components/layout/stub-page'
import { BookOpen } from 'lucide-react'

export default function KbPage() {
  return (
    <StubPage
      title="Knowledge Base"
      description="Base de conhecimento central — playbooks, produtos, regras comerciais e cases. Gestor edita, todo o time consulta."
      icon={BookOpen}
      phase="Fase 8"
      accessLabel="Leitura: todos · Edição: gestor"
    />
  )
}
