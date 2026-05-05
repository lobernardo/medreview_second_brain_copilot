# CLAUDE.md — Copilot Comercial Med-Review

> **Briefing para construção via Claude Code.**
> **Stack:** Next.js 14 (App Router) + Tailwind + shadcn/ui + Supabase + Groq API + Vercel
> **Versão:** 2.1 | Data: 04/05/2026

---

## O QUE ESTAMOS CONSTRUINDO

Sistema web interno do Grupo Med-Review — o "segundo cérebro" do time comercial.
Dois copilots separados: um de **vendas** (closers) e um de **onboarding** (novos colaboradores).
Tudo que os usuários sobem (documentos, copys, FAQs, objeções) alimenta os dois copilots.

---

## STACK

| Peça | Tecnologia | Config |
|------|-----------|--------|
| Framework | Next.js 14 (App Router, TypeScript) | `npx create-next-app@latest` |
| UI | Tailwind CSS + shadcn/ui | Componentes: button, card, input, textarea, select, dialog, sheet, toast, badge, tabs, table, dropdown-menu |
| Auth | Supabase Auth (email + senha) | `@supabase/ssr` |
| Database | Supabase (PostgreSQL + RLS + Realtime) | |
| AI | **Groq API** (openai/gpt-oss-120b) | `GROQ_API_KEY` — compatível com formato OpenAI |
| Deploy | Vercel | Conectado ao GitHub |
| Icons | lucide-react | |
| Markdown | react-markdown + remark-gfm | Para renderizar respostas do copilot |
| Datas | date-fns | |

### Env vars (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GROQ_API_KEY=
```

### Chamada à Groq API (formato OpenAI-compatible)

```typescript
// lib/ai/groq-client.ts
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'openai/gpt-oss-120b',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 1,
    max_completion_tokens: 8192,
    top_p: 1,
    reasoning_effort: 'medium',
    stream: true,
    stop: null,
  }),
});
```

---

## ESTRUTURA DE PASTAS

```
copilot-medreview/
├── app/
│   ├── layout.tsx                    # Layout raiz (sidebar + header)
│   ├── page.tsx                      # Redirect → /dashboard
│   ├── login/page.tsx                # Auth
│   ├── dashboard/page.tsx            # Métricas + resumo
│   ├── copilot-vendas/page.tsx       # Chat — Copilot de Vendas
│   ├── copilot-onboarding/page.tsx   # Chat — Copilot de Onboarding
│   ├── logs/page.tsx                 # Registro de atividades
│   ├── copys/page.tsx                # Copys & Macros
│   ├── faq/page.tsx                  # FAQ interno + clientes
│   ├── objecoes/page.tsx             # Matriz de objeções
│   ├── kb/page.tsx                   # Knowledge Base (admin)
│   ├── leads/page.tsx                # Hot Leads
│   ├── priorities/page.tsx           # Prioridades semanais (gestor)
│   ├── onboarding-config/page.tsx    # Config do onboarding (gestor)
│   ├── settings/page.tsx             # Configurações do perfil
│   └── api/
│       ├── copilot-vendas/route.ts   # POST — Motor IA vendas
│       ├── copilot-onboarding/route.ts # POST — Motor IA onboarding
│       ├── logs/route.ts
│       └── leads/route.ts
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── mobile-nav.tsx
│   ├── chat/
│   │   ├── chat-window.tsx           # Compartilhado entre os dois copilots
│   │   ├── mode-selector.tsx         # Chips de modo (só vendas)
│   │   ├── message-bubble.tsx
│   │   ├── feedback-buttons.tsx
│   │   ├── context-inspector.tsx
│   │   └── quote-card.tsx            # Card de orçamento estruturado
│   ├── dashboard/
│   ├── logs/
│   ├── copys/
│   ├── faq/
│   ├── objecoes/
│   ├── kb/
│   └── leads/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── ai/
│   │   ├── groq-client.ts           # Cliente Groq API
│   │   ├── vendas-engine.ts          # Motor do copilot de vendas
│   │   ├── onboarding-engine.ts      # Motor do copilot de onboarding
│   │   ├── vendas-prompt.ts          # System prompt vendas
│   │   ├── onboarding-prompt.ts      # System prompt onboarding
│   │   ├── context-builder.ts        # Busca contexto no Supabase
│   │   └── quote-builder.ts          # Monta orçamento estruturado
│   └── utils/
│       ├── constants.ts
│       └── types.ts
├── middleware.ts
└── CLAUDE.md                         # Este arquivo
```

---

## SIDEBAR

```
📊  Dashboard
🤖  Copilot Vendas          ← Chat de vendas (closers)
🎓  Copilot Onboarding      ← Chat de onboarding (novos)
🔥  Leads quentes
📝  Logs
✉️  Copys
❓  FAQ
🛡️  Objeções
📚  Knowledge Base           ← gestor only (edição)
🎯  Prioridades             ← gestor only
🎓  Config Onboarding       ← gestor only
⚙️  Configurações
```

Visibilidade por role:
- **closer:** Dashboard, Copilot Vendas, Leads, Logs, Copys, FAQ, Objeções, KB (leitura), Config
- **gestor:** Tudo
- **onboarding:** Dashboard, Copilot Onboarding, FAQ (leitura), KB (leitura), Config

---

## BANCO DE DADOS (Supabase)

### Todas as tabelas

```sql
-- ══════════════════════════════════════
-- 1. PROFILES
-- ══════════════════════════════════════
create table profiles (
  id uuid references auth.users(id) primary key,
  name text not null,
  role text check (role in ('closer', 'gestor', 'onboarding')) default 'closer',
  vertical_focus text,
  phone text,
  whatsapp_link text,
  default_greeting text,
  style_notes text,          -- tom de voz preferido do closer
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-criar profile no signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ══════════════════════════════════════
-- 2. DAILY_LOGS
-- ══════════════════════════════════════
create table daily_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_name text not null,
  lead_email text,
  lead_phone text,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop')) not null,
  lead_stage text check (lead_stage in ('Novo', 'Warm', 'Quente')),
  event_type text check (event_type in ('conversa', 'objeção', 'win', 'loss', 'feedback')) not null,
  description text,
  objection_topic text,
  response_used text,
  result text check (result in ('win', 'loss', 'open')),
  product_discussed text,
  notes text
);

