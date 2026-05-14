# CLAUDE.md — Second Brain Med-Review

> **Fonte de verdade do projeto. Leia antes de qualquer tarefa.**
> **Versão:** 5.3 | Data: 14/05/2026

---

## 1. VISÃO GERAL

**Second Brain Med-Review** — sistema web interno do Grupo Med-Review para o time comercial.

Dois copilots de IA alimentados por RAG (busca vetorial sobre a base de conhecimento interna):

| Copilot | Quem usa | Para quê |
|---------|----------|----------|
| **Copilot Vendas** | closers + gestores | Objeções, propostas, diagnóstico, follow-up, copys |
| **Copilot Onboarding** | novos colaboradores + gestores | Aprender produtos, processos, regras do time |

Além dos copilots, o sistema oferece: Verdadeiro Valor, No Radar (leads), Copys & Macros, Templates WhatsApp, FAQ, Matriz de Objeções e Knowledge Base.

---

## 2. STACK

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router, TypeScript) | 16.2.4 |
| Runtime UI | React | 19.2.4 |
| Estilos | Tailwind CSS | 4 |
| Componentes | shadcn/ui (escrito manualmente) + Lucide React | lucide 1.14.0 |
| Font | Inter (@fontsource/inter) | 5.2.8 |
| Auth | Supabase Auth via `@supabase/ssr` | ssr 0.10.2 |
| Database | Supabase (PostgreSQL + pgvector) | supabase-js 2.105.3 |
| AI Chat | OpenAI `gpt-4o-mini` (primário) + Groq `llama-3.3-70b-versatile` (fallback) | fetch direto |
| AI Embeddings | OpenAI — `text-embedding-3-small` (1536 dims) | fetch direto |
| AI Transcrição | OpenAI Whisper — `whisper-1` | fetch direto |
| Groq SDK | `groq-sdk` — instalado no package.json, mas **não usado** (llm-client usa fetch direto) | 1.1.2 |
| Markdown | react-markdown + remark-gfm | md 10.1.0 / gfm 4.0.1 |
| Datas | date-fns | 4.1.0 |
| Deploy | Vercel | — |

> **Não há shadcn CLI configurado** — componentes UI foram escritos manualmente seguindo o padrão shadcn.
> **`middleware.ts`** — protege todas as rotas: não autenticado → redirect `/login`; autenticado em `/login` → redirect `/`.

---

## 3. VARIÁVEIS DE AMBIENTE

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # nunca expor ao cliente

GROQ_API_KEY=gsk_...
OPENAI_API_KEY=sk-...
```

---

## 4. ARQUITETURA RAG

```
Usuário envia mensagem + mode
        ↓
[SEMPRE] Busca Verdadeiro Valor + Big Numbers (admin client, sem RAG)
        ↓
Embedding da mensagem (OpenAI text-embedding-3-small)
        ↓                          ↓ (se OPENAI_API_KEY ausente ou erro)
Buscas vetoriais paralelas      Fallback: search_knowledge_base_text (ILIKE)
  ├─ match_knowledge_base     (5 docs, threshold 0.50)  — sempre
  ├─ match_faq                (3 docs, threshold 0.50)  — sempre
  ├─ match_objections         (4 docs, threshold 0.45)  — só mode "objeção"
  ├─ match_copys              (4 docs, threshold 0.45)  — modes: follow-up, proposta, copys
  └─ match_quotes             (3 docs, threshold 0.40)  — só mode "proposta"
        ↓
Se sources < 2 → fallback textual adicional
        ↓
Contexto concatenado (max 12.000 chars via truncate())
        ↓
System prompt (identidade + regras + diferenciais + contexto RAG)
        ↓
Groq API — llama-3.3-70b-versatile (temp 0.3, max_tokens 4096, stream=true)
        ↓
SSE streaming → renderiza token a token no cliente
        ↓
Context Inspector mostra sources (título + similarity)
```

### Chamada LLM (`lib/ai/llm-client.ts`)

```typescript
// callLLMStream({ systemPrompt, messages }) → ReadableStream
// Tenta OpenAI gpt-4o-mini primeiro (timeout 15s); se falhar, fallback para Groq
// callLLMJson({ systemPrompt, userMessage }) → string  (não-streaming, para process-document)
// Logs: "[LLM] OpenAI failed, falling back to Groq: <erro>"

// Primário: OpenAI gpt-4o-mini
fetch('https://api.openai.com/v1/chat/completions', { model: 'gpt-4o-mini', stream: true, temperature: 0.3, max_tokens: 4096 })

