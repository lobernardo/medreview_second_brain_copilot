# CLAUDE.md — Second Brain Med-Review

> **Fonte de verdade do projeto. Leia antes de qualquer tarefa.**
> **Versão:** 8.0 | Data: 18/05/2026

---

## 1. VISÃO GERAL

**Second Brain Med-Review** — sistema web interno do Grupo Med-Review para o time comercial.

| Copilot | Quem usa | Para quê |
|---------|----------|----------|
| **Copilot Vendas** | closers + gestores | Objeções, propostas, diagnóstico, follow-up, copys |
| **Copilot Onboarding** | onboarding + gestores | Aprender produtos, processos, regras do time |

Outros módulos: Verdadeiro Valor, No Radar (leads), Copys & Macros, Templates WhatsApp, FAQ, Matriz de Objeções, Knowledge Base, Agenda, Catálogo de Produtos, Gestão de Usuários, Acompanhamento de Onboarding.

---

## 2. STACK

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js App Router + TypeScript |
| Estilos | Tailwind CSS 4 |
| Componentes | shadcn/ui escrito manualmente + Lucide React |
| Auth | Supabase Auth via `@supabase/ssr` |
| Database | Supabase (PostgreSQL + pgvector) |
| AI Chat | OpenAI `gpt-4o-mini` (primário) + Groq `llama-3.3-70b-versatile` (fallback) via fetch direto |
| AI Embeddings | OpenAI `text-embedding-3-small` (1536 dims) |
| AI Transcrição | OpenAI Whisper `whisper-1` |
| Markdown | react-markdown + remark-gfm |
| Deploy | Vercel |

> **Sem shadcn CLI** — componentes escritos manualmente.
> **`middleware.ts`** — protege todas as rotas: não autenticado → `/login`; autenticado em `/login` → `/`.

---

## 3. VARIÁVEIS DE AMBIENTE

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # nunca expor ao cliente
GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
```

---

## 4. ARQUITETURA RAG

```
Usuário → Promise.all([VV+BigNumbers, ExamDates, Events, Embedding(msg), Profile])
        → detectVertical(msg) || profile.vertical_focus[0] || null  → vertical
        → Buscas vetoriais + keyword em paralelo:
            matchProductsByKeyword  — mode "produto" e "livre" → productParts[] (PRIMÁRIO)
            match_knowledge_base  (5 docs, 0.45)  — sempre → ragParts[]
            match_faq             (3 docs, 0.50)  — sempre → ragParts[]
            match_objections      (4 docs, 0.45)  — só mode "objeção"
              + user_objection_responses do closer (se userId disponível)
            match_copys           (4 docs, 0.45)  — follow-up, proposta, copys
            match_quotes          (3 docs, 0.40)  — só mode "proposta"
        → matchKb retorna boolean (kbFound)
        → Se sources < 2 || !kbFound → fallback textual (search_knowledge_base_text ILIKE)
        → buildFinalContext():
            allRagParts = [...productParts, ...ragParts]  ← produto sempre primeiro
            ragParts  → truncate(8.000 chars, corta no último '.')
            fixedParts → truncate(4.000 chars, corta no último '.')
            contexto final = RAG primeiro + fixos depois (total ≤ 12.000 chars)
        → System prompt → LLM streaming → SSE → cliente
```

**Produto como fonte primária (modes `produto` e `livre`):**
`matchProductsByKeyword` usa keyword matching no título (`title ILIKE %keyword%`) com filtro `category='produto'` e `is_active=true`. Extrai keywords do message filtrando `STOP_WORDS` (conjunções, verbos genéricos, etc.) e palavras com < 4 chars. Matching é AND (todas as keywords devem estar no título) — evita false positives com palavras genéricas como "anest" que aparecem em todos os produtos da vertical. Popula `productParts[]` separado, colocado ANTES do `ragParts[]` no contexto. `similarity: 1` sinaliza prioridade. O system prompt instrui: seção `## Produto` é fonte primária e definitiva; FAQ e KB são complementares. **Ativo em `livre` para evitar respostas rasas/alucinações quando o closer pergunta sobre produto específico em modo livre.**

**Variantes de produto (ex: ME1/ME2/ME3):** cada variante deve ser um documento KB separado com título distinto. Isso permite que o AND keyword matching encontre exatamente o documento certo ("extensivo anest me1" → só ME1, não ME2 ou ME3). Bônus específicos de uma variante (ex: "manual do residente físico" é bônus do ME) devem estar documentados somente no documento da variante correspondente.

