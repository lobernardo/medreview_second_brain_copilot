import StubPage from '@/components/layout/stub-page'
import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <StubPage
      title="Dashboard"
      description="Métricas e resumo do time comercial — wins, objeções frequentes, leads ativos e performance da semana."
      icon={LayoutDashboard}
      phase="Fase 3"
    />
  )
}