// Fallback automático: Groq llama-3.3-70b-versatile
fetch('https://api.groq.com/openai/v1/chat/completions', { model: 'llama-3.3-70b-versatile', stream: true })
```

### Chamada Embeddings (`lib/ai/embeddings.ts`)

```typescript
// generateEmbedding(text) → number[1536]
fetch('https://api.openai.com/v1/embeddings', {
  model: 'text-embedding-3-small',
  input: text,
})
```

### Chamada Whisper (`app/api/transcribe/route.ts`)

```
multipart/form-data → api.openai.com/v1/audio/transcriptions
model: whisper-1 | language: pt | response_format: text
Limite: 25 MB | Formatos: mp3, m4a, wav, webm, mpga, mp4, mpeg
```

### Contexto Fixo no LLM (`lib/ai/context-builder.ts`)

Três blocos são injetados em **toda** consulta (qualquer mode), antes do RAG vetorial:

1. **`fetchVerdadeiroValor()`** — busca `verdadeiro_valor` + `big_numbers`
2. **`fetchExamDates()`** — busca `exam_dates` ativas, filtra apenas próximas (>= -7 dias)
3. **`fetchUpcomingEvents()`** — busca `company_events` nos próximos 30 dias

Todos os três são resolvidos em `Promise.all` antes das buscas vetoriais. Se a tabela não existir, retornam string vazia (try/catch silencioso).

---

## 5. ESTRUTURA DE PASTAS (ESTADO REAL)

```
copilot-medreview/
├── app/
│   ├── layout.tsx                      # Root layout com AppShell + auth check
│   ├── page.tsx                        # Home dashboard (provas + eventos + acesso rápido)
│   ├── globals.css                     # Design tokens CSS + cursor-pointer global + Tailwind
│   ├── login/page.tsx                  # Auth: login / criar conta / reset senha
│   ├── copilot-vendas/page.tsx         # Chat — Copilot de Vendas (8 modos)
│   ├── copilot-onboarding/page.tsx     # Chat — Copilot de Onboarding (trilha)
│   ├── onboarding-config/page.tsx      # Config trilha + tom + instruções (gestor)
│   ├── copys/page.tsx                  # CRUD copys & macros (3 tabs)
│   ├── leads/page.tsx                  # No Radar — bloco de notas de leads
│   ├── templates/page.tsx              # Templates WhatsApp com favoritos
│   ├── faq/page.tsx                    # FAQ (Comercial + Clientes)
│   ├── objecoes/page.tsx               # Matriz de objeções com respostas pessoais
│   ├── kb/page.tsx                     # Knowledge Base (texto / import / transcrição)
│   ├── verdadeiro-valor/page.tsx       # Verdadeiro Valor + Big Numbers
│   ├── agenda/page.tsx                 # Provas & Datas + Calendário de Eventos (gestor edita)
│   ├── produtos/page.tsx               # Catálogo de Produtos (form estruturado → KB category=produto)
│   ├── settings/page.tsx               # Perfil + wizard de estilo do copilot
│   └── api/
│       ├── copilot-vendas/route.ts     # POST — streaming chat vendas (RAG + Groq)
│       ├── copilot-onboarding/route.ts # POST — streaming chat onboarding
│       ├── profile/route.ts            # PATCH — atualizar perfil do usuário
│       ├── embeddings/route.ts         # POST — gera embedding e salva na tabela
│       ├── transcribe/route.ts         # POST — transcreve áudio/vídeo via Whisper
│       ├── process-document/route.ts   # POST — analisa conteúdo via LLM; sugere categoria/vertical/tags/título/chunks
│       ├── copys/route.ts              # GET, POST, DELETE — user_copys
│       ├── faq/route.ts                # GET, POST, DELETE — faq_items
│       ├── objecoes/route.ts           # GET, POST, DELETE — objection_patterns + user_objection_responses
│       ├── kb/route.ts                 # GET, POST, DELETE — knowledge_base
│       ├── templates/route.ts          # GET, POST, DELETE — whatsapp_templates
│       ├── leads/route.ts              # GET, POST, DELETE — meus_leads
│       ├── big-numbers/route.ts        # GET, POST, DELETE — big_numbers
│       ├── verdadeiro-valor/route.ts   # GET, POST — verdadeiro_valor (singleton)
│       ├── favorites/route.ts          # POST, DELETE — user_favorite_templates
│       ├── user-objection-responses/route.ts  # POST, DELETE — user_objection_responses
│       ├── exam-dates/route.ts         # GET, POST, DELETE — exam_dates
│       ├── events/route.ts             # GET, POST, DELETE — company_events
│       └── produtos/route.ts           # GET, POST, DELETE — knowledge_base (category=produto)
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx               # Wrapper: Sidebar + Header + MobileNav + ProfileProvider
│   │   ├── sidebar.tsx                 # Nav desktop (role-based, gradiente indigo)
│   │   ├── header.tsx                  # Barra superior (título dinâmico + logout)
│   │   ├── mobile-nav.tsx              # Bottom nav + drawer para mobile
│   │   └── stub-page.tsx               # Placeholder para páginas em construção
│   ├── ui/
│   │   ├── toast.tsx                   # Notificação flutuante (success/error), requer onClose
│   │   ├── badge.tsx                   # VerticalBadge (R1, Anest, Oft, Ortop)
│   │   └── skeleton.tsx                # SkeletonCard / SkeletonGrid / SkeletonList / SkeletonForm
│   └── chat/
│       └── quote-card.tsx              # Detecta JSON de orçamento e renderiza em card
│
├── lib/
│   ├── ai/
│   │   ├── llm-client.ts              # callLLMStream() + callLLMJson() — GPT-4o-mini + fallback Groq
│   │   ├── embeddings.ts              # generateEmbedding() — OpenAI text-embedding-3-small
│   │   ├── context-builder.ts         # buildContext() — orquestra RAG completo
│   │   ├── vendas-prompt.ts           # buildVendasSystemPrompt(mode, context)
│   │   └── onboarding-prompt.ts       # buildOnboardingSystemPrompt() + getWelcomeMessage()
│   ├── supabase/
│   │   ├── client.ts                  # createBrowserClient (anon key) — apenas leitura leve / auth
│   │   ├── server.ts                  # createServerClient (cookies SSR) — verificar auth nas API routes
│   │   └── admin.ts                   # createAdminClient com service_role (bypass RLS)
│   ├── utils/
│   │   ├── types.ts                   # interface Profile
│   │   └── constants.ts               # VERTICAL_CONFIG, VERTICALS
│   └── context/
│       └── profile-context.tsx        # ProfileProvider + useProfile() hook
│
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 6. PADRÃO DE API ROUTES — REGRA CRÍTICA

