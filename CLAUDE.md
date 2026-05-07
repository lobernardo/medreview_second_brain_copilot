# CLAUDE.md — Second Brain Med-Review

> **Fonte de verdade do projeto. Leia antes de qualquer tarefa.**
> **Versão:** 4.0 | Data: 07/05/2026

---

## 1. VISÃO GERAL

**Second Brain Med-Review** — sistema web interno do Grupo Med-Review para o time comercial.

Dois copilots de IA alimentados por RAG (busca vetorial sobre a base de conhecimento interna):

| Copilot | Quem usa | Para quê |
|---------|----------|----------|
| **Copilot Vendas** | closers + gestores | Objeções, propostas, diagnóstico, follow-up, copys |
| **Copilot Onboarding** | novos colaboradores + gestores | Aprender produtos, processos, regras do time |

Além dos copilots, o sistema oferece ferramentas complementares: bloco de leads (No Radar), copys & macros, templates WhatsApp, FAQ, matriz de objeções e knowledge base.

---

## 2. STACK

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router, TypeScript) | 16.2.4 |
| Runtime UI | React | 19.2.4 |
| Estilos | Tailwind CSS | 4 |
| Componentes | shadcn/ui (selecionado) + Lucide React | lucide 1.14.0 |
| Font | Inter (@fontsource/inter) | 5.2.8 |
| Auth | Supabase Auth via `@supabase/ssr` | ssr 0.10.2 |
| Database | Supabase (PostgreSQL + pgvector) | supabase-js 2.105.3 |
| AI Chat | Groq API — `llama-3.3-70b-versatile` | groq-sdk 1.1.2 |
| AI Embeddings | OpenAI — `text-embedding-3-small` (1536 dims) | fetch direto |
| AI Transcrição | OpenAI Whisper — `whisper-1` | fetch direto |
| Markdown | react-markdown + remark-gfm | md 10.1.0 / gfm 4.0.1 |
| Datas | date-fns | 4.1.0 |
| Deploy | Vercel | — |

> **Não há shadcn CLI configurado** — componentes UI foram escritos manualmente seguindo o padrão shadcn.

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
Embedding da mensagem (OpenAI text-embedding-3-small)
        ↓                          ↓ (se OPENAI_API_KEY ausente)
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

### Chamada Groq (groq-client.ts)

```typescript
// lib/ai/groq-client.ts
fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: message }],
    temperature: 0.3,
    max_tokens: 4096,
    stream: true,
  }),
})
```

### Chamada Embeddings (embeddings.ts)

```typescript
// lib/ai/embeddings.ts
fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
})
// → data.data[0].embedding (número[1536])
```

### Chamada Whisper (api/transcribe/route.ts)

```typescript
// Formato: multipart/form-data para api.openai.com/v1/audio/transcriptions
// model: whisper-1, language: pt, response_format: text
// Limite: 25 MB | Formatos: mp3, m4a, wav, webm, mpga, mp4, mpeg
```

---

## 5. ESTRUTURA DE PASTAS (ESTADO REAL)

