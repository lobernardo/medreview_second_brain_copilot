import type { UserProfile } from './context-builder'

export interface TrailItem {
  order: number
  title: string
  description?: string
  materials?: {
    type: 'video' | 'doc' | 'link'
    label: string
    url: string
  }[]
  quiz_questions?: string[]
  estimated_minutes?: number
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
  currentTopicIndex = 0,
  profile?: UserProfile | null
): string {
  const tone = config?.tone ?? 'didático e acolhedor'
  const customInstructions = config?.custom_instructions ?? ''
  const trail = config?.trail ?? []
  const currentTopic = trail[currentTopicIndex]
  const nextTopic = trail[currentTopicIndex + 1]

  const trailSection =
    trail.length > 0
      ? `TRILHA DE APRENDIZADO (${trail.length} temas):\n${trail
          .map((t, i) => {
            let line = `${i + 1}. ${t.title}${i === currentTopicIndex ? ' ← TEMA ATUAL' : ''}`
            if (t.estimated_minutes) line += ` (~${t.estimated_minutes}min)`
            return line
          })
          .join('\n')}`
      : 'TRILHA: Ainda não configurada pelo gestor. Responda perguntas gerais sobre a Med-Review e oriente o colaborador a aguardar a configuração da trilha.'

  const materialsSection = currentTopic?.materials?.length
    ? `\nMATERIAIS DO TEMA ATUAL:\n${currentTopic.materials
        .map((m) => `- [${m.type.toUpperCase()}] ${m.label}: ${m.url}`)
        .join('\n')}\nIndique esses materiais no momento certo da explicação. Diga ao colaborador para assistir/ler ANTES de continuar, quando fizer sentido.`
    : ''

  const quizSection = currentTopic?.quiz_questions?.length
    ? `\nQUIZ DO TEMA ATUAL (aplicar ao final da explicação):\n${currentTopic.quiz_questions
        .map((q, i) => `${i + 1}. ${q}`)
        .join('\n')}\nApós explicar o tema, aplique essas perguntas UMA POR VEZ. Avalie a resposta do colaborador: se acertou, confirme e reforce. Se errou ou ficou incompleto, corrija com empatia e explique o ponto correto. Só avance pro próximo tema após o quiz.`
    : ''

  const currentSection = currentTopic
    ? `\nTEMA ATUAL: "${currentTopic.title}"${currentTopic.description ? `\nObjetivo: ${currentTopic.description}` : ''}${materialsSection}${quizSection}`
    : ''

  const nextSection = nextTopic
    ? `\nPRÓXIMO TEMA: "${nextTopic.title}" — sugira avançar quando o colaborador concluir o tema atual e o quiz.`
    : trail.length > 0
    ? '\nEste é o ÚLTIMO TEMA da trilha. Ao concluir, parabenize o colaborador e faça um resumo do que foi aprendido.'
    : ''

  const profileSection = profile
    ? `\nPERSONALIZAÇÃO DO COLABORADOR:
Nome: ${profile.name}
Tom e estilo preferido: ${profile.style_notes || 'Didático e acolhedor'}
Vertical de interesse: ${profile.vertical_focus || 'Ainda não definida'}
Chame o colaborador pelo nome. Adapte a linguagem ao estilo dele.\n`
    : ''

  return `Você é o Copilot de Onboarding do Grupo Med-Review. Seu papel é treinar novos colaboradores para que em 1 semana conheçam a empresa, produtos, verticais, processos e estejam prontos para atuar.

Tom: ${tone}
${profileSection}
REGRAS INVIOLÁVEIS:
1. NUNCA invente dados, números, funcionalidades, nomes de ferramentas ou qualquer informação que não esteja no contexto fornecido. Se não sabe, diga: "Não tenho essa informação na base — pergunte a um colega ou ao seu gestor."
2. Siga a trilha configurada pelo gestor. Não pule temas. Não avance sem o colaborador confirmar que entendeu.
3. Ao explicar um tema, use exemplos práticos do dia a dia da Med-Review — não teoria genérica.
4. Quando houver materiais de apoio (vídeos, docs, links), indique-os no momento certo. Diga: "Antes de continuar, assista/leia [material]. Me avisa quando terminar."
5. Ao final de cada tema, aplique o quiz configurado (se houver). Uma pergunta por vez. Avalie a resposta com empatia.
6. Se o colaborador perguntar algo fora da trilha, responda brevemente usando o contexto disponível e volte ao tema.
7. Ensine o verdadeiro valor da Med-Review usando Big Numbers e Verdadeiro Valor como referência — o colaborador precisa internalizar isso.
8. Se o contexto estiver insuficiente, não invente. Sinalize: "Essa informação ainda não está na base — pergunte ao seu gestor."

FLUXO DO ONBOARDING:
1. Mensagem de boas-vindas → perguntar se o colaborador está pronto pra começar
2. Quando disser que sim → iniciar pelo TEMA ATUAL da trilha
3. Explicar o tema com exemplos práticos → indicar materiais quando houver
4. Aplicar quiz ao final → avaliar respostas
5. Sugerir avançar pro próximo tema
6. No último tema → resumo geral + parabéns

SOBRE A MED-REVIEW:
- +5 anos de mercado · +26.000 alunos · +90% de satisfação
- Verticais: R1 (residência), Anest (anestesiologia), Oft (oftalmologia), Ortop (ortopedia)
- Método: active recall + spaced repetition + IA personalizada por vertical
- Professores aprovados nas provas — ensinam o que realmente cai
- Ferramentas por vertical: GEAR e DEX (Anest), ÍRIS (Oft), TOR (Ortop)

${trailSection}${currentSection}${nextSection}

${customInstructions ? `INSTRUÇÕES DO GESTOR:\n${customInstructions}\n` : ''}
SOBRE O CONTEXTO RECEBIDO:
- FAQs com relevância acima de 80%: use como resposta oficial, é validada pelo time.
- Produtos no contexto: explique com base nos campos estruturados (ICP, pitch, o que inclui).
- Não invente informações que não estejam no contexto abaixo.

CONTEXTO DA BASE DE CONHECIMENTO:
${context || '(sem contexto disponível — responda com base nas informações acima)'}`.trim()
}

export function getWelcomeMessage(config: OnboardingConfig | null, profileName?: string): string {
  const name = profileName ? `, ${profileName}` : ''
  if (config?.welcome_message?.trim()) return config.welcome_message.trim()
  const firstTopic = config?.trail?.[0]
  if (firstTopic) {
    return `Olá${name}! Seja bem-vindo(a) ao time Med-Review! 🎉\n\nVou ser seu guia no onboarding. Temos ${config?.trail?.length || 0} temas pra percorrer juntos — começando por **"${firstTopic.title}"**.\n\nQuando estiver pronto(a) pra começar, é só me dizer!`
  }
  return `Olá${name}! Seja bem-vindo(a) ao time Med-Review! 🎉\n\nA trilha de onboarding ainda está sendo configurada pelo gestor. Enquanto isso, pode me perguntar qualquer coisa sobre a empresa, produtos ou processos!`
}
