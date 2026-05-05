import StubPage from '@/components/layout/stub-page'
import { Target } from 'lucide-react'

export default function PrioritiesPage() {
  return (
    <StubPage
      title="Prioridades da Semana"
      description="Verticais em foco, objeções em alta, mudanças de regras e aprendizados da semana. Definidas pelo gestor para todo o time."
      icon={Target}
      phase="Fase 8"
      accessLabel="Gestor only"
    />
  )
}
