# CLAUDE.md — Second Brain Med-Review

> **Fonte de verdade do projeto. Leia antes de qualquer tarefa.**
> **Versão:** 6.0 | Data: 15/05/2026

---

## 1. VISÃO GERAL

**Second Brain Med-Review** — sistema web interno do Grupo Med-Review para o time comercial.

| Copilot | Quem usa | Para quê |
|---------|----------|----------|
| **Copilot Vendas** | closers + gestores | Objeções, propostas, diagnóstico, follow-up, copys |
| **Copilot Onboarding** | novos colaboradores + gestores | Aprender produtos, processos, regras do time |

Outros módulos: Verdadeiro Valor, No Radar (leads), Copys & Macros, Templates WhatsApp, FAQ, Matriz de Objeções, Knowledge Base, Agenda, Catálogo de Produtos.

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
Usuário → [SEMPRE] Busca VV + Big Numbers + Provas + Eventos (Promise.all)
        → Embedding da mensagem (OpenAI text-embedding-3-small)
        → Buscas vetoriais paralelas:
            match_knowledge_base  (5 docs, 0.50)  — sempre
            match_faq             (3 docs, 0.50)  — sempre
            match_objections      (4 docs, 0.45)  — só mode "objeção"
              + user_objection_responses do closer (se userId disponível)
            match_copys           (4 docs, 0.45)  — follow-up, proposta, copys
            match_quotes          (3 docs, 0.40)  — só mode "proposta"
        → Se sources < 2 → fallback textual (search_knowledge_base_text ILIKE)
        → Contexto concatenado (max 12.000 chars)
        → System prompt → LLM streaming → SSE → cliente
```

**LLM (`lib/ai/llm-client.ts`):** tenta OpenAI `gpt-4o-mini` (timeout 15s), fallback Groq `llama-3.3-70b-versatile`. `callLLMStream` para chat, `callLLMJson` para process-document.

**Contexto fixo em toda consulta (`lib/ai/context-builder.ts`):** VerdadeiroValor + BigNumbers + ExamDates (próximas, ≥-7 dias) + CompanyEvents (próximos 30 dias) — resolvidos em Promise.all antes do RAG vetorial.

---

## 5. ESTRUTURA DE PASTAS

```
app/
├── layout.tsx / page.tsx / globals.css
├── login/ copilot-vendas/ copilot-onboarding/ onboarding-config/
├── copys/ leads/ templates/ faq/ objecoes/ kb/
├── verdadeiro-valor/ agenda/ produtos/ settings/
└── api/
    ├── copilot-vendas/ copilot-onboarding/ profile/ embeddings/ transcribe/
    ├── process-document/ copys/ faq/ objecoes/ kb/ templates/ leads/
    ├── big-numbers/ verdadeiro-valor/ favorites/ user-objection-responses/
    ├── exam-dates/ events/ produtos/

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
Item                  | Rota                | closer | gestor | onboarding
Home                  | /                   |  ✅    |  ✅    |  ✅
Copilot Vendas        | /copilot-vendas     |  ✅    |  ✅    |
Copilot Onboarding    | /copilot-onboarding |        |  ✅    |  ✅
Verdadeiro Valor      | /verdadeiro-valor   |  ✅    |  ✅    |  ✅
Agenda                | /agenda             |  ✅    |  ✅    |  ✅
No Radar              | /leads              |  ✅    |  ✅    |
Copys                 | /copys              |  ✅    |  ✅    |
Templates             | /templates          |  ✅    |  ✅    |
Produtos              | /produtos           |  ✅    |  ✅    |  ✅
FAQ                   | /faq                |  ✅    |  ✅    |  ✅
Matriz de Objeções    | /objecoes           |  ✅    |  ✅    |
Knowledge Base        | /kb                 |  ✅    |  ✅    |  ✅
Config Onboarding     | /onboarding-config  |        |  ✅    |
Configurações         | /settings           |  ✅    |  ✅    |  ✅
```

Sidebar: gradiente `#1E1B4B → #2D2A7A`, 240px, texto `#C7D2FE`, active `bg-[#4338CA]`.

---

## 8. BANCO DE DADOS

### 8.1 Tabelas

