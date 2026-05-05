import StubPage from '@/components/layout/stub-page'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <StubPage
      title="Configurações"
      description="Perfil, tom de voz preferido, vertical de foco, link do WhatsApp e preferências do copilot pessoal."
      icon={Settings}
      phase="Fase 9"
      accessLabel="Todos"
    />
  )
}