**TODAS as operações de escrita E leitura usam `createAdminClient()` (service_role_key)**, não o cliente anon. Isso bypassa o RLS do Supabase, que estava bloqueando reads/writes via anon key.

Padrão de cada route:

```typescript
export async function GET/POST/DELETE(request: Request) {
  // 1. Verifica auth via server client (cookies)
  const supabase = await createClient()          // lib/supabase/server.ts
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Opera no DB com admin client (bypassa RLS)
  const admin = createAdminClient()              // lib/supabase/admin.ts
  const { data, error } = await admin.from('tabela')...

  // 3. Retorna { success, data } ou { error }
}
```

**Páginas client-side:** usam `fetch('/api/...')` para TODAS as operações (GET e POST/DELETE). **Nunca** `supabase.from().select/insert/update/delete()` direto nas páginas — o RLS bloqueia.

---

## 7. SIDEBAR — ITENS E VISIBILIDADE POR ROLE

```
Item                  | Rota                | Ícone            | closer | gestor | onboarding
----------------------|---------------------|------------------|--------|--------|----------
Home                  | /                   | LayoutDashboard  |  ✅    |  ✅    |  ✅
Copilot Vendas        | /copilot-vendas     | Bot              |  ✅    |  ✅    |
Copilot Onboarding    | /copilot-onboarding | GraduationCap    |        |  ✅    |  ✅
Verdadeiro Valor      | /verdadeiro-valor   | Trophy           |  ✅    |  ✅    |  ✅
Agenda                | /agenda             | CalendarDays     |  ✅    |  ✅    |  ✅
No Radar              | /leads              | NotebookPen      |  ✅    |  ✅    |
Copys                 | /copys              | Mail             |  ✅    |  ✅    |
Templates             | /templates          | MessageSquareText|  ✅    |  ✅    |
Produtos              | /produtos           | Package          |  ✅    |  ✅    |  ✅
FAQ                   | /faq                | HelpCircle       |  ✅    |  ✅    |  ✅
Matriz de Objeções    | /objecoes           | Shield           |  ✅    |  ✅    |
Knowledge Base        | /kb                 | BookOpen         |  ✅    |  ✅    |  ✅
Config Onboarding     | /onboarding-config  | Settings2        |        |  ✅    |
Configurações         | /settings           | Settings         |  ✅    |  ✅    |  ✅
```

**Sidebar visual:** gradiente `#1E1B4B → #2D2A7A`, 240px desktop, texto `#C7D2FE`, active `bg-[#4338CA]`.
**Footer:** avatar com inicial do nome + role em `#C7D2FE`.

### Mobile Nav

Bottom bar (4 ítens + botão Menu que abre drawer):

| Role | Bottom bar | Drawer |
|------|-----------|--------|
| closer | vendas, copys, leads, faq | valor, templates, objecoes, kb, settings |
| gestor | vendas, onboarding, copys, leads | valor, templates, faq, objecoes, kb, config, settings |
| onboarding | onboarding, faq, kb, settings | valor |

---

## 8. BANCO DE DADOS

### 8.1 Tabelas (12 ativas)