**Detecção de vertical (`lib/ai/context-builder.ts`):**
```typescript
const VERTICAL_KEYWORDS = {
  Anest: ['anest', 'anestesiologia', 'tea'],
  Oft:   ['oft', 'oftalmologia', 'cbo'],
  Ortop: ['ortop', 'ortopedia', 'taro'],
  R1:    ['r1', 'residência', 'residencia', 'revalida'],
}
// Fallback: profile.vertical_focus.split(',')[0]
```

**Filtro de vertical nas RPCs:** `filter_vertical IS NULL OR p.vertical = filter_vertical OR p.vertical IS NULL OR p.vertical = 'Geral'` — documentos sem vertical ou com vertical 'Geral' sempre aparecem.

**FAQ no contexto:** cada entrada exibe score — `[relevância: 87%]`. System prompt instrui a priorizar FAQs com relevância >80%.

**LLM (`lib/ai/llm-client.ts`):** tenta OpenAI `gpt-4o-mini` (timeout 15s), fallback Groq `llama-3.3-70b-versatile`. `callLLMStream` para chat, `callLLMJson` para process-document.

**Erros de RAG:** todos os `catch` em `context-builder.ts` têm `console.error('[RAG] <função> failed:', err)` — sem falhas silenciosas.

---

## 5. ESTRUTURA DE PASTAS

```
app/
├── layout.tsx / page.tsx / globals.css
├── login/ copilot-vendas/ copilot-onboarding/ onboarding-config/
├── copys/ leads/ templates/ faq/ objecoes/ kb/
├── verdadeiro-valor/ agenda/ produtos/ settings/
├── usuarios/ onboarding-acompanhamento/
└── api/
    ├── copilot-vendas/ copilot-onboarding/ profile/ embeddings/ transcribe/
    ├── process-document/ copys/ faq/ objecoes/ kb/ templates/ leads/
    ├── big-numbers/ verdadeiro-valor/ favorites/ user-objection-responses/
    ├── exam-dates/ events/ produtos/ dica-do-dia/
    ├── onboarding-config/ onboarding-progress/ onboarding-quiz/
    ├── onboarding-acompanhamento/ onboarding-acompanhamento/[userId]/
    └── usuarios/

components/
├── layout/  app-shell.tsx sidebar.tsx header.tsx mobile-nav.tsx stub-page.tsx
├── ui/      toast.tsx badge.tsx skeleton.tsx
└── chat/    quote-card.tsx

lib/
├── ai/      llm-client.ts embeddings.ts context-builder.ts vendas-prompt.ts onboarding-prompt.ts
├── supabase/ client.ts server.ts admin.ts
├── utils/   types.ts constants.ts
└── context/ profile-context.tsx
```

---

## 6. PADRÃO DE API ROUTES — REGRA CRÍTICA

**TODAS as operações usam `createAdminClient()` (service_role_key)** — bypassa RLS.

```typescript
export async function GET/POST/DELETE(request: Request) {
  const supabase = await createClient()          // auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()              // opera no DB
  // retorna { success, data } ou { error }
}
```

**Páginas client-side:** sempre usam `fetch('/api/...')`. **Nunca** `supabase.from()` direto nas páginas.

---

## 7. SIDEBAR — VISIBILIDADE POR ROLE

```
Item                  | Rota                        | closer | gestor | onboarding
Home                  | /                           |  ✅    |  ✅    |  ✅
Copilot Vendas        | /copilot-vendas             |  ✅    |  ✅    |
Copilot Onboarding    | /copilot-onboarding         |        |  ✅    |  ✅
Verdadeiro Valor      | /verdadeiro-valor           |  ✅    |  ✅    |  ✅
Agenda                | /agenda                     |  ✅    |  ✅    |  ✅
No Radar              | /leads                      |  ✅    |  ✅    |
Copys                 | /copys                      |  ✅    |  ✅    |
Templates             | /templates                  |  ✅    |  ✅    |
Produtos              | /produtos                   |  ✅    |  ✅    |  ✅
FAQ                   | /faq                        |  ✅    |  ✅    |  ✅
Matriz de Objeções    | /objecoes                   |  ✅    |  ✅    |
Knowledge Base        | /kb                         |  ✅    |  ✅    |  ✅
Usuários              | /usuarios                   |        |  ✅    |
Acompanhamento        | /onboarding-acompanhamento  |        |  ✅    |
Config Onboarding     | /onboarding-config          |        |  ✅    |
Configurações         | /settings                   |  ✅    |  ✅    |  ✅
```