-- ══════════════════════════════════════
-- 3. HOT_LEADS
-- ══════════════════════════════════════
create table hot_leads (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  crm_id text,
  name text not null,
  email text,
  phone text,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop')),
  stage text check (stage in ('Novo', 'Warm', 'Quente', 'Proposta', 'Closed-Won', 'Closed-Lost')),
  product_interest text,
  objection_main text,
  last_contact timestamptz,
  next_action text,
  next_action_date date,
  assigned_to uuid references auth.users(id),
  notes text
);

-- ══════════════════════════════════════
-- 4. KNOWLEDGE_BASE
-- ══════════════════════════════════════
create table knowledge_base (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  category text check (category in (
    'produto', 'playbook', 'objeção-resposta', 'regra-comercial',
    'diferencial', 'faq', 'template-followup', 'case-sucesso', 'script-copy'
  )) not null,
  vertical text,
  title text not null,
  content text not null,
  tags text[],
  source_type text check (source_type in ('texto', 'documento', 'audio', 'video')) default 'texto',
  source_url text,
  is_active boolean default true,
  updated_by text
);

-- ══════════════════════════════════════
-- 5. PRIORITIES
-- ══════════════════════════════════════
create table priorities (
  id uuid default gen_random_uuid() primary key,
  week_of date not null,
  verticals_in_focus jsonb,
  trending_objections jsonb,
  rule_changes jsonb,
  points_of_attention jsonb,
  learnings jsonb,
  updated_at timestamptz default now(),
  updated_by text
);

