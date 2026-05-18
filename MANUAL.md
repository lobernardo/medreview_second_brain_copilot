# Manual do Usuário — Second Brain Med-Review

> Sistema interno do Grupo Med-Review. Versão 8.0 — Mai/2026

---

## Sumário

1. [Papéis e Acesso](#1-papéis-e-acesso)
2. [Copilot Vendas](#2-copilot-vendas)
3. [Copilot Onboarding](#3-copilot-onboarding)
4. [Verdadeiro Valor](#4-verdadeiro-valor)
5. [No Radar — Leads](#5-no-radar--leads)
6. [Copys & Macros](#6-copys--macros)
7. [Templates WhatsApp](#7-templates-whatsapp)
8. [FAQ](#8-faq)
9. [Matriz de Objeções](#9-matriz-de-objeções)
10. [Knowledge Base](#10-knowledge-base)
11. [Agenda](#11-agenda)
12. [Catálogo de Produtos](#12-catálogo-de-produtos)
13. [Configurações Pessoais](#13-configurações-pessoais)
14. [Home — Painel Inicial](#14-home--painel-inicial)
15. [Gestão de Usuários (Gestor)](#15-gestão-de-usuários-gestor)
16. [Config Onboarding (Gestor)](#16-config-onboarding-gestor)
17. [Acompanhamento Onboarding (Gestor)](#17-acompanhamento-onboarding-gestor)

---

## 1. Papéis e Acesso

O sistema tem três perfis de usuário. Cada perfil enxerga um conjunto diferente de módulos na barra lateral.

| Módulo | Closer | Gestor | Onboarding |
|--------|:------:|:------:|:----------:|
| Home | ✅ | ✅ | ✅ |
| Copilot Vendas | ✅ | ✅ | — |
| Copilot Onboarding | — | ✅ | ✅ |
| Verdadeiro Valor | ✅ | ✅ | ✅ |
| Agenda | ✅ | ✅ | ✅ |
| No Radar | ✅ | ✅ | — |
| Copys | ✅ | ✅ | — |
| Templates | ✅ | ✅ | — |
| Produtos | ✅ | ✅ | ✅ |
| FAQ | ✅ | ✅ | ✅ |
| Matriz de Objeções | ✅ | ✅ | — |
| Knowledge Base | ✅ | ✅ | ✅ |
| Usuários | — | ✅ | — |
| Acompanhamento | — | ✅ | — |
| Config Onboarding | — | ✅ | — |
| Configurações | ✅ | ✅ | ✅ |

**Closer:** vendedor ativo. Acesso pleno às ferramentas de venda.
**Gestor:** acesso total + ferramentas de gestão e configuração do sistema.
**Onboarding:** colaborador em treinamento. Acesso apenas ao Copilot Onboarding e conteúdo de consulta.

> O gestor pode ativar/desativar o modo onboarding de um colaborador em **Usuários** ou **Config Onboarding**.

---

## 2. Copilot Vendas

**Quem usa:** Closer e Gestor
**Rota:** `/copilot-vendas`

O Copilot Vendas é o assistente principal do time comercial. Ele responde com base na sua base de conhecimento real — produtos, playbooks, FAQs validadas, objeções mapeadas — e se adapta ao seu perfil.

### 2.1 Modos de Uso

Selecione o modo antes de enviar a mensagem. O modo muda o comportamento, o foco e o formato da resposta.

| Modo | Quando usar | O que entrega |
|------|-------------|---------------|
| **Diagnose** | Primeiro contato com um lead | Perfil do lead, vertical, produto mais provável, objeção mais comum |
| **Produto** | Quero entender ou explicar um produto | Descrição completa + versão comercial para o lead |
| **Objeção** | Lead travou em uma objeção | Significado real da objeção, resposta recomendada, o que NÃO dizer |
| **Proposta** | Montar uma proposta ou precificação | JSON estruturado com proposta → renderizado como card |
| **Follow-up** | Reengajar lead que sumiu | Copy de follow-up contextualizada |
| **Regra** | Dúvida sobre processo, política ou regra | Resposta baseada nos playbooks e regras internas |
| **Copys** | Preciso de uma copy específica | Copy para WhatsApp, e-mail ou DM, no seu tom |
| **Livre** | Qualquer outra pergunta | Resposta livre com tudo que o sistema tem |

### 2.2 Como fazer boas perguntas

O Copilot usa seu contexto (nome, tom, vertical) automaticamente. Quanto mais específico você for, melhor a resposta.

**Exemplos por modo:**

**Diagnose:**
> "Lead de 30 anos, médico anestesiologista PJ, consultou sobre o Extensivo Anest mas disse que vai pensar. O que fazer?"

**Produto:**
> "Me explica o Extensivo Anest completo e me dá a versão comercial pra passar pro lead"

**Objeção:**
> "Lead disse que é caro demais e que vai esperar o próximo ciclo"

**Proposta:**
> "Montar proposta pra médica oftalmologista, R1 em andamento, interessada no Intensivo Oft, perfil conservador"

**Follow-up:**
> "Lead sumiu há 3 dias depois de pedir proposta do R1 Estratégico. Copy de reengajamento"

**Regra:**
> "Posso dar desconto acima de X% por conta própria ou precisa de aprovação?"

**Copys:**
> "Copy de primeiro contato pra médico que vai fazer prova do CBO em 45 dias"

### 2.3 Modo Produto — como funciona

Quando você pergunta sobre um produto, o sistema busca diretamente o documento do produto na base por palavras-chave do título. O documento aparece como **fonte primária** — o Copilot responde com base nele, não em memória genérica.

- Se o produto está cadastrado na base com embedding, a resposta será fiel ao documento
- Se o produto não está na base, o Copilot avisa que tem informações parciais

### 2.4 Modo Proposta — o QuoteCard

No modo `proposta`, o Copilot gera um card estruturado com:
- Nome e perfil do lead
- Produto recomendado
- Condições (preço, parcelamento, bônus)
- Argumentação principal

Após a proposta, você pode marcar **Win** ou **Loss**. Isso alimenta a base de exemplos de orçamentos, que o Copilot usa como referência em propostas futuras.

### 2.5 Diagnóstico via No Radar

Ao abrir um lead no módulo **No Radar**, o botão "Diagnóstico no Copilot" pré-preenche o contexto do lead (nome, vertical, produto de interesse, objeção principal) e abre o Copilot Vendas direto no modo `diagnose`.

### 2.6 Dicas de uso

- **Configure seu perfil** em Configurações antes de usar — tom, saudação, vertical — o Copilot usa tudo isso
- O histórico da conversa fica ativo dentro da mesma sessão. Para um assunto novo, recarregue a página
- O Copilot **não inventa** — se não tiver informação na base, ele avisa. Use isso como sinal para alimentar a KB

---

## 3. Copilot Onboarding

**Quem usa:** Onboarding e Gestor
**Rota:** `/copilot-onboarding`

O Copilot Onboarding é o treinador virtual para novos colaboradores. Ele segue a trilha configurada pelo gestor, guia tema a tema e aplica quiz de verificação.

### 3.1 Como funciona para o colaborador

1. Ao entrar, você vê o tema atual na barra de progresso no topo
2. O Copilot apresenta o tema e começa a explicar
3. Faça perguntas livremente sobre o tema — o Copilot responde com base na base de conhecimento real da empresa
4. Quando se sentir pronto, clique em **"Próximo tema"** para avançar
5. Ao avançar, o Copilot pode aplicar um quiz rápido para verificar o aprendizado
6. Seu progresso é salvo automaticamente — pode fechar e retornar de onde parou

### 3.2 O que perguntar

- "O que é o Extensivo Anest?"
- "Qual o ICP desse produto?"
- "Como funciona o parcelamento?"
- "Quais são as objeções mais comuns?"
- "Quando devo indicar o R1 Estratégico vs o Intensivo R1?"

O Copilot busca nas FAQs validadas, nos documentos da base de conhecimento e nas informações de provas e eventos para responder.

### 3.3 Como funciona para o gestor

O gestor pode usar o Copilot Onboarding para rever a trilha e testar as respostas como se fosse um colaborador. Isso ajuda a identificar lacunas na base de conhecimento.

---

## 4. Verdadeiro Valor

**Quem usa:** Todos
**Rota:** `/verdadeiro-valor`

Centraliza os argumentos de valor da Med-Review para uso em negociações.

### 4.1 Seção 1 — Texto principal

Documento Markdown editável pelo gestor, inline. Pode conter tabelas, listas, formatação livre. Aparece formatado para leitura do time. Use para documentar:
- Por que a Med-Review é diferente
- Comparativos com concorrentes
- Argumentos de confiança e prova social

### 4.2 Seção 2 — Big Numbers

Grid de indicadores-chave (aprovações, taxa de sucesso, alunos formados, etc.). Gestor pode:
- **Adicionar** novo big number via modal
- **Editar** valor, descrição, categoria e vertical
- **Excluir** (hard delete — sem reversão)

Esses dados são injetados automaticamente no contexto de todos os copilots.

---

## 5. No Radar — Leads

**Quem usa:** Closer e Gestor
**Rota:** `/leads`

Bloco de notas pessoal para acompanhar leads ativos. Cada closer vê apenas seus próprios leads.

### 5.1 Cadastrando um lead

Campos disponíveis:
- Nome, telefone, e-mail
- Vertical (Anest, Oft, Ortop, R1)
- Produto de interesse
- Objeção principal
- Notas livres

### 5.2 Usando o Diagnóstico no Copilot

O botão **"Diagnóstico no Copilot"** abre o Copilot Vendas com o contexto do lead pré-carregado: vertical, produto de interesse e objeção. Economiza tempo e garante que o diagnóstico começa com as informações corretas.

### 5.3 Boas práticas

- Anote a objeção real que o lead falou, não uma paráfrase — o Copilot vai cruzar com a Matriz de Objeções
- Atualize as notas após cada contato para que o histórico faça sentido no próximo acesso

---

## 6. Copys & Macros

**Quem usa:** Closer e Gestor
**Rota:** `/copys`

Biblioteca de mensagens prontas para WhatsApp, DM e e-mail.

### 6.1 As três abas

**Minhas:** suas copys privadas. Só você vê.
**Time:** copys marcadas como `is_shared = true`. Todo o time vê e pode usar.
**Buscar:** busca semântica — encontra copys por intenção, não apenas por palavra exata.

### 6.2 Criando uma copy

- **Título:** identificação interna (ex: "Follow-up pós proposta — Anest")
- **Categoria:** tipo de uso (follow-up, proposta, reengajamento, etc.)
- **Vertical:** para filtrar por contexto
- **Quando usar:** instrução para o Copilot recomendar no momento certo
- **Mensagem:** o texto, com variáveis `{{nome}}`, `{{vertical}}`, `{{produto}}`
- **Compartilhar com o time:** ativa a copy na aba Time

### 6.3 Preview WhatsApp

Antes de salvar, o preview mostra a copy como bolha de WhatsApp. Bom para checar formatação e tamanho.

### 6.4 O Copilot usa suas copys

No modo `follow-up`, `proposta` e `copys`, o Copilot busca suas copys salvas (e as do time) como referência de tom e estilo. Quanto mais copys boas você tiver salvas, mais personalizada será a resposta.

---

## 7. Templates WhatsApp

**Quem usa:** Closer e Gestor
**Rota:** `/templates`

Templates estruturados para cada momento do processo comercial.

### 7.1 Momentos disponíveis

- Reengajamento
- Follow-up
- Negociação
- Encerramento
- Primeiro contato
- Pós-venda

### 7.2 Favoritos

Marque templates com a estrela para acessar rapidamente. Favoritos ficam no topo da lista e são pessoais (por usuário).

### 7.3 Variáveis

Templates usam variáveis como `{{nome}}`, `{{produto}}`, `{{data_prova}}`. Ao usar, substitua as variáveis antes de enviar.

### 7.4 Busca semântica

A aba de busca encontra templates por intenção — "reativar lead que não respondeu" encontra templates de reengajamento mesmo que essas palavras não apareçam no texto.

---

## 8. FAQ

**Quem usa:** Todos (Gestor edita e valida)
**Rota:** `/faq`

Base de perguntas e respostas validadas. Alimenta diretamente o RAG dos copilots.

### 8.1 As duas abas

**Comercial (interno):** dúvidas do próprio time — processos, regras, políticas.
**Clientes:** dúvidas que os leads fazem — sobre provas, plataforma, pagamento, acesso.

### 8.2 Status das FAQs

- **Rascunho:** criada mas não revisada. O Copilot **não usa** rascunhos no RAG.
- **Validado:** revisada e aprovada. O Copilot usa no RAG.

> Apenas gestores devem validar FAQs. Rascunhos servem para staging.

### 8.3 Categorias

Produto | Provas & Datas | Pagamento | Acesso & Plataforma | Processo Comercial | Pós-venda | Regras Internas | Outros

### 8.4 Como o Copilot usa FAQs

O Copilot busca as 3 FAQs mais relevantes para cada pergunta. Quando a relevância é > 80%, ele prioriza a FAQ sobre qualquer outro conhecimento genérico. A relevância aparece no lado oculto do sistema como `[relevância: 87%]`.

**Dica:** FAQs bem escritas com resposta completa têm muito mais impacto que respostas vagas.

---

## 9. Matriz de Objeções

**Quem usa:** Closer e Gestor
**Rota:** `/objecoes`

Playbook de objeções estruturado. Para cada objeção, o sistema documenta o que o lead realmente quer dizer, como responder e o que nunca dizer.

### 9.1 Estrutura de cada objeção

- **Objeção** (frase exata como o lead fala)
- **Significado real** (o que está por trás)
- **Resposta recomendada** (script validado pelo time)
- **O que NÃO dizer**
- **Pontos de prova** (argumentos de apoio)
- **Win rate** (% de conversão com essa abordagem)

### 9.2 Minha resposta

Cada closer pode salvar sua própria versão da resposta — um script pessoal. O Copilot Vendas, no modo `objeção`, injeta a sua resposta pessoal junto com a resposta recomendada do time.

Isso é poderoso: o Copilot vai sugerir a resposta do time como base, mas vai incluir o que funcionou especificamente para você.

### 9.3 Como o Copilot usa a Matriz

No modo `objeção`, o sistema busca as 4 objeções mais similares à situação descrita. Apresenta o contexto completo + sua resposta pessoal (se você tiver uma salva para aquela objeção).

---

## 10. Knowledge Base

**Quem usa:** Todos (Gestor escreve e valida, closers podem usar como referência)
**Rota:** `/kb`

O repositório central de conhecimento da empresa. Alimenta o RAG de todos os copilots.

### 10.1 Três formas de adicionar conteúdo

**Escrever:** formulário direto. Bom para notas rápidas, playbooks, processos.
**Importar:** arquivo `.md` ou `.txt`. Bom para documentos já existentes.
**Transcrever:** gravação de áudio (reunião, call, treinamento) — o sistema transcreve via Whisper e processa o conteúdo.

### 10.2 O fluxo de 3 passos

1. **Formulário:** título + conteúdo (texto livre, importado ou transcrito)
2. **Revisão inteligente:** o sistema analisa o conteúdo e sugere categoria, tags e divisão em partes. Você pode ajustar antes de salvar.
3. **Salvar:** o documento é salvo e o embedding é gerado automaticamente (fire-and-forget)

### 10.3 Categorias

| Categoria | Uso | Aparece onde |
|-----------|-----|-------------|
| `produto` | Fichas de produto | Copilot Vendas (modo produto), Onboarding |
| `playbook` | Processos de venda | Copilot Vendas (modo regra, livre) |
| `tecnica-comercial` | Técnicas e estratégias | Copilot Vendas + Insight do Dia na Home |
| `objeção-resposta` | Scripts de objeção | Copilot Vendas (modo objeção) |
| `regra-comercial` | Políticas internas | Copilot Vendas (modo regra) |
| `diferencial` | Diferenciais competitivos | Todos os modos |
| `faq` | Perguntas frequentes | Redundante — prefira usar o módulo FAQ |
| `template-followup` | Templates de texto | Copilot Vendas (modo follow-up) |
| `case-sucesso` | Histórias de sucesso | Copilot Vendas (modos proposta e livre) |
| `script-copy` | Scripts e copys | Copilot Vendas (modo copys) |

### 10.4 Produto como categoria especial

Documentos com `category = 'produto'` são a base do **Catálogo de Produtos**. São a fonte primária quando alguém pergunta sobre um produto no Copilot Vendas. O embedding desses documentos representa o produto inteiro — ICP, pitch, objeções, condições comerciais, quando indicar.

> **Nunca** use a KB para adicionar novos produtos. Use o Catálogo de Produtos (`/produtos`), que tem o formulário estruturado com os 13 campos corretos.

### 10.5 Insight do Dia

Documentos com `category = 'tecnica-comercial'` aparecem como **Insight do Dia** na Home. O sistema rotaciona um documento diferente por dia, expostos de forma resumida com opção de expandir.

Alimente regularmente com:
- Técnicas de fechamento
- Estratégias de diagnóstico
- Abordagens de reengajamento
- Fundamentos de negociação

---

## 11. Agenda

**Quem usa:** Todos (Gestor edita)
**Rota:** `/agenda`

Central de datas importantes: provas e eventos da empresa.

### 11.1 Provas & Datas

Lista de provas por vertical com:
- Data da prova
- Prazo de inscrição (início e fim)
- Link para o Monday (quando cadastrado)
- Countdown colorido:
  - 🔴 ≤ 30 dias
  - 🟡 31–60 dias
  - 🟢 > 60 dias

**Para o time comercial:** provas próximas criam urgência real. Quando um lead está a 40 dias de uma prova, o copilot usa esse dado para argumentar prazo de decisão.

### 11.2 Calendário de Eventos

Eventos da empresa (lançamentos, campanhas, deadlines, outros). Agrupados por mês. Suporta multi-select de verticais — um evento pode impactar mais de uma.

Os eventos dos próximos 30 dias aparecem na Home automaticamente.

---

## 12. Catálogo de Produtos

**Quem usa:** Todos (Gestor cadastra e edita)
**Rota:** `/produtos`

Fichas estruturadas de todos os produtos. Formulário padronizado com 13 campos que garantem que o embedding do produto seja rico e completo.

### 12.1 Campos do formulário

1. **Nome do produto**
2. **Vertical** (Anest, Oft, Ortop, R1)
3. **Status** (ativo, em breve, descontinuado)
4. **Descrição geral**
5. **ICP (Perfil ideal de cliente)** — quem é o lead certo para esse produto
6. **Pitch de 30 segundos** — a versão mais curta e direta para abordagem
7. **O que inclui** — lista de entregáveis
8. **Objeções comuns + respostas** — as 3-5 mais frequentes
9. **Condições comerciais** — preço, parcelamento, desconto máximo, bônus
10. **Quando indicar** — situações e perfis
11. **Quando NÃO indicar** — contra-indicações
12. **Diferenciais vs concorrência**
13. **Notas internas** — informações que só o time precisa saber

### 12.2 Como adicionar um novo produto

**Não é pelo Catálogo de Produtos.** Produtos são adicionados via Knowledge Base:
1. Vá em `/kb`
2. Escreva o conteúdo do produto ou use o formulário do catálogo
3. Selecione `categoria = produto`
4. O sistema faz o embedding automaticamente

O Catálogo de Produtos existe para **editar** produtos já cadastrados.

### 12.3 Status do produto

O campo status fica em `tags[0]` no banco. Produtos com status `descontinuado` continuam acessíveis mas devem ser tratados com cautela nas respostas do Copilot.

---

## 13. Configurações Pessoais

**Quem usa:** Todos
**Rota:** `/settings`

Personalize como o Copilot fala com você e sobre você.

### 13.1 Dados pessoais

- **Nome:** como o Copilot vai te chamar e como vai apresentar propostas
- **Telefone / WhatsApp**
- **Vertical principal:** múltiplo — chips clicáveis (R1, Anest, Oft, Ortop). Afeta quais documentos o RAG prioriza quando não há keyword de vertical na pergunta.

### 13.2 Style Wizard

5 passos para definir seu estilo de comunicação:

1. **Tom:** Direto | Consultivo | Motivacional | Descontraído
2. **Emoji:** Usa sempre | Usa às vezes | Não usa
3. **Tratamento:** Você | Tu | Você (formal)
4. **Encerramento:** frase de fechamento padrão
5. **Exemplo livre:** escreva como você costuma falar — o Copilot aprende seu padrão

Essas configurações são injetadas no system prompt do Copilot Vendas. O assistente vai adaptar tom, tratamento e vocabulário ao seu estilo.

---

## 14. Home — Painel Inicial

**Quem usa:** Todos
**Rota:** `/`

Painel de contexto rápido. Tem tudo que você precisa saber ao abrir o sistema.

### 14.1 O que aparece

1. **Saudação:** bom dia/tarde/noite + seu nome + data de hoje
2. **Insight do Dia:** técnica comercial da KB, rotaciona diariamente. Clique em "ver mais" para expandir
3. **Alertas Comerciais** (closer/gestor): provas com inscrições fechando ou muito próximas — sinais de urgência para leads
4. **Próximas Provas:** 5 provas mais próximas com countdown colorido
5. **Esta Semana:** eventos dos próximos 7 dias
6. **Próximos 30 dias:** eventos entre 8 e 30 dias (oculto se não houver)
7. **Acesso Rápido:** atalhos para os módulos mais usados pelo seu perfil

---

## 15. Gestão de Usuários (Gestor)

**Quem usa:** Gestor
**Rota:** `/usuarios`

Painel para gerenciar todos os colaboradores do sistema.

### 15.1 O que o gestor pode fazer

- Ver todos os usuários cadastrados com nome, role e vertical
- Alterar o role de qualquer colaborador:
  - `closer` → `onboarding` (ativa o modo treinamento)
  - `onboarding` → `closer` (libera para trabalho ativo)
  - `closer` → `gestor` (promove a gestor)

### 15.2 Proteção contra auto-rebaixamento

O gestor não pode alterar o próprio role. Isso evita que o único gestor do sistema se bloqueie acidentalmente.

---

## 16. Config Onboarding (Gestor)

**Quem usa:** Gestor
**Rota:** `/onboarding-config`

Define como o Copilot Onboarding vai guiar os novos colaboradores.

### 16.1 Configurações da trilha

- **Trilha de temas:** lista ordenada dos temas a serem cobertos (ex: "Produtos R1", "Como fazer diagnóstico", "Gestão de objeções")
- **Mensagem de boas-vindas:** texto inicial do Copilot ao abrir o onboarding
- **Instruções personalizadas:** regras específicas para o onboarding ("sempre perguntar sobre formação do lead")
- **Tom:** tom do Copilot durante o treinamento (mais formal, mais didático, etc.)
- **Complexidade máxima:** nível de profundidade das respostas (iniciante / intermediário / avançado)
- **Verticais de foco:** se o colaborador vai trabalhar só com R1, o Copilot prioriza esse conteúdo

### 16.2 Ativar onboarding por colaborador

Na seção inferior da página, o gestor vê todos os usuários com role `closer` e pode:
- **Ativar Onboarding:** muda o role para `onboarding`, dando acesso ao Copilot Onboarding e bloqueando o Copilot Vendas
- **Concluir / Reverter:** quando o colaborador termina a trilha, muda o role de volta para `closer`

---

## 17. Acompanhamento Onboarding (Gestor)

**Quem usa:** Gestor
**Rota:** `/onboarding-acompanhamento`

Dashboard de acompanhamento dos colaboradores em treinamento.

### 17.1 O que o gestor vê

Para cada colaborador em onboarding:
- **% de conclusão** da trilha
- **Status:** Não iniciado | Em andamento | Pausado | Concluído
- **Última atividade:** quando o colaborador interagiu por último
- **Temas concluídos vs total**

> Status **Pausado** é acionado automaticamente quando o colaborador não interage há mais de 7 dias e ainda não concluiu a trilha.

### 17.2 Tópicos com mais erros

Na parte inferior do painel, o sistema mostra os 3 tópicos onde os colaboradores erraram mais no quiz. Isso indica gaps no conteúdo da base de conhecimento ou na clareza da trilha.

**Ação recomendada:** se um tópico tem taxa de erro > 50%, revise o documento correspondente na KB ou adicione uma FAQ específica para esse ponto.

### 17.3 Drill-down individual

Clique em um colaborador para ver o progresso detalhado: quais temas ele concluiu, quando, e quais perguntas do quiz ele errou com a resposta que deu.

---

## Apêndice — Dicas Gerais

**Para gestores:**
- Mantenha a KB atualizada. Toda mudança de produto, regra ou processo deve entrar na KB imediatamente — o Copilot só sabe o que está na base.
- Valide FAQs regularmente. Rascunhos não aparecem no Copilot.
- Revise a trilha de onboarding após novos produtos ou mudanças de processo.
- Monitore os tópicos com alta taxa de erro no quiz — eles revelam lacunas no conteúdo.

**Para closers:**
- Configure seu perfil antes de usar o Copilot — faz diferença real no tom das respostas.
- Salve copys que funcionam como "Minhas" e depois marque as melhores para o time.
- Use o modo `produto` para estudar antes de uma call difícil.
- Registre objeções reais que você recebe para alimentar a Matriz.

**Para colaboradores em onboarding:**
- Use o Copilot como um colega experiente, não como um teste. Pergunte tudo.
- Não avance o tema até entender de verdade — o quiz vai testar.
- Consulte o Catálogo de Produtos e o FAQ quando quiser aprofundar fora do Copilot.