Sidebar: gradiente `#1E1B4B → #2D2A7A`, 240px, texto `#C7D2FE`, active `bg-[#4338CA]`.

---

## 8. BANCO DE DADOS

### 8.1 Tabelas

```sql
profiles          (id, name, role[closer|gestor|onboarding], vertical_focus, phone,
                   whatsapp_link, default_greeting, style_notes)

knowledge_base    (id, title, content, category, vertical, tags, source_type, is_active, embedding)
                  categories: produto|playbook|tecnica-comercial|objeção-resposta|regra-comercial|
                              diferencial|faq|template-followup|case-sucesso|script-copy

objection_patterns(id, topic, definition, real_meaning, vertical, recommended_response,
                   what_not_to_say, proof_points, win_rate, embedding)

faq_items         (id, faq_type[interno|cliente], question, answer, vertical, category,
                   status[rascunho|validado], is_active, embedding)
                  categories fixas: Produto|Provas & Datas|Pagamento|Acesso & Plataforma|
                                    Processo Comercial|Pós-venda|Regras Internas|Outros

user_copys        (id, user_id, category, vertical, title, message_text, when_to_use,
                   is_shared, is_active, embedding)

quote_examples    (id, vertical, product, context, quote_text, result[win|loss|pending], embedding)

conversations     (id, user_id, copilot_type, mode, messages, context_used)

onboarding_config (id, trail, custom_instructions, welcome_message, tone,
                   max_complexity, focus_verticals)
                  -- singleton; trail é array de strings com os temas da trilha

product_details     (id, kb_id[→knowledge_base.id], icp, pitch, commercial_copy, price,
                     access_duration, payment_conditions, when_to_use, when_not_to_use,
                     objections, strategy_notes, updated_at)
                     -- kb_id UNIQUE; complementa knowledge_base sem tocar content

onboarding_progress (id, user_id, topic_index, topic_title, status[in_progress|completed],
                     started_at, completed_at)

onboarding_quiz_results (id, user_id, topic_index, topic_title, question, user_answer,
                          is_correct, copilot_feedback, created_at)

meus_leads        (id, user_id, name, vertical, product_interest, objection_main, notes, phone, email)

whatsapp_templates(id, name, momento, copy_text, variables, vertical, is_active, embedding)

user_favorite_templates (id, user_id, template_id)

user_objection_responses(id, user_id, objection_id, response_text)

verdadeiro_valor  (id, content, updated_at)  -- singleton

big_numbers       (id, label, value, description, category, vertical, is_highlight, sort_order)
                  -- NÃO tem is_active; DELETE é hard delete

exam_dates        (id, vertical, name, exam_date, registration_start, registration_end,
                   is_active, monday_item_id)

company_events    (id, type[lançamento|campanha|evento|deadline|outro], title, description,
                   event_date, end_date, verticals, is_active, monday_item_id)

-- Produtos: salvos em knowledge_base com category='produto', tags[0]=status
```

### 8.2 Funções RPC (pgvector)

Todas as funções aceitam `filter_vertical text DEFAULT NULL`. A cláusula de filtro aplicada:
```sql
AND (filter_vertical IS NULL OR p.vertical = filter_vertical OR p.vertical IS NULL OR p.vertical = 'Geral')
```

```
match_knowledge_base(query_embedding, match_count, match_threshold, filter_vertical)
match_faq(query_embedding, match_count, match_threshold, filter_vertical)
match_objections(query_embedding, match_count, match_threshold, filter_vertical)
match_copys(query_embedding, match_count, match_threshold, filter_user_id, filter_vertical)
match_quotes(query_embedding, match_count, match_threshold, filter_vertical)
search_knowledge_base_text(search_query)  -- fallback ILIKE, sem filtro de vertical
```

---

## 9. MÓDULOS PRINCIPAIS

### 9.1 Copilot Vendas (`/copilot-vendas`) — closer + gestor
8 modos: `diagnose` `objeção` `proposta` `produto` `follow-up` `regra` `copys` `livre`