-- ══════════════════════════════════════
-- 6. CONVERSATIONS
-- ══════════════════════════════════════
create table conversations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  user_id uuid references auth.users(id),
  copilot_type text check (copilot_type in ('vendas', 'onboarding')) not null,
  mode text,
  lead_context jsonb,
  messages jsonb not null,
  context_used jsonb,
  satisfaction_rating int,
  feedback_text text
);

-- ══════════════════════════════════════
-- 7. OBJECTION_PATTERNS
-- ══════════════════════════════════════
create table objection_patterns (
  id uuid default gen_random_uuid() primary key,
  topic text not null,
  definition text,
  real_meaning text,        -- o que o lead realmente quer dizer
  vertical text,
  recommended_response text,
  what_not_to_say text,
  proof_points text,        -- dados/cases pra reforçar
  times_seen_total int default 0,
  win_rate numeric(5,2),
  winning_responses jsonb,
  losing_responses jsonb,
  updated_at timestamptz default now()
);

-- ══════════════════════════════════════
-- 8. USER_COPYS
-- ══════════════════════════════════════
create table user_copys (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
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
  is_active boolean default true
);

create index idx_copys_user on user_copys(user_id);
create index idx_copys_category on user_copys(category);

-- ══════════════════════════════════════
-- 9. FAQ_ITEMS (NOVO)
-- ══════════════════════════════════════
create table faq_items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  faq_type text check (faq_type in ('interno', 'cliente')) not null,
  question text not null,
  answer text not null,
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop', 'Geral')),
  category text,            -- ex: 'preço', 'acesso', 'método', 'prova'
  created_by uuid references auth.users(id),
  created_by_name text,
  status text check (status in ('rascunho', 'validado')) default 'rascunho',
  validated_by uuid references auth.users(id),
  is_active boolean default true
);

create index idx_faq_type on faq_items(faq_type);
create index idx_faq_status on faq_items(status);

-- ══════════════════════════════════════
-- 10. QUOTE_EXAMPLES (NOVO — orçamentos modelo)
-- ══════════════════════════════════════
create table quote_examples (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  vertical text check (vertical in ('R1', 'Anest', 'Oft', 'Ortop')) not null,
  product text not null,
  context text,              -- situação do lead
  quote_text text not null,  -- o orçamento completo como foi enviado
  result text check (result in ('win', 'loss', 'pending')),
  created_by uuid references auth.users(id),
  notes text
);

-- ══════════════════════════════════════
-- 11. ONBOARDING_CONFIG (NOVO — gestor configura o onboarding)
-- ══════════════════════════════════════
create table onboarding_config (
  id uuid default gen_random_uuid() primary key,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id),

  -- Trilha de aprendizado (sequência de temas)
  trail jsonb not null default '[]',
  -- Formato: [{"order": 1, "title": "Conhecer a empresa", "description": "...", "kb_docs": ["id1","id2"], "quiz_questions": ["..."]}, ...]

  -- System prompt customizado pelo gestor
  custom_instructions text,  -- instruções extras que o gestor quer no prompt do onboarding
  welcome_message text,      -- mensagem de boas-vindas personalizada
  tone text default 'didático e acolhedor',

  -- Regras
  max_complexity text check (max_complexity in ('basico', 'intermediario', 'avancado')) default 'basico',
  focus_verticals text[]     -- quais verticais o onboarding deve focar
);

-- ══════════════════════════════════════
-- VIEWS
-- ══════════════════════════════════════
create view weekly_stats as
select
  count(*) as total,
  count(*) filter (where event_type = 'conversa') as conversas,
  count(*) filter (where event_type = 'win') as wins,
  count(*) filter (where event_type = 'loss') as losses,
  count(*) filter (where event_type = 'objeção') as objecoes,
  count(*) filter (where result = 'open') as em_aberto
from daily_logs
where created_at >= date_trunc('week', now());

create view trending_objections as
select
  objection_topic,
  count(*) as qtd,
  count(*) filter (where result = 'win') as wins,
  count(*) filter (where result = 'loss') as losses