```
copilot-medreview/
├── app/
│   ├── layout.tsx                      # Root layout com AppShell + auth check
│   ├── page.tsx                        # Redirect → /copilot-vendas
│   ├── globals.css                     # Design tokens CSS + Tailwind import
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
│   ├── settings/page.tsx               # Perfil + wizard de estilo do copilot
│   └── api/
│       ├── copilot-vendas/route.ts     # POST — streaming chat vendas (RAG + Groq)
│       ├── copilot-onboarding/route.ts # POST — streaming chat onboarding
│       ├── profile/route.ts            # PATCH — atualizar perfil do usuário
│       ├── embeddings/route.ts         # POST — gera embedding e salva na tabela
│       └── transcribe/route.ts         # POST — transcreve áudio/vídeo via Whisper
│
├── components/
│   ├── layout/
│   │   ├── app-shell.tsx               # Wrapper: Sidebar + Header + MobileNav + ProfileProvider
│   │   ├── sidebar.tsx                 # Nav desktop (role-based, gradiente indigo)
│   │   ├── header.tsx                  # Barra superior (título dinâmico + logout)
│   │   ├── mobile-nav.tsx              # Bottom nav + drawer para mobile
│   │   └── stub-page.tsx               # Placeholder para páginas em construção
│   ├── ui/
│   │   ├── toast.tsx                   # Notificação flutuante (success/error)
│   │   ├── badge.tsx                   # VerticalBadge (R1, Anest, Oft, Ortop)
│   │   └── skeleton.tsx                # SkeletonCard / SkeletonGrid / SkeletonList / SkeletonForm
│   └── chat/
│       └── quote-card.tsx              # Detecta JSON de orçamento e renderiza em card
│
├── lib/
│   ├── ai/
│   │   ├── groq-client.ts             # callGroqStream() — streaming para Groq
│   │   ├── embeddings.ts              # generateEmbedding() — OpenAI text-embedding-3-small
│   │   ├── context-builder.ts         # buildContext() — orquestra RAG completo
│   │   ├── vendas-prompt.ts           # buildVendasSystemPrompt(mode, context)
│   │   └── onboarding-prompt.ts       # buildOnboardingSystemPrompt() + getWelcomeMessage()
│   ├── supabase/
│   │   ├── client.ts                  # createBrowserClient (anon key)
│   │   ├── server.ts                  # createServerClient (cookies SSR)
│   │   └── admin.ts                   # createClient com service_role (bypass RLS)
│   ├── utils/
│   │   ├── types.ts                   # interface Profile
│   │   └── constants.ts               # VERTICAL_CONFIG, VERTICALS
│   └── context/
│       └── profile-context.tsx        # ProfileProvider + useProfile() hook
│
├── middleware.ts                       # Supabase SSR middleware (refresh session)
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 6. SIDEBAR — ITENS E VISIBILIDADE POR ROLE

```
Item                  | Rota                | Ícone           | closer | gestor | onboarding
----------------------|---------------------|-----------------|--------|--------|----------
Copilot Vendas        | /copilot-vendas     | Bot             |  ✅    |  ✅    |
Copilot Onboarding    | /copilot-onboarding | GraduationCap   |        |  ✅    |  ✅
No Radar              | /leads              | NotebookPen     |  ✅    |  ✅    |
Copys                 | /copys              | Mail            |  ✅    |  ✅    |
Templates             | /templates          | MessageSquareText|  ✅    |  ✅    |
FAQ                   | /faq                | HelpCircle      |  ✅    |  ✅    |  ✅
Matriz de Objeções    | /objecoes           | Shield          |  ✅    |  ✅    |
Knowledge Base        | /kb                 | BookOpen        |  ✅    |  ✅    |  ✅
Config Onboarding     | /onboarding-config  | Settings2       |        |  ✅    |
Configurações         | /settings           | Settings        |  ✅    |  ✅    |  ✅
```

**Sidebar visual:** gradiente `#1E1B4B → #2D2A7A`, 240px desktop, texto `#C7D2FE`, active `bg-[#4338CA]`.
**Footer:** avatar com inicial do nome + role em `#C7D2FE`.

---

## 7. BANCO DE DADOS

### 7.1 Tabelas (11 ativas)

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
  style_notes text,           -- tom de voz do closer (alimenta copilot)
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
  definition text,
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
  message_text text not null,          -- suporta {{variáveis}}
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
  trail jsonb not null default '[]',   -- TrailItem[]: {order, title, description}
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
  momento text,                        -- reengajamento, follow-up, etc.
  copy_text text not null,             -- suporta {{variáveis}}
  variables text[],
  vertical text,
  notes text,
  is_active boolean default true,
  embedding vector(1536),
  created_at timestamptz default now()
);

-- 11. user_favorite_templates
create table user_favorite_templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  template_id uuid references whatsapp_templates(id) on delete cascade
);