```sql
-- 1. profiles
create table profiles (
  id uuid references auth.users(id) primary key,
  name text not null,
  role text check (role in ('closer', 'gestor', 'onboarding')) default 'closer',
  vertical_focus text,
  phone text,
  whatsapp_link text,
  default_greeting text,
  style_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. knowledge_base
create table knowledge_base (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  category text check (category in (
    'produto', 'playbook', 'objeção-resposta', 'regra-comercial',
    'diferencial', 'faq', 'template-followup', 'case-sucesso', 'script-copy'
  )) not null,
  vertical text,
  tags text[],
  source_type text check (source_type in ('texto', 'documento', 'audio', 'video')) default 'texto',
  source_url text,
  is_active boolean default true,
  updated_by text,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. objection_patterns
create table objection_patterns (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  definition text,        -- a frase exata que o lead diz
  real_meaning text,
  vertical text,
  recommended_response text,
  what_not_to_say text,
  proof_points text,
  times_seen_total int default 0,
  win_rate numeric(5,2),
  winning_responses jsonb,
  losing_responses jsonb,
  updated_at timestamptz default now(),
  embedding vector(1536)
);

-- 4. faq_items
create table faq_items (
  id uuid default gen_random_uuid() primary key,
  faq_type text check (faq_type in ('interno', 'cliente')) not null,
  question text not null,
  answer text not null,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop', 'Geral')),
  category text,
  status text check (status in ('rascunho', 'validado')) default 'rascunho',
  created_by uuid references auth.users(id),
  created_by_name text,
  validated_by uuid references auth.users(id),
  is_active boolean default true,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. user_copys
create table user_copys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  user_name text not null,
  category text check (category in (
    'abertura', 'diagnostico', 'apresentacao', 'negociacao',
    'fechamento', 'pos-venda', 'follow-up-aberto',
    'follow-up-template', 'comparativo', 'orcamento', 'outro'
  )) not null,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop', 'Geral')),
  title text not null,
  message_text text not null,
  variables text[],
  when_to_use text,
  when_not_to_use text,
  notes text,
  times_used int default 0,
  is_shared boolean default true,
  is_active boolean default true,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. quote_examples
create table quote_examples (
  id uuid default gen_random_uuid() primary key,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop')) not null,
  product text not null,
  context text,
  quote_text text not null,
  result text check (result in ('win', 'loss', 'pending')),
  created_by uuid references auth.users(id),
  notes text,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- 7. conversations
create table conversations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  copilot_type text check (copilot_type in ('vendas', 'onboarding')) not null,
  mode text,
  lead_context jsonb,
  messages jsonb not null,
  context_used jsonb,
  satisfaction_rating int,
  feedback_text text,
  created_at timestamptz default now()
);

-- 8. onboarding_config
create table onboarding_config (
  id uuid default gen_random_uuid() primary key,
  trail jsonb not null default '[]',
  custom_instructions text,
  welcome_message text,
  tone text default 'didático e acolhedor',
  max_complexity text check (max_complexity in ('basico', 'intermediario', 'avancado')) default 'basico',
  focus_verticals text[],
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- 9. meus_leads
create table meus_leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop')),
  product_interest text,
  objection_main text,
  notes text,
  phone text,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 10. whatsapp_templates
create table whatsapp_templates (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  momento text,
  copy_text text not null,
  variables text[],
  vertical text,
  notes text,
  is_active boolean default true,
  embedding vector(1536),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 11. user_favorite_templates
create table user_favorite_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  template_id uuid references whatsapp_templates(id) on delete cascade
);

-- 12. user_objection_responses
create table user_objection_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  objection_id uuid references objection_patterns(id) on delete cascade,
  response_text text not null,
  updated_at timestamptz default now()
);

-- 13. verdadeiro_valor (singleton)
create table verdadeiro_valor (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  updated_at timestamptz default now()
);

-- 14. big_numbers
create table big_numbers (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  label text not null,
  value text not null,         -- ex: "26.000+", "+90%", "5+"
  description text,
  category text,               -- aprovação | alunos | satisfação | mercado | outro
  vertical text,
  is_highlight boolean default false,
  sort_order int,
  created_by uuid
  -- NÃO tem coluna is_active
);
```

### 8.2 Funções RPC (pgvector HNSW)

```sql
match_knowledge_base(query_embedding vector, match_count int, match_threshold float)
match_faq(query_embedding vector, match_count int, match_threshold float)
match_objections(query_embedding vector, match_count int, match_threshold float)
match_copys(query_embedding vector, match_count int, match_threshold float, filter_user_id uuid)
match_quotes(query_embedding vector, match_count int, match_threshold float)
search_knowledge_base_text(search_query text)   -- fallback ILIKE
```

### 8.3 Novas tabelas (Fase 8.7)

```sql
-- 15. exam_dates
create table exam_dates (
  id uuid default gen_random_uuid() primary key,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop')) not null,
  name text not null,
  exam_date date not null,
  registration_start date,
  registration_end date,
  notes text,
  monday_item_id text,       -- placeholder: URL ou ID do item no Monday.com
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 16. company_events
create table company_events (
  id uuid default gen_random_uuid() primary key,
  type text check (type in ('lançamento', 'campanha', 'evento', 'deadline', 'outro')) not null,
  title text not null,
  description text,
  event_date date not null,
  end_date date,
  verticals text[],
  responsible text,
  link text,
  monday_item_id text,       -- placeholder: URL ou ID do item no Monday.com
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Produtos: salvos em knowledge_base com category='produto'
-- tags[0] = status ('ativo' | 'inativo' | 'beta')
-- Sem tabela nova — reusa knowledge_base + match_knowledge_base existente
```

---

## 9. MÓDULOS E TELAS

### 9.1 Copilot Vendas (`/copilot-vendas`)

**Acesso:** closer + gestor

**8 modos** (chips horizontais):