from daily_logs
where event_type = 'objeção'
  and created_at >= date_trunc('week', now())
  and objection_topic is not null
group by objection_topic
order by qtd desc;
```

### RLS (habilitar em TODAS as tabelas)

```sql
alter table profiles enable row level security;
alter table daily_logs enable row level security;
alter table hot_leads enable row level security;
alter table knowledge_base enable row level security;
alter table priorities enable row level security;
alter table conversations enable row level security;
alter table objection_patterns enable row level security;
alter table user_copys enable row level security;
alter table faq_items enable row level security;
alter table quote_examples enable row level security;
alter table onboarding_config enable row level security;

-- Políticas essenciais (aplicar para cada tabela conforme necessidade):
-- profiles: cada um vê/edita o seu; gestor vê todos
-- daily_logs: cada um insere e vê os seus; gestor vê todos
-- hot_leads: todos veem; assigned ou gestor editam
-- knowledge_base: todos leem; gestor edita
-- user_copys: cada um gerencia as suas; compartilhadas visíveis a todos; gestor gerencia todas
-- faq_items: todos leem validados; todos podem criar rascunho; gestor valida
-- quote_examples: todos leem; todos podem inserir
-- onboarding_config: todos leem; gestor edita
-- conversations: cada um vê as suas
-- priorities: todos leem; gestor edita
-- objection_patterns: todos leem; gestor edita
```

---

## MÓDULOS E TELAS — DETALHAMENTO

### TELA: COPILOT VENDAS (`/copilot-vendas`)

Acesso: closer + gestor

**Mode Selector (8 chips):**
`/diagnose` `/objeção` `/proposta` `/produto` `/follow-up` `/regra` `/copys` `/livre`

**Chat com streaming.** Respostas renderizadas em Markdown com cards estruturados por modo.

**Orçamento estruturado (/proposta):**
Quando o closer pede um orçamento, o copilot:
1. Pergunta dados que faltam (nome do lead, produto, condição)
2. Consulta `quote_examples` da vertical para ver exemplos que deram certo
3. Gera o orçamento em formato estruturado (card visual com seções: Contexto, Solução, Entregáveis, Investimento, Diferenciais, Próximos Passos)
4. Renderiza como `<QuoteCard>` — componente visual copiável
5. Após o closer usar, pode marcar resultado (win/loss) que salva em `quote_examples`

**O sistema aprende orçamentos:** cada orçamento enviado e marcado como "win" entra na base de exemplos. O copilot prioriza o formato e a linguagem dos orçamentos que mais converteram.

**Botões em cada resposta:** 📋 Copiar | 👍 Útil | 👎 Ruim (abre campo feedback)

**Context Inspector:** collapsible — mostra fontes usadas

### TELA: COPILOT ONBOARDING (`/copilot-onboarding`)

Acesso: onboarding + gestor

**Sem mode selector** — o copilot guia automaticamente pela trilha definida pelo gestor.

**Comportamento:**
- Ao entrar, mostra progresso na trilha (barra de progresso + tema atual)
- O copilot é didático: explica conceitos, dá exemplos, faz quiz
- Ao final de cada tema, sugere o próximo
- Se o colaborador pergunta algo fora da trilha, responde e volta pro contexto

**System prompt do onboarding** é montado com:
- As `custom_instructions` do gestor (tabela `onboarding_config`)
- A trilha definida (com docs da KB vinculados a cada etapa)
- O `welcome_message` personalizado
- O tom definido pelo gestor

**O gestor controla tudo** via tela `/onboarding-config`:
- Define a trilha (ordem dos temas, docs vinculados, perguntas de quiz)
- Escreve instruções extras pro copilot (ex: "sempre dê exemplos de vendas reais", "foque na vertical Anest nas primeiras semanas")
- Define o tom e a mensagem de boas-vindas
- Define o nível de complexidade

### TELA: COPYS & MACROS (`/copys`)

Acesso: closer + gestor (onboarding só lê)

**3 tabs:** Minhas | Time | Buscar

Cada copy tem: título, categoria, vertical, mensagem com `{{variáveis}}`, quando usar, quando não usar.

Categoria "orcamento" — copys de orçamento/proposta que o closer usa frequentemente.

**O copilot de vendas consulta as copys** automaticamente quando o contexto bate.

### TELA: FAQ (`/faq`)

Acesso: todos

**2 tabs:** Interno (comercial) | Clientes

Qualquer closer pode criar uma FAQ (status: rascunho). O gestor valida (status: validado). O copilot só usa FAQs validadas como fonte.

Campos: pergunta, resposta, vertical, categoria, quem criou, status.

### TELA: OBJEÇÕES (`/objecoes`)

Acesso: todos (edição: gestor)

**Matriz visual:** cards por objeção com tema, significado real, resposta recomendada, o que NÃO dizer, win rate, proof points.

Alimentada por: base estática (`objecoes.md` importado) + dados vivos dos `daily_logs`.

### TELA: KB (`/kb`)

Acesso: gestor edita, todos leem

Upload de documentos (PDF, MD, TXT). Editor Markdown com preview. Classificação por categoria + vertical + tags.

### TELA: CONFIG ONBOARDING (`/onboarding-config`)

Acesso: gestor only

**Editor de trilha:** lista ordenável de temas. Cada tema tem título, descrição, docs da KB vinculados, perguntas de quiz.

**Instruções extras:** textarea onde o gestor escreve direcionamentos pro copilot de onboarding.

**Tom e mensagem de boas-vindas:** campos editáveis.

---

## PALETA E DESIGN — Estilo Lovable (friendly, moderno, limpo)

### Filosofia visual
O sistema deve parecer uma ferramenta moderna de produtividade — clean, acolhedor, com bastante respiro visual. NÃO parecer um dashboard corporativo pesado. Inspiração: Lovable, Linear, Notion.

### Cores

```css
/* Primárias */
--primary: #6366F1;           /* Indigo suave — botões, links, ações */
--primary-hover: #4F46E5;
--primary-light: #EEF2FF;     /* Background de badges, highlights */