```sql
profiles          (id, name, role, vertical_focus, phone, whatsapp_link, default_greeting, style_notes)
knowledge_base    (id, title, content, category, vertical, tags, source_type, is_active, embedding)
                  categories: produto|playbook|objeção-resposta|regra-comercial|diferencial|faq|template-followup|case-sucesso|script-copy
objection_patterns(id, topic, definition, real_meaning, vertical, recommended_response, what_not_to_say, proof_points, win_rate, embedding)
faq_items         (id, faq_type[interno|cliente], question, answer, vertical, status[rascunho|validado], is_active, embedding)
user_copys        (id, user_id, category, vertical, title, message_text, when_to_use, is_shared, is_active, embedding)
quote_examples    (id, vertical, product, context, quote_text, result[win|loss|pending], embedding)
conversations     (id, user_id, copilot_type, mode, messages, context_used)
onboarding_config (id, trail, custom_instructions, welcome_message, tone, max_complexity, focus_verticals)
meus_leads        (id, user_id, name, vertical, product_interest, objection_main, notes, phone, email)
whatsapp_templates(id, name, momento, copy_text, variables, vertical, is_active, embedding)
user_favorite_templates (id, user_id, template_id)
user_objection_responses(id, user_id, objection_id, response_text)
verdadeiro_valor  (id, content, updated_at)  -- singleton
big_numbers       (id, label, value, description, category, vertical, is_highlight, sort_order)
                  -- NÃO tem is_active; DELETE é hard delete
exam_dates        (id, vertical, name, exam_date, registration_start, registration_end, is_active, monday_item_id)
company_events    (id, type[lançamento|campanha|evento|deadline|outro], title, description, event_date, end_date, verticals, is_active, monday_item_id)
-- Produtos: salvos em knowledge_base com category='produto', tags[0]=status
```

### 8.2 Funções RPC (pgvector)

```
match_knowledge_base(query_embedding, match_count, match_threshold)
match_faq(query_embedding, match_count, match_threshold)
match_objections(query_embedding, match_count, match_threshold)
match_copys(query_embedding, match_count, match_threshold, filter_user_id)
match_quotes(query_embedding, match_count, match_threshold)
search_knowledge_base_text(search_query)  -- fallback ILIKE
```

---

## 9. MÓDULOS PRINCIPAIS

### 9.1 Copilot Vendas (`/copilot-vendas`) — closer + gestor
8 modos: `diagnose` `objeção` `proposta` `produto` `follow-up` `regra` `copys` `livre`
- Mode `produto`: duas seções — 📋 SOBRE O PRODUTO + 🎯 VERSÃO COMERCIAL. Nunca mistura produtos.
- Mode `proposta`: gera JSON → renderizado pelo QuoteCard → Win/Loss salva em quote_examples
- Detecção de intenção (4 padrões) definida no system prompt
- Query params: `?lead=&vertical=&produto=&objecao=` (acionado pelo botão "Diagnóstico no Copilot" do No Radar)

### 9.2 Copilot Onboarding (`/copilot-onboarding`) — onboarding + gestor
Sem mode selector. Guia pela trilha do gestor. Barra de progresso + botão "Próximo tema". Config em `onboarding_config` (singleton).

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

### 9.8 Matriz de Objeções (`/objecoes`) — closer + gestor
Accordion por objeção. Elemento principal: `definition` (frase exata). "Minha resposta" por closer em `user_objection_responses`. GET retorna `{ patterns, responses }`.

### 9.9 Knowledge Base (`/kb`) — todos (gestor edita)
3 formas: escrever | importar .md/.txt | transcrever áudio (Whisper). Fluxo 3 steps: form → process-document (LLM sugere categoria/tags) → review → salvar.

### 9.10 Agenda (`/agenda`) — todos (gestor edita)
Seção 1: Provas & Datas com countdown colorido. Campo `monday_item_id` (URL Monday clicável).
Seção 2: Calendário de eventos agrupado por mês. Multi-select verticais.

### 9.11 Catálogo de Produtos (`/produtos`) — todos (gestor edita)
Form estruturado (13 campos) → Markdown → salvo em `knowledge_base` com `category='produto'`, `tags[0]=status`. Índexado no RAG automaticamente.

### 9.12 Configurações (`/settings`) — todos
Dados pessoais + `vertical_focus` (multi-select chips, salvo como string "R1,Anest"). Style Wizard 5 passos → `style_notes`. Salva via `PATCH /api/profile`.