| Mode | O que faz |
|------|-----------|
| `diagnose` | Perguntas estratégicas — mapeia dores, urgência e fit (máx 5/resposta) |
| `objeção` | Valida → ressignifica → prova com dado ou case real |
| `proposta` | Gera orçamento JSON estruturado renderizado pelo QuoteCard |
| `produto` | Explica benefícios + provas (aprovações, taxa de sucesso) |
| `follow-up` | Mensagem humanizada sem pressão + próximo passo concreto |
| `regra` | Resposta precisa sobre políticas comerciais |
| `copys` | Mensagem pronta para o funil no tom do closer |
| `livre` | Resposta direta e propositiva (máx 350 palavras) |

**Query params especiais:** `?lead=NOME&vertical=R1&produto=XXX&objecao=YYY` → pré-preenche mensagem (usado pelo botão "Diagnóstico no Copilot" do No Radar).

**QuoteCard** (mode `proposta`): detecta bloco ` ```json ` no conteúdo, renderiza card com 6 seções + botões Win/Loss para salvar em `quote_examples`.

### 9.2 Copilot Onboarding (`/copilot-onboarding`)

**Acesso:** onboarding + gestor

Sem mode selector. Guia pela trilha configurada pelo gestor.

- Barra de progresso da trilha no topo
- Botão "Próximo tema" avança `currentTopicIndex`
- `buildOnboardingSystemPrompt(config, context, currentTopicIndex)` monta o prompt
- `getWelcomeMessage(config)` — usa mensagem customizada ou gera automática

### 9.3 Verdadeiro Valor (`/verdadeiro-valor`)

**Acesso:** closer + gestor + onboarding

**Seção 1 — Texto do Verdadeiro Valor:**
- Card grande com conteúdo Markdown (tabela `verdadeiro_valor`, singleton)
- Gestor vê botão "Editar" → textarea Markdown inline com hint de formatação
- Hint: `**negrito** · - bullets · ## títulos`
- Closers/onboarding: leitura apenas
- POST server-side sempre verifica se registro existe antes de INSERT/UPDATE

**Seção 2 — Big Numbers:**
- Grid 3 colunas desktop / 1 mobile
- Cada card: valor grande, label, description, badge de categoria e vertical
- `is_highlight=true` → borda primária
- Gestor: botão "+ Novo número" com modal de CRUD
- Filtros por vertical e categoria
- Tabela `big_numbers` **não tem coluna `is_active`** — DELETE é exclusão real

### 9.4 No Radar — Meus Leads (`/leads`)

**Acesso:** closer + gestor

Bloco de notas pessoal. Cada closer vê só os seus (filtrado por `user_id` no server).

**Botão "Diagnóstico no Copilot"** → `/copilot-vendas?lead=...&vertical=...&produto=...&objecao=...`

### 9.5 Copys & Macros (`/copys`)

**Acesso:** closer + gestor (onboarding: sem acesso)

**3 tabs:** Minhas | Time | Buscar

- GET `/api/copys` retorna `{ mine, team }` — ambas as listas em um request
- Variáveis substituídas: `{{nome}}`, `{{vertical}}`, `{{telefone}}`, `{{whatsapp}}`, `{{saudacao}}`, `{{data}}`
- Preview com simulação de bolha WhatsApp
- Ao salvar → `POST /api/embeddings` (async, sem await)

### 9.6 Templates WhatsApp (`/templates`)

**Acesso:** closer + gestor

- Momentos: reengajamento, follow-up, negociação, encerramento, pós-evento, campanha, teste, recuperação, nutrição, outro
- Favoritos por usuário via `user_favorite_templates`
- GET `/api/templates` retorna `{ templates, favorites }` — um request
- Gestor cria/edita/deleta; closer usa e favorita

### 9.7 FAQ (`/faq`)

**Acesso:** closer + gestor + onboarding

**2 tabs:** Comercial (interno) | Clientes

- Closer/onboarding cria em rascunho; gestor valida → `validado`
- Copilot usa apenas FAQs validadas no RAG
- Ao validar → `POST /api/embeddings`

### 9.8 Matriz de Objeções (`/objecoes`)

**Acesso:** closer + gestor

- Accordion list por objeção
- **Elemento principal do accordion:** `definition` (frase exata do lead) — com `topic` como subtexto
- Campos no modal (ordem): Objeção (definition) → Tema → Vertical/Win rate → O que o lead quer dizer → Resposta recomendada → O que NÃO dizer → Proof points
- "Minha resposta" — cada closer salva em `user_objection_responses`
- GET `/api/objecoes` retorna `{ patterns, responses }` — um request

### 9.9 Knowledge Base (`/kb`)

**Acesso:** closer + gestor + onboarding (gestor edita, outros leem)

**3 formas de entrada:**
1. **Escrever** — editor Markdown com preview
2. **Importar arquivo** — upload `.md` ou `.txt` (leitura pelo browser)
3. **Transcrever mídia** — upload de áudio/vídeo → `POST /api/transcribe` (Whisper)

**Fluxo de salvar (3 steps):**
- `form` → usuário preenche título, categoria, vertical, conteúdo e tags
- `processing` → chama `POST /api/process-document` com o conteúdo; LLM retorna sugestões de categoria, vertical, tags, título, conteúdo formatado em Markdown e, se >2000 palavras, `should_split=true` com array `chunks`
- `review` → usuário revisa/ajusta as sugestões e confirma; ao confirmar, salva na KB (um doc ou múltiplos chunks se `should_split`)