-- (extra: user_objection_responses — respostas pessoais do closer por objeção)
create table user_objection_responses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  objection_id uuid references objection_patterns(id) on delete cascade,
  response_text text not null,
  updated_at timestamptz default now()
);
```

### 7.2 Funções RPC (pgvector HNSW)

```sql
match_knowledge_base(query_embedding vector, match_count int, match_threshold float)
match_faq(query_embedding vector, match_count int, match_threshold float)
match_objections(query_embedding vector, match_count int, match_threshold float)
match_copys(query_embedding vector, match_count int, match_threshold float, filter_user_id uuid)
match_quotes(query_embedding vector, match_count int, match_threshold float)
search_knowledge_base_text(search_query text)   -- fallback ILIKE
```

---

## 8. MÓDULOS E TELAS

### 8.1 Copilot Vendas (`/copilot-vendas`)

**Acesso:** closer + gestor

**8 modos** (chips horizontais no topo do chat):

| Mode | O que faz |
|------|-----------|
| `diagnose` | Perguntas estratégicas para mapear dores, urgência e fit (máx 5/resposta) |
| `objeção` | Valida → ressignifica → prova com dado ou case real |
| `proposta` | Gera orçamento JSON estruturado renderizado pelo QuoteCard |
| `produto` | Explica benefícios + provas (aprovações, taxa de sucesso) |
| `follow-up` | Mensagem humanizada sem pressão + próximo passo concreto |
| `regra` | Resposta precisa sobre políticas comerciais |
| `copys` | Mensagem pronta para o funil no tom do closer |
| `livre` | Resposta direta e propositiva (máx 350 palavras) |

**Fluxo interno:**
1. Closer envia mensagem + mode selecionado
2. API `POST /api/copilot-vendas` chama `buildContext(message, mode, userId)`:
   - Gera embedding (OpenAI)
   - Buscas vetoriais paralelas nas tabelas relevantes para o mode
   - Fallback textual se sources < 2
3. Monta `buildVendasSystemPrompt(mode, context)`
4. Chama Groq com `stream: true` → retorna SSE
5. Frontend renderiza token a token (react-markdown)
6. Context Inspector (collapsible) mostra fontes: título + similarity score
7. Botão copiar + feedback 👍/👎

**Query params especiais:** `?lead=NOME&vertical=R1&produto=XXX&objecao=YYY` → pré-preenche mensagem de diagnóstico (usado pelo link "Diagnóstico no Copilot" do No Radar).

**QuoteCard** (mode `proposta`): detecta bloco ```json no conteúdo, renderiza card com 6 seções (Contexto, Solução, Entregáveis, Investimento, Diferenciais, Próximos Passos) + botões Win/Loss para salvar em `quote_examples`.

### 8.2 Copilot Onboarding (`/copilot-onboarding`)

**Acesso:** onboarding + gestor

**Sem mode selector.** Guia pela trilha configurada pelo gestor.

**Fluxo:**
1. Página busca `onboarding_config` (singleton) na carga
2. Exibe barra de progresso da trilha no topo
3. Botão "Próximo tema" avança `currentTopicIndex`
4. API `POST /api/copilot-onboarding` monta `buildOnboardingSystemPrompt(config, context, currentTopicIndex)`
5. Copilot explica → exemplifica → quiz → sugere próximo tema

**Welcome message:** `getWelcomeMessage(config)` — usa mensagem customizada do gestor ou gera automática baseada no primeiro tema da trilha.

### 8.3 Config Onboarding (`/onboarding-config`)

**Acesso:** gestor only

- Adicionar/remover/reordenar temas da trilha (drag handle)
- Welcome message personalizada
- Tom do copilot (4 opções configuráveis)
- Custom instructions (textarea livre para o gestor instruir o copilot)
- Salva em `onboarding_config` (singleton)

### 8.4 No Radar — Meus Leads (`/leads`)

**Acesso:** closer + gestor