**Mode `produto`:**
- `matchProductsByKeyword` roda em PARALELO e popula `productParts[]` separado
- Produto aparece PRIMEIRO no contexto RAG (antes do vetor KB e FAQ)
- Duas seções na resposta: 📋 SOBRE O PRODUTO + 🎯 VERSÃO COMERCIAL. Nunca mistura produtos.
- System prompt: seção `## Produto` é fonte primária; FAQ e KB são complementares

**Outros modos:**
- Mode `proposta`: gera JSON → renderizado pelo QuoteCard → Win/Loss salva em quote_examples
- Detecção de intenção (6 padrões) definida no system prompt
- Query params: `?lead=&vertical=&produto=&objecao=` (acionado pelo botão "Diagnóstico no Copilot" do No Radar)
- Perfil do closer (nome, style_notes, default_greeting, vertical_focus) injetado no system prompt via `buildContext()` → `fetchUserProfile()`

### 9.2 Copilot Onboarding (`/copilot-onboarding`) — onboarding + gestor
Sem mode selector. Guia pela trilha do gestor. Barra de progresso + botão "Próximo tema".
Config carregada via `GET /api/onboarding-config` (não mais direto no Supabase).
Rastreia progresso em `onboarding_progress` via `POST /api/onboarding-progress`.
Quiz ao fim de cada tema salva em `onboarding_quiz_results` via `POST /api/onboarding-quiz`.
Chama `buildContext(message, 'onboarding', user_id)` — tem acesso a FAQ, KB, provas e eventos via RAG.
API `/api/copilot-onboarding` requer autenticação.

### 9.3 Verdadeiro Valor (`/verdadeiro-valor`) — todos
Seção 1: texto Markdown (tabela `verdadeiro_valor`, singleton) — gestor edita inline.
Seção 2: Big Numbers em grid — gestor CRUD via modal. Tabela `big_numbers` não tem `is_active`.

### 9.4 No Radar (`/leads`) — closer + gestor
Bloco de notas pessoal por `user_id`. Botão "Diagnóstico no Copilot" abre Copilot Vendas com parâmetros.

### 9.5 Copys & Macros (`/copys`) — closer + gestor
3 tabs: Minhas | Time | Buscar. GET retorna `{ mine, team }`. Variáveis: `{{nome}}` `{{vertical}}` etc. Preview bolha WhatsApp.

### 9.6 Templates WhatsApp (`/templates`) — closer + gestor
Momentos: reengajamento, follow-up, negociação, encerramento, etc. Favoritos em `user_favorite_templates`. GET retorna `{ templates, favorites }`.

### 9.7 FAQ (`/faq`) — todos
2 tabs: Comercial | Clientes. Status rascunho/validado. RAG usa só validados.
Campo `category` com 8 opções fixas via `<select>`: Produto | Provas & Datas | Pagamento | Acesso & Plataforma | Processo Comercial | Pós-venda | Regras Internas | Outros.
No contexto do RAG, cada FAQ exibe score: `[relevância: 87%]`. LLM é instruído a priorizar FAQs com relevância >80%.

### 9.8 Matriz de Objeções (`/objecoes`) — closer + gestor
Accordion por objeção. Elemento principal: `definition` (frase exata). "Minha resposta" por closer em `user_objection_responses`. GET retorna `{ patterns, responses }`.

### 9.9 Knowledge Base (`/kb`) — todos (gestor edita)
3 formas: escrever | importar .md/.txt | transcrever áudio (Whisper).
Fluxo 3 steps: form → process-document (LLM sugere categoria/tags) → review → salvar.
**`process-document`:** LLM copia o conteúdo EXATAMENTE como recebido — sem resumir, sem cortar, sem reorganizar. Apenas estrutura em JSON com `formatted_content` (verbatim) e `chunks` (divisão em 500-1500 palavras sem omitir nada).
Categoria `tecnica-comercial` alimenta o Insight do Dia na Home e é indexada no RAG.

### 9.10 Agenda (`/agenda`) — todos (gestor edita)
Seção 1: Provas & Datas com countdown colorido. Campo `monday_item_id` (URL Monday clicável).
Seção 2: Calendário de eventos agrupado por mês. Multi-select verticais.

### 9.11 Catálogo de Produtos (`/produtos`) — todos (gestor edita dados comerciais)
Exibe todos os produtos da Knowledge Base (`category='produto'`). **Não há criação de produto aqui** — toda inserção é feita via `/kb`.