**Categorias (9):** produto, playbook, objeção-resposta, regra-comercial, diferencial, faq, template-followup, case-sucesso, script-copy

### 9.10 Config Onboarding (`/onboarding-config`)

**Acesso:** gestor only

- Trilha de temas (drag handle para reordenar)
- Welcome message personalizada
- Tom do copilot
- Custom instructions
- Singleton em `onboarding_config`

### 9.11 Configurações (`/settings`)

**Acesso:** todos os roles

**Dados pessoais:** nome, email (read-only), vertical de foco, telefone, whatsapp_link, saudação padrão.

**Style Wizard** (5 passos): tom de voz → emoji → tratamento do lead → encerramento → exemplo real.

**Modo avançado:** textarea livre para `style_notes` (injetado no system prompt via context builder).

Salva via `PATCH /api/profile`.

### 9.12 Login (`/login`)

- 3 views: Login | Criar conta | Recuperar senha
- Supabase Auth (email + senha) — sem OAuth

### 9.13 Home (`/`)

**Acesso:** todos os roles

Dashboard de boas-vindas com:
- Saudação contextual (bom dia/tarde/noite) com nome do usuário
- **Provas próximas** — próximas 4 provas com countdown colorido (>90d verde, 31-90d âmbar, ≤30d vermelho)
- **Próximos 30 dias** — eventos da tabela `company_events` dentro da janela de 30 dias
- **Acesso rápido** — grid de 4 cards com links para os módulos principais do role

### 9.14 Agenda (`/agenda`)

**Acesso:** todos os roles veem; gestor edita

**Seção 1 — Provas & Datas:**
- Lista de exames com countdown pill colorido por urgência
- Filtro por vertical
- Exames passados collapsíveis ("X provas realizadas")
- Campo `monday_item_id`: aceita URL do Monday — se preenchido, exibe chip "Monday" clicável
- Gestor: CRUD completo via modal (campos: vertical, nome, data_prova, início/fim inscrições, notas, link Monday)

**Seção 2 — Calendário de Eventos:**
- Lista cronológica agrupada por mês
- Tipos: lançamento (indigo), campanha (violeta), evento (cyan), deadline (vermelho), outro (cinza)
- Multi-select de verticais no form
- Campo `monday_item_id` igual às provas (placeholder Monday)
- Gestor: CRUD completo via modal

**Copilot:** `fetchExamDates()` e `fetchUpcomingEvents()` injetam dados como blocos fixos no contexto em toda consulta.

### 9.15 Produtos (`/produtos`)

**Acesso:** todos os roles veem; gestor edita

- Catálogo de produtos com form estruturado (13 campos)
- Salva na tabela `knowledge_base` com `category='produto'`, `tags=[status]`
- `title` = nome do produto, `vertical` = vertical médica, conteúdo = Markdown gerado do form
- Quando edita: faz parse do Markdown via regex para re-popular os campos
- Ao salvar: dispara `POST /api/embeddings` (fire-and-forget) para indexar no RAG
- Status: ativo (verde), inativo (cinza), beta (indigo)
- O `match_knowledge_base` já indexa produtos — entram automaticamente no RAG do Copilot

**`/api/produtos`:** GET filtra `knowledge_base WHERE category='produto'`; POST formata os campos em Markdown e salva via KB; DELETE soft-delete.

---

## 10. TODAS AS API ROUTES