Bloco de notas pessoal de leads. Cada closer vê só os seus (RLS por `user_id`).

**Campos:** nome*, vertical, produto de interesse, objeção principal, telefone, email, notas.

**Botão "Diagnóstico no Copilot"** → abre `/copilot-vendas` com query params do lead pré-carregados.

### 8.5 Copys & Macros (`/copys`)

**Acesso:** closer + gestor (onboarding: sem acesso)

**3 tabs:** Minhas | Time | Buscar

- Closer cria/edita/deleta as próprias copys
- Gestor pode editar qualquer copy
- Compartilhamento on/off (`is_shared`)
- Categorias (11): abertura, diagnóstico, apresentação, negociação, fechamento, pós-venda, follow-up-aberto, follow-up-template, comparativo, orçamento, outro
- Variáveis substituídas automaticamente: `{{nome}}`, `{{vertical}}`, `{{telefone}}`, `{{whatsapp}}`, `{{saudacao}}`, `{{data}}`
- Preview com simulação de bolha WhatsApp
- Ao salvar → chama `POST /api/embeddings` → embedding para RAG

### 8.6 Templates WhatsApp (`/templates`)

**Acesso:** closer + gestor

- Templates WhatsApp com momentos: reengajamento, follow-up, negociação, encerramento, pós-evento, campanha, teste, recuperação, nutrição, outro
- Variáveis customizáveis (chips)
- Favoritos por usuário (`user_favorite_templates`)
- Gestor cria/edita/deleta; closer usa e favorita

### 8.7 FAQ (`/faq`)

**Acesso:** closer + gestor + onboarding

**2 tabs:** Comercial (interno) | Clientes

- Closer/onboarding cria em rascunho
- Gestor valida → muda status para `validado`
- Copilot usa apenas FAQs validadas no RAG
- Filtros: vertical, categoria, status
- Ao validar → `POST /api/embeddings`

### 8.8 Matriz de Objeções (`/objecoes`)

**Acesso:** closer + gestor

- Accordion list por objeção
- Campos: tema, definição, significado real, resposta recomendada, o que NÃO dizer, proof points, win rate (%)
- "Minha resposta" — cada closer salva sua resposta pessoal em `user_objection_responses`
- Filtro por vertical e busca por texto
- Gestor edita; ao salvar → `POST /api/embeddings`

### 8.9 Knowledge Base (`/kb`)

**Acesso:** closer + gestor + onboarding (gestor edita, outros leem)

**3 formas de entrada:**
1. **Escrever** — editor Markdown com preview
2. **Importar arquivo** — upload de `.md` ou `.txt` (leitura pelo browser)
3. **Transcrever mídia** — upload de áudio/vídeo → `POST /api/transcribe` (Whisper) → texto editável → salva

**Categorias (9):** produto, playbook, objeção-resposta, regra-comercial, diferencial, faq, template-followup, case-sucesso, script-copy

**Metadados:** título, vertical, tags (chips), source_type, source_url

Ao salvar → `POST /api/embeddings` gera embedding e atualiza a coluna `embedding` da row.

### 8.10 Configurações (`/settings`)

**Acesso:** todos os roles

**Dados pessoais:** nome, email (read-only), vertical de foco, telefone, whatsapp_link, saudação padrão.

**Style Wizard** (5 passos interativos):
1. Tom de voz (4 opções)
2. Emoji nas mensagens (3 opções)
3. Tratamento do lead (4 opções + custom)
4. Encerramento preferido (4 opções + custom)
5. Exemplo de mensagem real

**Modo avançado:** textarea livre para escrever `style_notes` diretamente.

`style_notes` é injetado no context builder para que o Copilot Vendas adapte copys ao tom do closer.

Salva via `PATCH /api/profile`.

### 8.11 Login (`/login`)

- 3 views: Login | Criar conta | Recuperar senha
- Supabase Auth (email + senha, mínimo 6 chars)
- Sem OAuth — apenas email/password

---

## 9. SYSTEM PROMPTS