**Arquitetura de duas camadas:**
- **KB** (`knowledge_base.content`) → fonte de verdade do conteúdo: o que é o produto, metodologia, o que inclui, diferenciais. Gerado/editado apenas pela Knowledge Base. O embedding representa esse conteúdo.
- **`product_details`** → camada comercial complementar: ICP, pitch, preço, tempo de acesso, condições de pagamento, quando indicar, quando NÃO indicar, objeções + respostas, copy comercial, notas de estratégia. Linked ao `knowledge_base` via `kb_id`.

O botão "Editar" (gestor) abre formulário com **apenas os campos de `product_details`** — nunca toca o `content` do KB.
O RAG (`matchProductsByKeyword`) busca o `content` do KB e faz JOIN com `product_details`, montando contexto completo: conteúdo educacional + bloco "— Dados Comerciais —".

### 9.12 Configurações (`/settings`) — todos
Dados pessoais + `vertical_focus` (multi-select chips, salvo como string "R1,Anest"). Style Wizard 5 passos (Tom, Emoji, Tratamento, Encerramento, Exemplo) → `style_notes`. Salva via `PATCH /api/profile`.

### 9.13 Home (`/`) — todos
Ordem das seções:
1. **Saudação** — nome + data
2. **Insight do Dia** — doc da categoria `tecnica-comercial` da KB, rotação diária por `dayOfYear % total`. Oculto se base vazia. Toggle "ver mais/menos" com preview de 300 chars.
3. **Alertas Comerciais** — avisos de provas próximas gerados de `exam_dates` (≤30d vermelho, 31-90d âmbar, inscrições fechando ≤10d amarelo). Máx 4. Visível para closer + gestor.
4. **Próximas Provas** — 5 próximas provas com countdown colorido (≤30d vermelho, 31-60d amarelo, >60d verde), badge de vertical. Visível para todos.
5. **Esta Semana** — `company_events` nos próximos 7 dias. Mostra "Nenhum evento" se vazio.
6. **Próximos 30 dias** — `company_events` entre 8 e 30 dias. Seção oculta se vazio.
7. **Acesso rápido** — grid 4 cards com links por role.

### 9.14 Gestão de Usuários (`/usuarios`) — gestor
Lista todos os usuários do sistema (profiles). Gestor pode alterar role via `PATCH /api/usuarios`.
**Proteção contra auto-rebaixamento:** gestor não pode alterar o próprio role.
Roles disponíveis: `closer` | `gestor` | `onboarding`.

### 9.15 Config Onboarding (`/onboarding-config`) — gestor
Configura a trilha do Copilot Onboarding: temas da trilha (array), instruções personalizadas, mensagem de boas-vindas, tom, complexidade máxima, verticais de foco.
Salvo via `POST /api/onboarding-config` (upsert — cria se não existe, atualiza se tem `id`).
Seção "Ativar Onboarding por Colaborador": lista usuários com role `closer` e permite ativar onboarding (→ role `onboarding`) ou reverter (→ role `closer`). Usa `GET /api/usuarios` + `PATCH /api/usuarios`.

### 9.16 Acompanhamento Onboarding (`/onboarding-acompanhamento`) — gestor
Painel do gestor para monitorar todos os colaboradores em onboarding.
Dados agregados por usuário: progresso por tema, % de conclusão, status (`not_started | in_progress | paused | completed`), última atividade.
`status = 'paused'` quando `last_activity > 7 dias atrás` e onboarding não concluído.
Taxa de erros por tema (top 3 tópicos com mais erros no quiz).
Drill-down por colaborador via `GET /api/onboarding-acompanhamento/[userId]`.

---

## 10. API ROUTES