| Route | Método | O que faz |
|-------|--------|-----------|
| `/api/copilot-vendas` | POST | Streaming chat vendas (RAG + Groq) |
| `/api/copilot-onboarding` | POST | Streaming chat onboarding |
| `/api/profile` | PATCH | Atualizar perfil do usuário |
| `/api/embeddings` | POST | Gera embedding e salva na coluna da tabela |
| `/api/transcribe` | POST | Transcreve áudio/vídeo via Whisper |
| `/api/copys` | GET | Lista user_copys: `{ mine, team }` |
| `/api/copys` | POST | Cria (sem id) ou edita (com id) user_copys |
| `/api/copys` | DELETE | Soft-delete (is_active=false) |
| `/api/faq` | GET | Lista faq_items: `{ data }` |
| `/api/faq` | POST | Cria ou edita faq_items |
| `/api/faq` | DELETE | Soft-delete |
| `/api/objecoes` | GET | Lista objection_patterns + user_objection_responses: `{ patterns, responses }` |
| `/api/objecoes` | POST | Cria ou edita objection_patterns |
| `/api/objecoes` | DELETE | Hard delete |
| `/api/kb` | GET | Lista knowledge_base: `{ data }` |
| `/api/kb` | POST | Cria ou edita knowledge_base |
| `/api/kb` | DELETE | Soft-delete |
| `/api/templates` | GET | Lista whatsapp_templates + favoritos: `{ templates, favorites }` |
| `/api/templates` | POST | Cria ou edita whatsapp_templates |
| `/api/templates` | DELETE | Soft-delete |
| `/api/leads` | GET | Lista meus_leads do usuário: `{ data }` |
| `/api/leads` | POST | Cria ou edita meus_leads |
| `/api/leads` | DELETE | Hard delete |
| `/api/big-numbers` | GET | Lista big_numbers: `{ data }` |
| `/api/big-numbers` | POST | Cria ou edita big_numbers |
| `/api/big-numbers` | DELETE | Hard delete |
| `/api/verdadeiro-valor` | GET | Busca singleton + big_numbers: `{ vv, bns }` |
| `/api/verdadeiro-valor` | POST | Upsert servidor-side (verifica existente antes de inserir) |
| `/api/favorites` | POST | Adiciona favorito em user_favorite_templates |
| `/api/favorites` | DELETE | Remove favorito |
| `/api/user-objection-responses` | POST | Upsert resposta pessoal de objeção |
| `/api/user-objection-responses` | DELETE | Remove resposta pessoal |
| `/api/process-document` | POST | Analisa conteúdo com LLM; retorna `suggested_category`, `suggested_vertical`, `suggested_tags`, `suggested_title`, `formatted_content`, `should_split`, `chunks` |
| `/api/exam-dates` | GET | Lista exam_dates ativas ordenadas por data |
| `/api/exam-dates` | POST | Cria ou edita exam_dates |
| `/api/exam-dates` | DELETE | Soft-delete (is_active=false) |
| `/api/events` | GET | Lista company_events ativos ordenados por data |
| `/api/events` | POST | Cria ou edita company_events |
| `/api/events` | DELETE | Soft-delete (is_active=false) |
| `/api/produtos` | GET | Lista knowledge_base WHERE category='produto': `{ data }` |
| `/api/produtos` | POST | Formata form → Markdown, salva em knowledge_base (category=produto) |
| `/api/produtos` | DELETE | Soft-delete (is_active=false) |

---

## 11. SYSTEM PROMPTS

### 11.1 Copilot Vendas (`lib/ai/vendas-prompt.ts`)

```
Você é o Copilot Comercial do Grupo Med-Review, segundo cérebro do time de vendas.

REGRAS INVIOLÁVEIS:
1. Nunca invente informações que não estão no contexto
2. Nunca prometa preço ou desconto sem ressalvar que o gestor confirma
3. Quando não souber, diga: "Não tenho essa informação — confirme com o gestor"
4. Nunca ataque concorrentes diretamente
5. Tom direto e consultivo — como gestor sênior que quer o closer fechando

DIFERENCIAIS MED-REVIEW:
[...texto sobre diferencial de personalização + bullets com stats...]

USE O VERDADEIRO VALOR:
Use os dados do "Verdadeiro Valor" e "Big Numbers" naturalmente nas suas respostas
— em argumentação, contorno de objeções e propostas. Quando o closer pedir
explicitamente dados ou diferenciais, reforce com mais ênfase.

MODO ATUAL: {mode}
Formato esperado: {format do mode}

Se identificar lacuna no contexto: 🔴 LACUNA IDENTIFICADA: [o que falta]

CONTEXTO RELEVANTE:
{contexto RAG — max 12.000 chars}
```

**Formato por mode:**

| Mode | Instrução |
|------|-----------|
| diagnose | Perguntas estratégicas (máx 5/resposta) |
| objeção | (1) valide → (2) ressignifique → (3) prove |
| proposta | JSON `{"contexto","solucao","entregaveis","investimento","diferenciais","proximos_passos"}` |
| produto | Benefícios + provas |
| follow-up | Humanizado, sem pressão, próximo passo |
| regra | Resposta precisa; se não souber, dizer explicitamente |
| copys | Mensagem pronta usando tom das copys do time |
| livre | Resposta direta (máx 350 palavras) |

### 11.2 Copilot Onboarding (`lib/ai/onboarding-prompt.ts`)

```
Você é o Copilot de Onboarding do Grupo Med-Review. Tom: {tone}.

REGRAS:
1. Explique conceitos com exemplos práticos reais da Med-Review
2. Após cada explicação, faça pergunta ou mini-quiz
3. Termine com sugestão do que estudar a seguir
4. Se sair da trilha, responda brevemente e volte
5. Nunca invente informações
6. Ensine o verdadeiro valor usando os Big Numbers como referência

[SOBRE A MED-REVIEW — stats + verticais + método]

TRILHA DE APRENDIZADO (N temas):
1. Tema A
2. Tema B  ← TEMA ATUAL
...

TEMA ATUAL: "{título}" — {descrição}
PRÓXIMO TEMA: "{título}"

INSTRUÇÕES DO GESTOR: {custom_instructions}
CONTEXTO DA BASE DE CONHECIMENTO: {contexto RAG}
```

---

## 12. EMBEDDING AUTOMÁTICO

```typescript
// Chamado após cada save em KB, FAQ, Objeções, Copys, Templates:
fetch('/api/embeddings', {
  method: 'POST',
  body: JSON.stringify({ table: 'knowledge_base', id: doc.id, content: doc.content }),
}).catch(() => {})  // fire-and-forget, sem await

// Tabelas permitidas: knowledge_base, faq_items, user_copys,
//                    objection_patterns, quote_examples, whatsapp_templates
```

