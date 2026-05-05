import StubPage from '@/components/layout/stub-page'
import { Bot } from 'lucide-react'

export default function CopilotVendasPage() {
  return (
    <StubPage
      title="Copilot Vendas"
      description="Seu assistente de IA para diagnóstico, objeções, propostas, follow-ups e muito mais. Chat com streaming e 8 modos de contexto."
      icon={Bot}
      phase="Fase 4"
      accessLabel="Closer · Gestor"
    />
  )
}