### 9.1 Copilot Vendas (`lib/ai/vendas-prompt.ts`)

```
Você é o Copilot Comercial do Grupo Med-Review, segundo cérebro do time de vendas.

REGRAS INVIOLÁVEIS:
1. Nunca invente informações que não estão no contexto
2. Nunca prometa preço ou desconto sem ressalvar que o gestor confirma
3. Quando não souber, diga: "Não tenho essa informação — confirme com o gestor"
4. Nunca ataque concorrentes diretamente
5. Tom direto e consultivo — como gestor sênior que quer o closer fechando

DIFERENCIAIS MED-REVIEW:
- +5 anos de mercado, +26.000 alunos, +90% de satisfação
- Professores aprovados em residência/concursos — não é coach, é quem passou na prova
- IA personalizada por vertical: R1, Anestesiologia, Oftalmologia, Ortopedia
- Método active recall + spaced repetition comprovado
- Suporte completo + comunidade ativa de residentes

MODO ATUAL: {mode}
Formato esperado: {format do mode}

Se identificar lacuna no contexto: 🔴 LACUNA IDENTIFICADA: [o que falta]

CONTEXTO RELEVANTE:
{contexto RAG — max 12.000 chars}
```

**Formato esperado por mode:**

| Mode | Instrução de formato |
|------|---------------------|
| diagnose | Perguntas estratégicas (máx 5/resposta) |
| objeção | (1) validar → (2) ressignificar → (3) provar com dado ou case |
| proposta | Montar + JSON `{"contexto","solucao","entregaveis","investimento","diferenciais","proximos_passos"}` |
| produto | Benefícios + provas (aprovações, taxa de sucesso) |
| follow-up | Humanizado, sem pressão, próximo passo concreto |
| regra | Resposta precisa; se não souber, dizer explicitamente |
| copys | Mensagem pronta usando tom das copys do time |
| livre | Resposta direta (máx 350 palavras) |

### 9.2 Copilot Onboarding (`lib/ai/onboarding-prompt.ts`)

```
Você é o Copilot de Onboarding do Grupo Med-Review. Seu papel é guiar novos
colaboradores com tom {tone}.

REGRAS:
1. Explique conceitos com exemplos práticos e situações reais da Med-Review
2. Após cada explicação, faça uma pergunta ou mini-quiz para fixar o aprendizado
3. Termine sempre com uma sugestão clara do que estudar a seguir
4. Se a pergunta sair da trilha, responda brevemente e volte ao contexto
5. Nunca invente informações — baseie-se apenas no contexto fornecido

SOBRE A MED-REVIEW:
- +5 anos de mercado · +26.000 alunos · +90% de satisfação
- Verticais: R1, Anestesiologia (Anest), Oftalmologia (Oft), Ortopedia (Ortop)
- Método: active recall + spaced repetition + IA personalizada por vertical
- Professores aprovados nas provas — ensinam o que realmente cai

TRILHA DE APRENDIZADO ({N} temas):
1. Tema A
2. Tema B  ← TEMA ATUAL
3. Tema C
...

TEMA ATUAL: "{título}" — {descrição}
PRÓXIMO TEMA: "{título}" (sugira no final da resposta)

INSTRUÇÕES DO GESTOR:
{custom_instructions — se houver}

CONTEXTO DA BASE DE CONHECIMENTO:
{contexto RAG}
```

---

## 10. EMBEDDING AUTOMÁTICO

Toda vez que um documento é criado/editado em KB, FAQ, Objeções, Copys ou Templates:

```typescript
// Chamada do frontend após salvar o doc:
await fetch('/api/embeddings', {
  method: 'POST',
  body: JSON.stringify({ table: 'knowledge_base', id: doc.id, content: doc.content }),
})

// app/api/embeddings/route.ts
// Tabelas permitidas: knowledge_base, faq_items, user_copys, objection_patterns,
//                    quote_examples, whatsapp_templates
// Gera embedding via OpenAI → supabase.from(table).update({ embedding }).eq('id', id)
```