/* Backgrounds */
--bg-page: #F9FAFB;           /* Fundo geral da página */
--bg-card: #FFFFFF;            /* Cards e containers */
--bg-sidebar: #1E1B4B;        /* Sidebar escura com tom indigo */
--bg-sidebar-hover: #312E81;
--bg-sidebar-active: #4338CA;

/* Texto */
--text-primary: #111827;
--text-secondary: #6B7280;
--text-muted: #9CA3AF;
--text-sidebar: #C7D2FE;
--text-sidebar-active: #FFFFFF;

/* Bordas */
--border: #E5E7EB;
--border-light: #F3F4F6;

/* Status */
--success: #10B981;
--success-light: #ECFDF5;
--warning: #F59E0B;
--warning-light: #FFFBEB;
--danger: #EF4444;
--danger-light: #FEF2F2;
--info: #6366F1;
--info-light: #EEF2FF;

/* Verticais (identidade de cor por vertical) */
--anest: #8B5CF6;    /* Roxo */
--oft: #06B6D4;      /* Cyan */
--ortop: #F97316;    /* Laranja */
--r1: #3B82F6;       /* Azul */
```

### Tipografia
- Font: `Inter` (importar do Google Fonts) — fallback: system-ui, sans-serif
- Títulos de página: 24px, font-weight 600, color text-primary
- Subtítulos: 14px, font-weight 400, color text-secondary
- Body: 14px, line-height 1.6
- Labels: 12px, font-weight 500, uppercase, letter-spacing 0.05em, color text-muted
- Botões: 14px, font-weight 500

### Componentes

**Cards:**
- Background: white
- Border: 1px solid var(--border)
- Border-radius: 12px (não 8px — mais arredondado = mais amistoso)
- Padding: 20px 24px
- Shadow: `0 1px 3px rgba(0,0,0,0.04)` (sutil, quase invisível)
- Hover (se clicável): shadow `0 4px 12px rgba(0,0,0,0.08)`, transition 200ms

**Sidebar:**
- Background: gradiente sutil de #1E1B4B → #312E81
- Items: padding 10px 16px, border-radius 8px
- Ativo: background var(--bg-sidebar-active), text white, font-weight 500
- Hover: background var(--bg-sidebar-hover)
- Ícones: 20px, stroke-width 1.5
- Logo no topo: texto "MED-REVIEW" em branco, subtítulo "COPILOT" em indigo-300
- Largura: 240px (desktop), bottom nav (mobile)

**Botões:**
- Primário: bg var(--primary), text white, border-radius 8px, padding 8px 16px, hover var(--primary-hover), transition 150ms, hover scale(1.01)
- Secundário: bg transparent, border 1px solid var(--border), text text-primary, hover bg gray-50
- Ghost: bg transparent, no border, text text-secondary, hover bg gray-50
- Destructive: bg danger-light, text danger, hover bg danger text white

**Inputs:**
- Border: 1px solid var(--border)
- Border-radius: 8px
- Padding: 8px 12px
- Focus: ring 2px var(--primary) com opacity 0.2
- Placeholder: color text-muted

**Badges:**
- Border-radius: 9999px (pill)
- Padding: 2px 10px
- Font-size: 12px
- Variantes: cada vertical tem sua cor (anest = roxo, oft = cyan, ortop = laranja, r1 = azul) com bg light e text dark da mesma família

**Tabs:**
- Style: underline (não filled)
- Ativo: border-bottom 2px var(--primary), text var(--primary), font-weight 500
- Inativo: text text-secondary
- Gap entre tabs: 24px

**Métricas (stat cards):**
- Label: 12px uppercase muted
- Valor: 28px font-weight 600
- Ícone ao lado do valor (lucide, 20px, color muted)
- Background: white card com borda sutil

**Chat (Copilot):**
- Mensagem do user: bg var(--primary-light), align right, border-radius 16px 16px 4px 16px
- Mensagem do copilot: bg white, border 1px var(--border), align left, border-radius 16px 16px 16px 4px
- Input: sticky no fundo, textarea com auto-resize, botão enviar circular com ícone Send
- Mode selector (vendas): chips horizontais com scroll, bg gray-100, active bg primary text white, border-radius pill

**Transições:**
- Todos os hovers: transition 150ms ease
- Sidebar items: transition 200ms
- Cards clicáveis: hover com shadow crescendo suavemente
- Toasts: slide-in da direita

### Spacing
- Page padding: 24px (desktop), 16px (mobile)
- Gap entre cards: 16px
- Gap entre seções: 32px
- Sidebar padding lateral: 12px

### Responsividade
- Desktop: sidebar 240px + conteúdo fluid
- Tablet (<1024px): sidebar collapsa pra ícones (64px)
- Mobile (<768px): sidebar vira bottom nav com 5 itens (Dash, Vendas, Onboarding, Copys, Menu)
- Cards de métricas: 4 colunas → 2 colunas (mobile)

### Dark mode
NÃO implementar agora. Focar no light mode. Preparar com variáveis CSS pra facilitar no futuro.

---

## FASES DE CONSTRUÇÃO

**FASE 1:** Setup (Next.js + Supabase + Auth + tabelas)
**FASE 2:** Layout + Sidebar + Rotas + Login
**FASE 3:** Dashboard + Logs (dados reais)
**FASE 4:** Copilot Vendas (Groq API + 8 modos + orçamento estruturado)
**FASE 5:** Copilot Onboarding (motor separado + trilha + config gestor)
**FASE 6:** Copys & Macros
**FASE 7:** FAQ + Objeções
**FASE 8:** KB Admin + Priorities
**FASE 9:** Hot Leads + Settings
**FASE 10:** Polish + Deploy Vercel

---

> Este arquivo é a fonte de verdade. Claude Code segue este briefing.
