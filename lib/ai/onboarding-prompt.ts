export interface TrailItem {
  order: number
  title: string
  description?: string
}

export interface OnboardingConfig {
  trail: TrailItem[]
  custom_instructions: string | null
  welcome_message: string | null
  tone: string | null
  max_complexity: string | null
  focus_verticals: string[] | null
}

export function buildOnboardingSystemPrompt(
  config: OnboardingConfig | null,
  context: string,
  currentTopicIndex = 0
): string {
  const tone = config?.tone ?? 'didático e acolhedor'
  const customInstructions = config?.custom_instructions ?? ''
  const trail = config?.trail ?? []
  const currentTopic = trail[currentTopicIndex]
  const nextTopic = trail[currentTopicIndex + 1]

  const trailSection =
    trail.length > 0
      ? `TRILHA DE APRENDIZADO (${trail.length} temas):\n${trail
          .map((t, i) => `${i + 1}. ${t.title}${i === currentTopicIndex ? ' ← TEMA ATUAL' : ''}`)
          .join('\n')}`
      : 'TRILHA: Ainda não configurada pelo gestor — responda perguntas gerais sobre a Med-Review.'

  const currentSection = currentTopic
    ? `\nTEMA ATUAL: "${currentTopic.title}"${currentTopic.description ? `\nDescrição: ${currentTopic.description}` : ''}`
    : ''

  const nextSection = nextTopic
    ? `\nPRÓXIMO TEMA: "${nextTopic.title}" (sugira no final da resposta)`
    : trail.length > 0
    ? '\nEste é o último tema. Ao final, parabenize o colaborador pela conclusão da trilha.'
    : ''

  return `Você é o Copilot de Onboarding do Grupo Med-Review. Seu papel é guiar novos colaboradores com tom ${tone}.

REGRAS:
1. Explique conceitos com exemplos práticos e situações reais da Med-Review
2. Após cada explicação, faça uma pergunta ou mini-quiz para fixar o aprendizado
3. Termine sempre com uma sugestão clara do que estudar a seguir
4. Se a pergunta sair da trilha, responda brevemente e volte ao contexto
5. Nunca invente informações — baseie-se apenas no contexto fornecido
6. Ensine o novo colaborador sobre o verdadeiro valor da Med-Review usando os Big Numbers como referência — esses dados devem ser internalizados pelo colaborador

SOBRE A MED-REVIEW:
- +5 anos de mercado · +26.000 alunos · +90% de satisfação
- Verticais: R1, Anestesiologia (Anest), Oftalmologia (Oft), Ortopedia (Ortop)
- Método: active recall + spaced repetition + IA personalizada por vertical
- Professores aprovados nas provas — ensinam o que realmente cai

${trailSection}${currentSection}${nextSection}

${customInstructions ? `INSTRUÇÕES DO GESTOR:\n${customInstructions}\n` : ''}CONTEXTO DA BASE DE CONHECIMENTO:
${context || '(sem contexto disponível — responda com base nas informações acima)'}`.trim()
}

export function getWelcomeMessage(config: OnboardingConfig | null): string {
  if (config?.welcome_message?.trim()) return config.welcome_message.trim()
  const firstTopic = config?.trail?.[0]
  if (firstTopic) {
    return `Olá! Seja bem-vindo ao time Med-Review! 🎉\n\nVou ser seu guia nessa jornada de aprendizado. Nossa trilha começa com **"${firstTopic.title}"**.\n\nComo você prefere começar: quer que eu explique o contexto geral primeiro, ou prefere ir direto ao assunto?`
  }
  return `Olá! Seja bem-vindo ao time Med-Review! 🎉\n\nEstou aqui para te ajudar a conhecer a empresa, os produtos e a forma como trabalhamos. Pode perguntar à vontade!`
}