---

## 13. PALETA DE CORES E DESIGN TOKENS

Definidos em `app/globals.css` como CSS custom properties:

```css
/* Cursor global */
button, [role="button"], a { cursor: pointer; }

/* Cores base */
--background: #F9FAFB;
--foreground: #111827;

/* Primary (indigo) */
--primary: #6366F1;
--primary-hover: #4F46E5;
--primary-light: #EEF2FF;

/* Sidebar */
--bg-sidebar: #1E1B4B;
--bg-sidebar-hover: #312E81;
--bg-sidebar-active: #4338CA;

/* Texto */
--text-primary: #111827;
--text-secondary: #6B7280;
--text-muted: #9CA3AF;
--text-sidebar: #C7D2FE;

/* Bordas */
--border: #E5E7EB;
--border-light: #F3F4F6;

/* Status */
--success: #10B981;  --success-light: #ECFDF5;
--warning: #F59E0B;  --warning-light: #FFFBEB;
--danger:  #EF4444;  --danger-light:  #FEF2F2;

/* Verticais */
--r1:    #3B82F6;   /* azul */
--anest: #8B5CF6;   /* violeta */
--oft:   #06B6D4;   /* cyan */
--ortop: #F97316;   /* laranja */
```

**Padrões de componentes:**
- Font: Inter, 14px base, line-height 1.6
- Cards: `bg-white border border-[#E5E7EB] rounded-xl shadow-sm`
- Sidebar: gradiente `#1E1B4B → #2D2A7A`, 240px
- Botões primários: `bg-[#6366F1] hover:bg-[#4F46E5] rounded-lg transition-all duration-150`
- Inputs: `border rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none`
- Badges (verticais): pills `rounded-full px-2 py-0.5` com cor por vertical
- Chat user: `bg-[#EEF2FF] rounded-2xl` alinhado à direita
- Chat copilot: `bg-white border rounded-2xl` alinhado à esquerda
- Mobile: bottom nav 4 ícones + botão Menu (drawer com grid 4 colunas)

---

## 14. GUIA DE ALIMENTAÇÃO DA BASE

| Onde subir | O que colocar | Módulo |
|-----------|---------------|--------|
| **Knowledge Base** | Tudo sobre produtos, metodologia, diferenciais, playbooks, scripts, cases, regras comerciais | `/kb` — Escrever / Importar / Transcrever |
| **Verdadeiro Valor** | Texto editorial sobre o diferencial real da Med-Review (Markdown) | `/verdadeiro-valor` → botão Editar (gestor) |
| **Big Numbers** | Números de impacto: alunos, taxa de aprovação, satisfação, anos de mercado | `/verdadeiro-valor` → "+ Novo número" (gestor) |
| **FAQ** | Perguntas frequentes do lead e dúvidas internas — gestor valida antes de entrar no RAG | `/faq` |
| **Matriz de Objeções** | Objeção real + resposta vencedora + o que não dizer + win rate | `/objecoes` |
| **Copys** | Mensagens que funcionaram por categoria (abertura, follow-up, fechamento…) | `/copys` |
| **Templates WhatsApp** | Templates reusáveis por momento (reengajamento, campanha, pós-evento…) | `/templates` |
| **Quote Examples** | Orçamentos win/loss (gerados automaticamente pelo QuoteCard no modo proposta) | Automático |

**Regra de ouro:** subir pelo menos 20-30 docs de KB antes de usar em produção. Quanto mais a base tiver, mais preciso o RAG.

---

## 15. DEPLOY — VERCEL

1. Conectar repo no Vercel (main → prod)
2. Variáveis de ambiente (5):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `OPENAI_API_KEY`
3. Framework preset: Next.js
4. Build command: `next build`

---

## 16. FASES DE CONSTRUÇÃO

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Setup Next.js + Supabase + Auth + tabelas | ✅ |
| 2 | Layout + Sidebar + Rotas + Login | ✅ |
| 3 | RAG (embeddings + context-builder + Groq) + Copilot Vendas | ✅ |
| 4 | Copilot Onboarding + Config do gestor | ✅ |
| 5 | KB Admin (3 formas de entrada + embedding automático) | ✅ |
| 6 | Copys & Macros + Templates WhatsApp (CRUD + embedding) | ✅ |
| 7 | FAQ + Matriz de Objeções (CRUD + embedding + respostas pessoais) | ✅ |
| 8 | No Radar (leads) + Settings (wizard de estilo) | ✅ |
| 8.5 | Verdadeiro Valor (tela + Big Numbers + absorção nos copilots) | ✅ |
| 8.6 | Migração total para API routes com admin client (fix RLS) | ✅ |
| 8.7 | Agenda (Provas + Eventos) + Catálogo de Produtos + Home dashboard | ✅ |
| 9 | Seed — importar docs reais + embeddings em massa | ⏳ |
| 10 | Polish final + Deploy Vercel | ⏳ |

---

> Este arquivo é a fonte de verdade do projeto. Atualize sempre que implementar algo novo.
