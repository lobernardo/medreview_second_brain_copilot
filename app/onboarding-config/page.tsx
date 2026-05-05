import StubPage from '@/components/layout/stub-page'
import { Settings2 } from 'lucide-react'

export default function OnboardingConfigPage() {
  return (
    <StubPage
      title="Config Onboarding"
      description="Configure a trilha de aprendizado, instruções do copilot, tom de voz e mensagem de boas-vindas para novos colaboradores."
      icon={Settings2}
      phase="Fase 5"
      accessLabel="Gestor only"
    />
  )
}