### 9.13 Home (`/`) — todos
Ordem das seções:
1. **Saudação** — nome + data
2. **Alertas Comerciais** — avisos de provas próximas gerados de `exam_dates` (≤30d vermelho, 31-90d âmbar, inscrições fechando ≤10d amarelo). Máx 4. Visível para closer + gestor.
3. **Esta Semana** — `company_events` nos próximos 7 dias. Mostra "Nenhum evento" se vazio.
4. **Próximos 30 dias** — `company_events` entre 8 e 30 dias. Seção oculta se vazio.
5. **Acesso rápido** — grid 4 cards com links por role.

---

## 10. API ROUTES

| Route | Método | O que faz |
|-------|--------|-----------|
| `/api/copilot-vendas` | POST | Streaming chat vendas (RAG + LLM) |
| `/api/copilot-onboarding` | POST | Streaming chat onboarding |
| `/api/profile` | PATCH | Atualizar perfil |
| `/api/embeddings` | POST | Gera e salva embedding na tabela |
| `/api/transcribe` | POST | Transcreve áudio via Whisper |
| `/api/process-document` | POST | LLM analisa conteúdo → sugere categoria/tags/chunks |
| `/api/copys` | GET/POST/DELETE | user_copys — GET retorna `{ mine, team }` |
| `/api/faq` | GET/POST/DELETE | faq_items |
| `/api/objecoes` | GET/POST/DELETE | objection_patterns — GET retorna `{ patterns, responses }` |
| `/api/kb` | GET/POST/DELETE | knowledge_base |
| `/api/templates` | GET/POST/DELETE | whatsapp_templates — GET retorna `{ templates, favorites }` |
| `/api/leads` | GET/POST/DELETE | meus_leads |
| `/api/big-numbers` | GET/POST/DELETE | big_numbers |
| `/api/verdadeiro-valor` | GET/POST | singleton + big_numbers |
| `/api/favorites` | POST/DELETE | user_favorite_templates |
| `/api/user-objection-responses` | POST/DELETE | respostas pessoais de objeções |
| `/api/exam-dates` | GET/POST/DELETE | exam_dates |
| `/api/events` | GET/POST/DELETE | company_events |
| `/api/produtos` | GET/POST/DELETE | knowledge_base WHERE category='produto' |

---

## 11. SYSTEM PROMPTS

**Vendas** (`lib/ai/vendas-prompt.ts`): `buildVendasSystemPrompt(mode, context, profile?)`
Seções: IDENTIDADE (fala COM o closer) → REGRAS → DIFERENCIAIS → PROVAS/EVENTOS → VERDADEIRO VALOR/BIG NUMBERS → CONTEXTO QUE VOCÊ RECEBE E COMO USAR (8 blocos) → PERSONALIZAÇÃO DO CLOSER (nome/tom/vertical via profile) → COMO RESPONDER (4 intenções) → REGRAS DE SEPARAÇÃO/LACUNA → MODO + FORMATO + CONTEXTO RAG.

**Onboarding** (`lib/ai/onboarding-prompt.ts`): `buildOnboardingSystemPrompt(config, context, topicIndex)`
Injeta: trilha de temas, tema atual, próximo tema, instruções do gestor, contexto RAG.

---

## 12. EMBEDDING AUTOMÁTICO

```typescript
// Após salvar em KB, FAQ, Objeções, Copys, Templates:
fetch('/api/embeddings', {
  method: 'POST',
  body: JSON.stringify({ table: 'knowledge_base', id: doc.id, content: doc.content }),
}).catch(() => {})  // fire-and-forget
// Tabelas: knowledge_base, faq_items, user_copys, objection_patterns, quote_examples, whatsapp_templates
```

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
| 8.11 | RAG: user_objection_responses no contexto de objeções; prompt com bloco "CONTEXTO QUE VOCÊ RECEBE"; home reordenada (Alertas → Esta Semana → Próximos 30 dias) | ✅ |
| 9 | Seed — importar docs reais + embeddings em massa | ⏳ |
| 10 | Polish final + Deploy Vercel | ⏳ |

---

> Atualize este arquivo sempre que implementar algo novo.