| Route | Método | O que faz |
|-------|--------|-----------|
| `/api/copilot-vendas` | POST | Streaming chat vendas (RAG + LLM) |
| `/api/copilot-onboarding` | POST | Streaming chat onboarding (requer auth) |
| `/api/profile` | PATCH | Atualizar perfil do usuário autenticado |
| `/api/embeddings` | POST | Gera e salva embedding na tabela (allowlist: knowledge_base, faq_items, user_copys, quote_examples, objection_patterns, whatsapp_templates) |
| `/api/transcribe` | POST | Transcreve áudio via Whisper |
| `/api/process-document` | POST | LLM analisa conteúdo → sugere categoria/tags/chunks (conteúdo verbatim, sem corte) |
| `/api/dica-do-dia` | GET | Retorna 1 doc de `tecnica-comercial` por rotação diária |
| `/api/copys` | GET/POST/DELETE | user_copys — GET retorna `{ mine, team }` |
| `/api/faq` | GET/POST/DELETE | faq_items |
| `/api/objecoes` | GET/POST/DELETE | objection_patterns — GET retorna `{ patterns, responses }` |
| `/api/kb` | GET/POST/DELETE | knowledge_base |
| `/api/templates` | GET/POST/DELETE | whatsapp_templates — GET retorna `{ templates, favorites }` |
| `/api/leads` | GET/POST/DELETE | meus_leads |
| `/api/big-numbers` | GET/POST/DELETE | big_numbers |
| `/api/verdadeiro-valor` | GET/POST | singleton verdadeiro_valor |
| `/api/favorites` | POST/DELETE | user_favorite_templates |
| `/api/user-objection-responses` | POST/DELETE | respostas pessoais de objeções |
| `/api/exam-dates` | GET/POST/DELETE | exam_dates |
| `/api/events` | GET/POST/DELETE | company_events |
| `/api/produtos` | GET/POST/DELETE | GET: knowledge_base WHERE category='produto' + JOIN product_details; POST: upsert product_details por kb_id (nunca toca knowledge_base.content); DELETE: is_active=false em knowledge_base |
| `/api/onboarding-config` | GET/POST | GET: qualquer auth; POST: só gestor — upsert onboarding_config |
| `/api/onboarding-progress` | GET/POST | Progresso por tema do usuário autenticado |
| `/api/onboarding-quiz` | GET/POST | Resultados de quiz — GET aceita `?user_id=` (gestor pode ver outros) |
| `/api/onboarding-acompanhamento` | GET | Gestor: dados agregados de todos os colaboradores em onboarding |
| `/api/onboarding-acompanhamento/[userId]` | GET | Gestor: dados detalhados de um colaborador específico |
| `/api/usuarios` | GET/PATCH | GET: lista profiles (gestor); PATCH: altera role com proteção contra auto-rebaixamento |

---

## 11. SYSTEM PROMPTS

**Vendas** (`lib/ai/vendas-prompt.ts`): `buildVendasSystemPrompt(mode, context, profile?)`
Seções: IDENTIDADE (fala COM o closer) → REGRAS → DIFERENCIAIS → PROVAS/EVENTOS → VERDADEIRO VALOR/BIG NUMBERS → CONTEXTO QUE VOCÊ RECEBE E COMO USAR (8 blocos abaixo) → PERSONALIZAÇÃO DO CLOSER (nome/tom/vertical via profile) → COMO RESPONDER (6 intenções) → REGRAS DE SEPARAÇÃO/LACUNA → PRIORIDADE DE FONTE NO MODO PRODUTO → MODO + FORMATO + CONTEXTO RAG.

**8 blocos do "CONTEXTO QUE VOCÊ RECEBE E COMO USAR":**
1. VERDADEIRO VALOR + BIG NUMBERS — argumentação e objeções de confiança
2. DATAS DE PROVAS — urgência, janelas de decisão
3. EVENTOS PRÓXIMOS — lançamentos, campanhas, ganchos de reengajamento
4. BASE DE CONHECIMENTO (RAG) — produtos, playbooks, regras, diferenciais
5. FAQ — respostas validadas; se relevância >80%, priorizar sobre resposta genérica
6. OBJEÇÕES — resposta recomendada + resposta pessoal do closer (se existir)
7. COPYS DO TIME — referência de tom para follow-up, proposta e copys
8. PERFIL DO CLOSER — adaptar tom, tratar pelo nome

**PRIORIDADE DE FONTE NO MODO PRODUTO (regra no prompt):**
Quando o contexto contiver `## Produto`, esse bloco é fonte primária e definitiva.
FAQ e KB são complementares — não contradizem nem substituem o que está em `## Produto`.

**Onboarding** (`lib/ai/onboarding-prompt.ts`): `buildOnboardingSystemPrompt(config, context, topicIndex, profile?)`
Injeta: trilha de temas, tema atual, próximo tema, instruções do gestor, bloco "SOBRE O CONTEXTO RECEBIDO" (instrução FAQ >80%), contexto RAG.

