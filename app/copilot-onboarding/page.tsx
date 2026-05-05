import StubPage from '@/components/layout/stub-page'
import { GraduationCap } from 'lucide-react'

export default function CopilotOnboardingPage() {
  return (
    <StubPage
      title="Copilot Onboarding"
      description="Guia inteligente para novos colaboradores. Trilha de aprendizado personalizada, quiz e acompanhamento de progresso."
      icon={GraduationCap}
      phase="Fase 5"
      accessLabel="Onboarding · Gestor"
    />
  )
}
