# Guia de Arquitetura RAG — Second Brain Med-Review

> Análise técnica completa do sistema de recuperação e geração aumentada.
> Como funciona, como alimentar e como extrair máxima performance.
> Versão 8.0 — Mai/2026

---

## Sumário

1. [O que é RAG e por que usamos](#1-o-que-é-rag-e-por-que-usamos)
2. [Pipeline completo](#2-pipeline-completo)
3. [Geração de Embeddings](#3-geração-de-embeddings)
4. [Detecção de Vertical](#4-detecção-de-vertical)
5. [As funções de busca e seus parâmetros](#5-as-funções-de-busca-e-seus-parâmetros)
6. [Produto como fonte primária](#6-produto-como-fonte-primária)
7. [O fallback e suas condições](#7-o-fallback-e-suas-condições)
8. [Montagem do contexto final](#8-montagem-do-contexto-final)
9. [O LLM e o system prompt](#9-o-llm-e-o-system-prompt)
10. [Como alimentar a base para máxima performance](#10-como-alimentar-a-base-para-máxima-performance)
11. [Diagnóstico de problemas de RAG](#11-diagnóstico-de-problemas-de-rag)
12. [Tabela de referência rápida](#12-tabela-de-referência-rápida)

---

## 1. O que é RAG e por que usamos

**RAG (Retrieval-Augmented Generation)** é uma técnica onde, antes de o LLM gerar a resposta, o sistema recupera documentos relevantes da base e os injeta no contexto. O LLM então responde com base nessas informações reais — não em memória de treinamento.

**Sem RAG:** o LLM inventa ou generaliza. Pergunta sobre "Extensivo Anest" → resposta genérica sobre anestesiologia.
**Com RAG:** o sistema busca o documento real do Extensivo Anest e o LLM responde com os dados exatos do produto.

No nosso caso, a base contém:
- Fichas completas de produtos (ICP, pitch, condições, objeções)
- Playbooks de venda e processos
- FAQs validadas pelo time
- Matriz de objeções com win rates
- Copys e templates do time
- Orçamentos que converteram (quotes)
- Provas, datas e eventos

O RAG garante que o Copilot fale sobre **o nosso** produto com **os nossos** dados — não sobre algo genérico.

---

## 2. Pipeline completo

```
[MENSAGEM DO USUÁRIO]
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Promise.all — Fase 1 (paralelo)                                │
│  ├── fetchVerdadeiroValor()   → fixedParts[]                   │
│  ├── fetchExamDates()         → fixedParts[]                   │
│  ├── fetchUpcomingEvents()    → fixedParts[]                   │
│  ├── generateEmbedding(msg)   → embedding[1536]                │
│  └── fetchUserProfile(userId) → profile                        │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
[detectVertical(msg) || profile.vertical_focus[0] || null]
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  Promise.all — Fase 2 (paralelo, todos com filter_vertical)    │
│                                                                  │
│  ├── matchProductsByKeyword()  ─→ productParts[]   [modo produto]│
│  ├── matchKb()                 ─→ ragParts[]        [sempre]    │
│  ├── matchFaq()                ─→ ragParts[]        [sempre]    │
│  ├── matchObjections()         ─→ ragParts[]   [modo objeção]   │
│  ├── matchCopys()              ─→ ragParts[]   [modo follow-up/ │
│  │                                              proposta/copys] │
│  └── matchQuotes()             ─→ ragParts[]   [modo proposta]  │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
[sources.length < 2 || !kbFound?]
  SIM → fallbackTextSearch() → ragParts[]
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│  buildFinalContext()                                            │
│  allRagParts = [...productParts, ...ragParts]                   │
│  rag   = truncate(allRagParts, 8.000 chars)                    │
│  fixed = truncate(fixedParts,  4.000 chars)                    │
│  context = rag + "---" + fixed   (total ≤ 12.000 chars)        │
└─────────────────────────────────────────────────────────────────┘
        │
        ▼
[System Prompt + Contexto + Histórico + Mensagem]
        │
        ▼
[OpenAI gpt-4o-mini] → timeout 15s → [Groq llama-3.3-70b fallback]
        │
        ▼
[SSE stream → cliente]
```

---

## 3. Geração de Embeddings

**Modelo:** OpenAI `text-embedding-3-small` (1536 dimensões)
**Similaridade:** cosseno (cos similarity)

### Como funciona

Quando um documento é salvo, o sistema gera um vetor de 1536 números que representa o **significado semântico** daquele texto. Quando o usuário faz uma pergunta, o sistema gera um vetor da pergunta e calcula a similaridade com todos os documentos da base.

Documentos com significado próximo têm vetores próximos no espaço vetorial — mesmo que as palavras sejam diferentes.

**Exemplo:**
- Documento: "O Extensivo Anest tem aprovação acima de 80% no TEA"
- Pergunta: "Qual a taxa de sucesso dos alunos de anestesia?"
- Similaridade ≈ 0.78 → documento recuperado

### Embeddings automáticos

Após salvar em qualquer tabela da allowlist, o sistema chama `/api/embeddings` automaticamente (fire-and-forget):

```
Tabelas com embedding:
├── knowledge_base       → conteúdo completo
├── faq_items            → question + answer
├── objection_patterns   → topic + recommended_response
├── user_copys           → title + message_text
├── quote_examples       → context + quote_text
└── whatsapp_templates   → copy_text
```

Se o embedding falhar (timeout de API), o documento fica com `embedding = NULL`. Nesses casos:
- Não aparece em buscas vetoriais
- Pode ser recuperado pelo fallback ILIKE (apenas knowledge_base)
- Solução: reprocessar o embedding manualmente via `/api/embeddings`

### Dimensão e custo

`text-embedding-3-small` tem 1536 dimensões e é extremamente barato (~$0.02 por 1M tokens). Para todos os fins práticos, o custo de embedding é negligenciável.

---

## 4. Detecção de Vertical

O sistema detecta a vertical do lead ou do assunto automaticamente para filtrar documentos relevantes.

### Ordem de prioridade

```
1. Detecção por keyword na mensagem (detectVertical)
2. vertical_focus do perfil do usuário (primeira da lista)
3. null → busca em todas as verticais
```

### Keywords mapeadas

```typescript
Anest: ['anest', 'anestesiologia', 'tea']
Oft:   ['oft', 'oftalmologia', 'cbo']
Ortop: ['ortop', 'ortopedia', 'taro']
R1:    ['r1', 'residência', 'residencia', 'revalida']
```

### Filtro nas buscas vetoriais

```sql
AND (
  filter_vertical IS NULL       -- sem filtro → traz tudo
  OR p.vertical = filter_vertical  -- vertical exata
  OR p.vertical IS NULL         -- documentos sem vertical → sempre aparecem
  OR p.vertical = 'Geral'       -- documentos gerais → sempre aparecem
)
```

**Consequência prática:** Documentos com `vertical = NULL` ou `vertical = 'Geral'` aparecem para qualquer vertical. Use isso para conteúdo que se aplica a todas as verticais (playbooks gerais, regras comerciais, processos).

### Configuração do perfil

Em Configurações, o campo `vertical_focus` aceita múltiplas verticais ("R1,Anest"). O sistema usa a primeira como fallback quando nenhuma keyword é detectada na mensagem.

**Implicação:** Um closer de R1 que pergunta "qual o melhor argumento para fechar?" → vertical = R1 → o sistema prioriza documentos de R1 nos resultados.

---

## 5. As funções de busca e seus parâmetros

Todas são funções RPC no Supabase com pgvector. Rodam em paralelo na Fase 2.

### 5.1 match_knowledge_base

```
Threshold: 0.45
Match count: 5
Ativação: sempre
Output: ragParts[]
```

A busca principal. Cobre todos os tipos de documento: produtos, playbooks, técnicas, regras, diferenciais. Retorna até 5 documentos com similaridade ≥ 0.45.

**Retorna boolean (`kbFound`)** — se nenhum documento for encontrado (`kbFound = false`), o fallback é acionado independentemente da quantidade de outras sources.

### 5.2 match_faq

```
Threshold: 0.50
Match count: 3
Ativação: sempre
Output: ragParts[]
```

FAQs têm threshold maior (0.50) porque são respostas validadas — só devem aparecer quando realmente relevantes. Cada FAQ no contexto exibe sua relevância: `[relevância: 87%]`. O LLM prioriza FAQs com > 80%.

**Atenção:** apenas FAQs com `status = 'validado'` e `is_active = true` entram na busca.

### 5.3 match_objections

```
Threshold: 0.45
Match count: 4
Ativação: modo "objeção"
Output: ragParts[]
Extra: busca user_objection_responses do closer
```

Além da objeção padrão, busca a resposta pessoal do closer (`user_objection_responses`). Se o closer tiver uma resposta salva para aquela objeção específica, ela aparece como "Resposta pessoal do closer" no contexto.

### 5.4 match_copys

```
Threshold: 0.45
Match count: 4
Ativação: modo follow-up, proposta, copys
Output: ragParts[]
Extra: filter_user_id para priorizar copys do próprio closer
```

Busca copys do time. O `filter_user_id` faz com que copys do próprio closer e copys compartilhadas (`is_shared = true`) apareçam com prioridade.

### 5.5 match_quotes

```
Threshold: 0.40
Match count: 3
Ativação: modo proposta
Output: ragParts[]
```

Orçamentos que já foram apresentados e marcados como Win ou Loss. Threshold mais baixo (0.40) porque exemplos concretos são valiosos mesmo com similaridade menor. O LLM usa como referência de formato e argumentação.

---

## 6. Produto como fonte primária

### O problema que resolvemos

A busca vetorial falha para nomes próprios. "Extensivo Anest" como embedding tem baixa similaridade com a pergunta "me fala sobre o extensivo anest" porque o modelo representa o significado semântico, não o texto literal. O resultado: o documento do produto não era encontrado.

### A solução: matchProductsByKeyword

```typescript
async function matchProductsByKeyword(supabase, message, productParts, sources, vertical) {
  // 1. Extrai keywords filtrando STOP_WORDS e palavras < 4 chars
  const keywords = message.toLowerCase()
    .replace(/[^\w\sáéíóúãõâêôàü]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOP_WORDS.has(w))

  // 2. Busca no título (não no conteúdo) com ILIKE
  const orConditions = keywords.map(w => `title.ilike.%${w}%`).join(',')

  // 3. Filtro: só produtos ativos da vertical detectada
  query = supabase
    .from('knowledge_base')
    .select('id, title, content, vertical')
    .eq('category', 'produto')
    .eq('is_active', true)
    .or(orConditions)

  // 4. Popula productParts[] — array separado
  parts.push(`## Produto\n\n${text}`)
  sources.push({ id, title, similarity: 1 })  // similarity: 1 = máxima prioridade
}
```

### Por que popula um array separado?

```typescript
// Fase 2 — paralelo:
const productParts: string[] = []
const ragParts:   string[] = []

// matchProductsByKeyword → productParts
// matchKb + matchFaq + outros → ragParts

// Montagem final:
const allRagParts = [...productParts, ...ragParts]
//                    ↑ produto PRIMEIRO no contexto
```

O LLM processa o contexto linearmente. O que aparece primeiro tem mais peso. Com `productParts` na frente, o documento do produto é o primeiro bloco que o LLM lê — ele é tratado como fonte primária antes de qualquer outra informação.

### STOP_WORDS

```typescript
const STOP_WORDS = new Set([
  'com', 'por', 'uma', 'um', 'que', 'para', 'sobre', 'falar', 'gerar', 'mais',
  'como', 'seu', 'sua', 'dos', 'das', 'nos', 'nas', 'num', 'numa', 'este',
  'essa', 'esse', 'isto', 'isso', 'aqui', 'ali', 'quando', 'onde', 'qual',
  'quem', 'copy', 'copys', 'texto', 'fazer', 'quero', 'pedir', 'dizer', 'ver',
  'pode', 'preciso', 'favor', 'obrigado', 'boa', 'bom', 'certo',
])
```

Filtrar stop words antes da busca ILIKE evita queries amplas demais que retornam documentos irrelevantes.

### Regra no system prompt

```
PRIORIDADE DE FONTE NO MODO PRODUTO:
Quando o contexto contiver uma seção "## Produto", use esse bloco como fonte primária e definitiva.
Dados de FAQ e base de conhecimento são complementares — não contradiga nem substitua o que está em "## Produto".
```

---

## 7. O fallback e suas condições

### Quando o fallback é acionado

```typescript
if (sources.length < 2 || !kbFound) {
  await fallbackTextSearch(supabase, message, ragParts, sources)
}
```

**Duas condições independentes:**
- `sources.length < 2`: menos de 2 fontes encontradas no total
- `!kbFound`: a busca vetorial na KB não retornou nada (mesmo que outras sources existam)

### Como funciona o fallback

```sql
-- search_knowledge_base_text
SELECT * FROM knowledge_base
WHERE content ILIKE '%' || search_query || '%'
   OR title ILIKE '%' || search_query || '%'
LIMIT 3
```

Busca textual simples. Não tem filtro de vertical. Retorna os 3 primeiros documentos que contêm qualquer parte da query. É menos preciso que a busca vetorial mas garante que algum conteúdo chegue ao LLM.

### Limitação do fallback original

A primeira implementação usava a mensagem inteira como query ILIKE. Uma mensagem como "me fala sobre o extensivo anest e gera uma copy de follow-up" não encontrava nada porque o banco não tem documentos com esse texto exato. **Esse é o motivo pelo qual `matchProductsByKeyword` foi criado** — busca por keywords extraídas, não pela mensagem completa.

---

## 8. Montagem do contexto final

### Separação RAG vs Fixo

```
ragParts  (8.000 chars máx) → conteúdo dinâmico da busca
fixedParts (4.000 chars máx) → dados sempre presentes
total ≤ 12.000 chars
```

**fixedParts sempre contém:**
1. Verdadeiro Valor + Big Numbers
2. Datas de provas ativas (próximas e recentes)
3. Eventos dos próximos 30 dias

**ragParts contém** (variável por modo):
- `## Produto` (se modo produto e produto encontrado)
- `## Base de Conhecimento`
- `## FAQ`
- `## Matriz de Objeções` (modo objeção)
- `## Copys do Time` (modo follow-up/proposta/copys)
- `## Orçamentos que Converteram` (modo proposta)

### Truncagem inteligente

```typescript
function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const cut = text.lastIndexOf('.', maxChars)
  return cut > maxChars * 0.8
    ? text.slice(0, cut + 1)    // corta no último ponto completo
    : text.slice(0, maxChars) + '…'  // corta no limite se não achar ponto
}
```

A truncagem corta no último ponto antes do limite, preservando frases completas. Evita cortar uma informação no meio de uma frase.

### Ordem no contexto

```
[## Produto]            ← primário (se modo produto)
[## Base de Conhecimento]
[## FAQ]
[## Matriz de Objeções] ← só modo objeção
[## Copys do Time]      ← só modo follow-up/proposta/copys
[## Orçamentos]         ← só modo proposta
---
[VERDADEIRO VALOR + BIG NUMBERS]
[DATAS DE PROVAS]
[EVENTOS PRÓXIMOS]
```

O LLM lê de cima para baixo. Produto aparece antes de tudo. Verdadeiro Valor e dados fixos aparecem depois do RAG para não tomar espaço dos documentos dinâmicos.

---

## 9. O LLM e o system prompt

### Hierarquia de modelos

```
gpt-4o-mini (OpenAI) — primário, timeout 15s
      ↓ se falhar
llama-3.3-70b-versatile (Groq) — fallback
```

**callLLMStream:** chat em tempo real (SSE). Usado nos copilots.
**callLLMJson:** retorna JSON estruturado. Usado no `process-document`.

### Estrutura do system prompt de Vendas

O prompt tem seções fixas e uma seção dinâmica de contexto:

```
1. IDENTIDADE — quem é o Copilot, com quem fala, o que não faz
2. REGRAS — nunca inventar, citar fontes, avisar lacunas
3. DIFERENCIAIS DA MED-REVIEW — conhecimento geral fixo
4. CONTEXTO QUE VOCÊ RECEBE E COMO USAR
   ├── Verdadeiro Valor + Big Numbers
   ├── Datas de Provas
   ├── Eventos
   ├── Base de Conhecimento (RAG)
   ├── FAQ (regra: > 80% relevância = prioridade)
   ├── Objeções
   ├── Copys do Time
   └── Perfil do Closer
5. PERSONALIZAÇÃO — nome, tom, vertical (do perfil)
6. COMO RESPONDER — 6 intenções com formato esperado
7. REGRA DE SEPARAÇÃO DE PRODUTOS — nunca misturar
8. REGRA DE LACUNA — sinalizar com 🔴 o que falta
9. PRIORIDADE DE FONTE NO MODO PRODUTO — ## Produto é primário
10. MODO ATUAL + FORMATO ESPERADO
11. CONTEXTO RELEVANTE — o contexto RAG injetado
```

### FAQ com score de relevância

Cada FAQ no contexto aparece assim para o LLM:

```
**Q:** Qual o prazo de inscrição do TEA? [relevância: 89%]
**A:** As inscrições abertas até 30/06/2026. ...
```

O LLM é instruído: se relevância > 80%, priorize essa resposta sobre qualquer outra. Isso garante que perguntas com resposta validada usem a resposta certa, não uma gerada livremente.

---

## 10. Como alimentar a base para máxima performance

Esta é a seção mais importante para quem mantém o sistema.

### 10.1 Princípio fundamental

> O RAG só sabe o que está na base. Se o documento não existe, a resposta será genérica ou terá lacuna. Se o documento existe mas está mal escrito, a resposta vai reproduzir a imprecisão.

**Máxima:** garbage in, garbage out. Qualidade de conteúdo = qualidade de resposta.

### 10.2 Como escrever documentos para máximo recall

**Nomeie o produto no título exatamente como o time fala.**
O `matchProductsByKeyword` busca por keyword no título. Se o produto se chama "Extensivo Anest" mas está cadastrado como "Extensivo Anestesiologia 2026 TEA", perguntas sobre "extensivo anest" não vão encontrar.

```
✅ "Extensivo Anest"
❌ "Produto Premium Anestesiologia - Ciclo 2026"
```

**Inclua todas as variações de nome no início do conteúdo.**
Embeddings dependem do texto. Se o produto tem apelido, inclua no documento:

```markdown
# Extensivo Anest
Também chamado de: Extensivo Anestesiologia, Extensivo TEA, EA.
```

**Use linguagem do usuário, não da empresa.**
O embedding compara a pergunta do closer com o documento. Se o closer pergunta "quando indicar pra médico com pouco tempo" e o documento diz "indicado para profissionais com restrição de disponibilidade horária", a similaridade cai.

```
✅ "Ideal para médico com pouco tempo de estudo"
❌ "Indicado para profissionais com restrição de disponibilidade horária"
```

**Repita conceitos-chave em contextos diferentes.**
Um documento que menciona "TEA" uma vez tem vetor menos robusto que um que menciona "TEA", "Título de Especialista em Anestesiologia" e "prova de anestesia" em diferentes parágrafos.

### 10.3 Estrutura ideal de uma ficha de produto

```markdown
# [Nome do Produto]
Também chamado de: [apelidos, siglas]

## O que é
[2-3 linhas diretas: o produto, para quem, o que entrega]

## Para quem é (ICP)
- [Perfil 1: médico X em situação Y]
- [Perfil 2: médico X em situação Z]

## O que inclui
- [Item 1]
- [Item 2]

## Quando indicar
- Lead a X meses da prova
- Lead que já tentou Y vezes
- [Situações específicas]

## Quando NÃO indicar
- [Contra-indicações claras]

## Pitch de 30 segundos
"[Script exato]"

## Objeções comuns
**"É caro"** → [Resposta validada]
**"Não tenho tempo"** → [Resposta validada]

## Condições comerciais
- Preço: R$ X
- Parcelamento: até Xх
- Bônus atual: [o que está ativo]
- Desconto máximo sem aprovação: X%

## Diferenciais vs concorrência
- [Diferencial 1]
- [Diferencial 2]
```

### 10.4 Regras para FAQs de alto impacto

FAQs são a fonte de mais alta prioridade quando relevância > 80%. Invista nelas.

**Escreva a pergunta como o lead ou o closer realmente faz.**
```
✅ "Posso parcelar no cartão de crédito?"
❌ "Quais são as condições de pagamento disponíveis para aquisição dos produtos?"
```

**A resposta deve ser completa e autossuficiente.**
O LLM vai copiar a resposta da FAQ se relevância for alta. Uma resposta vaga vira uma resposta vaga do Copilot.

```
✅ "Sim, aceitamos parcelamento em até 12x sem juros no cartão de crédito. O processamento é feito via [plataforma] e a confirmação chega em até 2 dias úteis."
❌ "Sim, aceitamos cartão."
```

**Crie FAQs para as 20 perguntas mais frequentes de cada vertical.**
Prioridade: perguntas sobre preço, prazo, acesso, o que inclui, aprovação, comparativo com concorrentes.

**Valide todas as FAQs.** Rascunho não entra no RAG. Se você criou e esqueceu de validar, o Copilot não usa.

### 10.5 Regras para objeções

```
Cada objeção deve ter:
✅ Frase exata como o lead fala (topic/definition)
✅ O que realmente significa (real_meaning)
✅ Script de resposta completo (recommended_response)
✅ O que nunca dizer (what_not_to_say)
✅ 2-3 pontos de prova (proof_points)
✅ Win rate estimado (win_rate)
```

O `win_rate` é injetado no contexto como `(win rate: 78%)`. O LLM usa isso para calibrar a confiança na resposta.

**Dica:** peça para os closers de melhor performance registrarem a resposta pessoal deles para cada objeção. A combinação resposta do time + resposta pessoal no contexto é muito mais efetiva.

### 10.6 Copys que enriquecem o RAG

Copys salvas no sistema (modo "Minhas" ou compartilhadas) são usadas pelo Copilot como referência de tom e estilo nos modos `follow-up`, `proposta` e `copys`.

**Salve copys que funcionaram de verdade.** "Quando usar" é o campo mais importante — ele orienta o Copilot sobre em qual situação recomendar aquela copy.

```
Quando usar: "Lead que pediu proposta mas sumiu há 3-5 dias. Perfil conservador."
```

### 10.7 Técnicas comerciais na KB

Documentos com `category = 'tecnica-comercial'` aparecem como Insight do Dia e entram no RAG geral. São uma das categorias com maior impacto de longo prazo.

Conteúdo ideal:
- Frameworks de diagnóstico
- Técnicas de fechamento com exemplos reais
- Scripts de rapport
- Estratégias de urgência (prova próxima, vagas, campanha)
- Como lidar com o "silêncio" do lead

### 10.8 Manutenção periódica recomendada

**Semanal:**
- Validar FAQs criadas como rascunho
- Checar se há documentos com `embedding = NULL` (não aparecem no RAG)

**Mensal:**
- Revisar fichas de produto (preços, bônus, condições mudam)
- Atualizar datas de provas e eventos na Agenda
- Rever objeções com baixo win rate — o script pode estar desatualizado

**A cada lançamento de produto:**
- Cadastrar ficha completa na KB com `category = 'produto'`
- Criar 5+ FAQs sobre o produto
- Adicionar 2-3 objeções específicas do produto na Matriz

---

## 11. Diagnóstico de problemas de RAG

### Sintoma: Copilot responde com informação genérica / "não tenho informações"

**Causas prováveis (em ordem de probabilidade):**

1. **Documento não existe na base.** Verifique em KB se o produto/tema está cadastrado.
2. **Embedding não foi gerado.** O documento existe mas `embedding IS NULL`. Solução: abra o documento e salve novamente para reprocessar o embedding.
3. **Threshold muito alto.** O documento existe e tem embedding mas a similaridade ficou abaixo de 0.45. Ocorre quando a pergunta usa vocabulário muito diferente do documento. Solução: reescrever o documento com linguagem mais próxima das perguntas reais.
4. **Documento não validado (FAQ).** FAQs com `status = 'rascunho'` não entram no RAG. Valide.
5. **Vertical errada.** O documento tem `vertical = 'Anest'` mas a pergunta não tem keyword de vertical e o perfil do usuário é de R1. O filtro de vertical exclui o documento. Solução: adicionar documentos com `vertical = NULL` para conteúdo geral.

### Sintoma: Copilot mistura informações de produtos diferentes

**Causa:** múltiplos produtos foram retornados pela busca vetorial e o LLM misturou.

**Solução:**
1. No modo `produto`, a mensagem deve mencionar o produto pelo nome exato
2. O `matchProductsByKeyword` vai buscar pelo título — nome exato = melhor resultado
3. A regra "REGRA DE SEPARAÇÃO DE PRODUTOS" no prompt instrui o LLM a usar só o produto perguntado

### Sintoma: Copilot usa informação desatualizada

**Causa:** documento não foi atualizado após mudança de preço/condição.

**Solução:** sempre atualize a ficha do produto na KB quando houver mudança. Depois de salvar, o sistema regenera o embedding automaticamente.

### Sintoma: FAQ correta não aparece na resposta

**Causas:**
1. FAQ tem `status = 'rascunho'` → validar
2. FAQ tem `is_active = false` → reativar
3. Relevância da FAQ ficou abaixo de 80% → melhorar o texto da pergunta para ficar mais próximo de como as pessoas realmente perguntam

### Como inspecionar o RAG em produção

O sistema expõe as fontes usadas em cada resposta via SSE (`{ type: 'sources', sources: [...] }`). No cliente, as sources aparecem no painel lateral do chat. Verifique:
- Quais documentos foram usados
- Qual foi a similaridade de cada um
- Se o produto esperado aparece como source com `similarity: 1`

Se o produto não aparece como source, significa que `matchProductsByKeyword` não encontrou nada — provavelmente o título não tem a keyword usada na pergunta.

---

## 12. Tabela de referência rápida

### Thresholds de similaridade

| Função | Threshold | Match count | Ativação |
|--------|-----------|-------------|----------|
| match_knowledge_base | 0.45 | 5 | Sempre |
| match_faq | 0.50 | 3 | Sempre |
| match_objections | 0.45 | 4 | Modo objeção |
| match_copys | 0.45 | 4 | Modo follow-up/proposta/copys |
| match_quotes | 0.40 | 3 | Modo proposta |
| matchProductsByKeyword | — (ILIKE) | 2 | Modo produto |

### Limites de contexto

| Segmento | Limite |
|----------|--------|
| ragParts (total) | 8.000 chars |
| fixedParts (total) | 4.000 chars |
| Contexto total | 12.000 chars |
| Histórico de mensagens | Últimas 10 |

### Embedding por tabela

| Tabela | Campo embedado | Allowlist |
|--------|---------------|-----------|
| knowledge_base | content | ✅ |
| faq_items | question + answer | ✅ |
| objection_patterns | topic + recommended_response | ✅ |
| user_copys | title + message_text | ✅ |
| quote_examples | context + quote_text | ✅ |
| whatsapp_templates | copy_text | ✅ |
| profiles | — | ❌ |
| meus_leads | — | ❌ |

### Modos × fontes RAG ativadas

| Modo | KB | FAQ | Objeções | Copys | Quotes | Produto |
|------|:--:|:---:|:--------:|:-----:|:------:|:-------:|
| diagnose | ✅ | ✅ | — | — | — | — |
| produto | ✅ | ✅ | — | — | — | ✅ (primário) |
| objeção | ✅ | ✅ | ✅ | — | — | — |
| proposta | ✅ | ✅ | — | ✅ | ✅ | — |
| follow-up | ✅ | ✅ | — | ✅ | — | — |
| regra | ✅ | ✅ | — | — | — | — |
| copys | ✅ | ✅ | — | ✅ | — | — |
| livre | ✅ | ✅ | — | — | — | — |
| onboarding | ✅ | ✅ | — | — | — | — |

### Checklist de qualidade de documento

```
□ Título usa as palavras exatas que o time usa para falar do assunto
□ Inclui variações de nome / siglas no início do conteúdo
□ Linguagem próxima das perguntas reais dos closers
□ Informações completas (não depende de outro documento para fazer sentido)
□ Vertical definida corretamente (ou NULL se for geral)
□ Embedding gerado (não está NULL no banco)
□ Para FAQs: status = 'validado' e is_active = true
□ Para produtos: todos os 13 campos preenchidos
□ Para objeções: win_rate preenchido
```