---

## 12. EMBEDDING AUTOMÁTICO

```typescript
// Após salvar em KB, FAQ, Objeções, Copys, Templates, Produtos:
fetch('/api/embeddings', {
  method: 'POST',
  body: JSON.stringify({ table: 'knowledge_base', id: doc.id, content: savedContent }),
}).catch(() => {})  // fire-and-forget

// Tabelas na allowlist: knowledge_base, faq_items, user_copys,
//                       objection_patterns, quote_examples, whatsapp_templates
```

**Produtos:** o `POST /api/produtos` retorna `{ id, content }` onde `content` é o Markdown completo gerado por `buildContent()`. A página de produtos usa `json.data.content` — o embedding representa todos os 13 campos do produto (ICP, pitch, objeções, condições comerciais, quando usar, etc.).

---

## 13. DESIGN TOKENS

```css
/* globals.css */
--background: #F9FAFB;  --foreground: #111827;
--primary: #6366F1;     --primary-hover: #4F46E5;   --primary-light: #EEF2FF;
--bg-sidebar: #1E1B4B;  --bg-sidebar-active: #4338CA;
--text-secondary: #6B7280;  --text-muted: #9CA3AF;  --text-sidebar: #C7D2FE;
--border: #E5E7EB;
--success: #10B981;  --warning: #F59E0B;  --danger: #EF4444;
--r1: #3B82F6;  --anest: #8B5CF6;  --oft: #06B6D4;  --ortop: #F97316;
```

Cards: `bg-white border border-[#E5E7EB] rounded-xl shadow-sm`
Botões: `bg-[#6366F1] hover:bg-[#4F46E5] rounded-lg transition-all duration-150`
Chat user: `bg-[#EEF2FF] rounded-2xl` (direita) | Chat copilot: `bg-white border rounded-2xl` (esquerda)

---

## 14. DEPLOY — VERCEL

1. Conectar repo → main prod
2. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `OPENAI_API_KEY`
3. Framework: Next.js | Build: `next build`

---

## 15. FASES

| Fase | Descrição | Status |
|------|-----------|--------|
| 1–7 | Setup, Auth, RAG, Copilots, KB, Copys, FAQ, Leads, Settings, VV | ✅ |
| 8.6 | Migração total para API routes com admin client (fix RLS) | ✅ |
| 8.7 | Agenda (Provas + Eventos) + Catálogo Produtos + Home dashboard | ✅ |
| 8.8 | Multi-select vertical + modo produto 2 versões + home comercial | ✅ |
| 8.9 | Identidade do Copilot (fala COM closer) + detecção de intenção + lacuna | ✅ |
| 8.10 | Polish responsivo: overflow-x, prose/markdown, viewport, header | ✅ |
| 8.11 | RAG: user_objection_responses no contexto de objeções; prompt com bloco "CONTEXTO QUE VOCÊ RECEBE"; home reordenada | ✅ |
| 8.12 | Correções RAG: embedding produto (content completo), whatsapp_templates na allowlist, filtro vertical nas 5 RPCs, detectVertical(), truncate separado (8k RAG + 4k fixo), ordem RAG-primeiro, catches com console.error, FAQ categories select, FAQ score no contexto, FAQ priorizado >80%, categoria tecnica-comercial na KB, Insight do Dia na Home, Próximas Provas na Home | ✅ |
| 8.13 | Onboarding fases B+C (tracking de progresso + quiz + painel do gestor), gestão de usuários com proteção auto-rebaixamento, onboarding-config via API route (fix RLS), ativação de colaboradores por role, auth no copilot-onboarding, process-document verbatim, produto como fonte primária no RAG (matchProductsByKeyword paralelo + productParts[]), remoção do botão "Novo produto" | ✅ |
| 8.14 | Arquitetura KB+Comercial: tabela product_details separada; /produtos exibe KB e edita apenas dados comerciais; matchProductsByKeyword usa AND (não OR) e faz JOIN com product_details para enriquecer contexto RAG; API /api/produtos reescrita para nunca tocar knowledge_base.content | ✅ |
| 9 | Seed — importar docs reais (produtos, técnicas comerciais, playbooks) + embeddings | ⏳ |
| 10 | Polish final + Deploy Vercel | ⏳ |

---

> Atualize este arquivo sempre que implementar algo novo.