---

## 11. PALETA DE CORES E DESIGN TOKENS

Definidos em `app/globals.css` como CSS custom properties:

```css
/* Cores base */
--background: #F9FAFB;
--foreground: #111827;

/* Primary (indigo) */
--primary: #6366F1;
--primary-hover: #4F46E5;
--primary-light: #EEF2FF;

/* Sidebar */
--bg-sidebar: #1E1B4B;          /* gradient start */
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
- Inputs: `border rounded-lg focus:ring-2 focus:ring-indigo-500`
- Badges (verticais): pills `rounded-full px-2 py-0.5` com cor por vertical
- Chat user: `bg-[#EEF2FF] rounded-2xl` alinhado à direita
- Chat copilot: `bg-white border rounded-2xl` alinhado à esquerda
- Mobile: bottom nav 5 ícones principais + drawer com grid 4 colunas

---

## 12. GUIA DE ALIMENTAÇÃO DA BASE

| Onde subir | O que colocar | Módulo |
|-----------|---------------|--------|
| **Knowledge Base** | Tudo sobre produtos (R1, Anest, Oft, Ortop), metodologia, diferenciais, playbooks de venda, scripts, cases de sucesso, regras comerciais, políticas | `/kb` — tab Escrever/Importar/Transcrever |
| **FAQ** | Perguntas frequentes do lead ("qual a diferença entre X e Y?", "posso parcelar?") e dúvidas internas do time | `/faq` — gestor valida antes de entrar no RAG |
| **Matriz de Objeções** | Cada objeção real que o lead usa: significado real + resposta vencedora + o que não dizer + win rate | `/objecoes` |
| **Copys** | Mensagens que o time já usou e funcionaram por categoria (abertura, follow-up, fechamento…) | `/copys` |
| **Templates WhatsApp** | Templates de WhatsApp reusáveis por momento (reengajamento, pós-evento, campanha…) | `/templates` |
| **Quote Examples** | Orçamentos enviados marcados como win/loss (gerados pelo Copilot mode `proposta`) | Automático via QuoteCard |

**Regra de ouro:** quanto mais a base tiver, mais preciso o RAG. Subir pelo menos 20-30 docs de KB antes de usar em produção.

---

## 13. DEPLOY — VERCEL

1. Conectar repo no Vercel (main branch → prod, PRs → preview)
2. Configurar as 5 variáveis de ambiente no painel Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`
   - `OPENAI_API_KEY`
3. Framework preset: Next.js
4. Build command: `next build`
5. Sem configuração especial — tudo roda via Edge/Node Functions padrão do Vercel

**Supabase:** RLS ativo em todas as tabelas. Service role key usada apenas nas API routes server-side (nunca no cliente). Admin client (`lib/supabase/admin.ts`) só usado em endpoints de embedding e transcrição.

---

## 14. FASES DE CONSTRUÇÃO

| Fase | Descrição | Status |
|------|-----------|--------|
| 1 | Setup Next.js + Supabase + Auth + tabelas | ✅ |
| 2 | Layout + Sidebar + Rotas + Login | ✅ |
| 3 | RAG (embeddings + context-builder + Groq) + Copilot Vendas | ✅ |
| 4 | Copilot Onboarding + Config do gestor | ✅ |
| 5 | KB Admin (3 formas de entrada + embedding automático) | ✅ |
| 6 | Copys & Macros + Templates WhatsApp (3 tabs, CRUD, embedding) | ✅ |
| 7 | FAQ + Matriz de Objeções (CRUD + embedding + respostas pessoais) | ✅ |
| 8 | No Radar (leads) + Settings (wizard de estilo) | ✅ |
| 9 | Seed — importar docs reais + embeddings em massa | ⏳ |
| 10 | Polish final + Deploy Vercel | ⏳ |

---

> Este arquivo é a fonte de verdade do projeto. Atualize sempre que implementar algo novo.
