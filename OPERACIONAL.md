# Manual Operacional — Second Brain Med-Review

> Guia prático de operação: como subir produtos, configurar o sistema e usar o Copilot do jeito certo.
> Versão 1.0 — Mai/2026

---

## Parte 1 — Subindo Produtos na Base

Esta é a parte mais crítica. O Copilot responde com base nos documentos que você colocar. Um produto mal cadastrado gera respostas imprecisas. Um produto bem cadastrado gera respostas melhores do que qualquer closer conseguiria de memória.

---

### 1.1 Regra de ouro antes de começar

**Produtos são cadastrados pela Knowledge Base (`/kb`), não pelo Catálogo de Produtos (`/produtos`).**

O Catálogo de Produtos serve para *editar* produtos que já existem. Para *criar* um produto novo e garantir que o embedding seja rico e completo, vá em `/kb` e use o formulário com `categoria = produto`.

---

### 1.2 Como nomear o produto (crítico para o RAG)

O sistema busca produtos por palavras-chave no **título**. Se o título não tem as palavras que o closer vai usar, o produto não vai ser encontrado.

**Regra:** o título deve ser exatamente como o time chama o produto no dia a dia.

```
✅ Extensivo Anest
✅ Intensivo R1
✅ Extensivo Oft
✅ R1 Estratégico
✅ Revisão Ortop

❌ Curso Extensivo de Anestesiologia — Ciclo 2026/1
❌ Produto Premium Residência Médica
❌ Programa de Preparação TEA — Versão Plus
```

Se o produto tem apelidos ou siglas que o time usa, inclua-os **na primeira linha do conteúdo**:

```markdown
# Extensivo Anest
Também conhecido como: EA, Extensivo TEA, Extensivo Anestesiologia.
```

---

### 1.3 Template de produto — preencha campo a campo

Copie este template, preencha com as informações reais do produto e cole no campo de conteúdo da KB.

```markdown
# [NOME EXATO DO PRODUTO]
Também conhecido como: [apelidos, siglas que o time usa]

## O que é
[2-3 frases diretas: o que é o produto, para qual prova/objetivo, o que entrega de diferente]

## Para quem é (ICP — perfil ideal)
- [Perfil 1 — ex: médico formado, trabalhando, com pouco tempo de estudo]
- [Perfil 2 — ex: residente que vai tentar TEA pela segunda vez]
- [Perfil 3 — adicione quantos forem relevantes]

## Quem NÃO deve comprar
- [Contra-indicação 1 — ex: médico que acabou de se formar e tem bastante tempo]
- [Contra-indicação 2]

## O que inclui
- [Entregável 1]
- [Entregável 2]
- [Entregável 3]
- [Continue com todos os itens]

## Quando indicar esse produto
- Lead a X meses da prova
- Lead que já tentou Y vezes
- Lead com perfil Z
- [Situações específicas onde esse produto é a escolha certa]

## Pitch de 30 segundos
"[Escreva o script exato que o closer deve usar. Entre aspas. Como se estivesse falando com o lead agora.]"

## Argumentos de venda (do mais forte para o mais fraco)
1. [Argumento 1 — o mais poderoso]
2. [Argumento 2]
3. [Argumento 3]
4. [Continue]

## Objeções comuns e como responder
**"[Objeção 1 exatamente como o lead fala]"**
→ [Resposta validada pelo time]

**"[Objeção 2]"**
→ [Resposta]

**"[Objeção 3]"**
→ [Resposta]

[Adicione pelo menos 5 objeções reais]

## Condições comerciais
- Preço: R$ [valor]
- Parcelamento: até [X]x de R$ [valor] sem juros
- Desconto máximo sem aprovação do gestor: [X]%
- Bônus atual: [o que está ativo agora]
- Validade da oferta: [se aplicável]

## Diferenciais vs concorrência
- [Diferencial 1 — seja específico, não genérico]
- [Diferencial 2]
- [Diferencial 3]

## Taxa de aprovação / resultados
- [Dado real — ex: "87% de aprovação no TEA nos últimos 2 ciclos"]
- [Dado real 2]

## Notas internas (só o time vê)
- [Informação que não vai para o lead mas o closer precisa saber]
- [Ex: "não oferecer junto com produto X — são concorrentes internos"]
```

---

### 1.4 Passo a passo para cadastrar um produto

**Passo 1 — Abra a Knowledge Base**
Navegue para `/kb`. Clique em "Novo documento".

**Passo 2 — Preencha o título**
Use o nome exato do produto. Não escreva nada além do nome no campo título.

**Passo 3 — Cole o conteúdo**
Cole o template preenchido no campo de conteúdo. Revise antes de avançar.

**Passo 4 — Avance para a revisão inteligente**
Clique em "Analisar". O sistema vai sugerir categoria, tags e divisão em partes. Aguarde alguns segundos.

**Passo 5 — Ajuste a categoria**
Na tela de revisão, certifique-se de que a categoria está em `produto`. Se o sistema sugeriu outra coisa, corrija.

**Passo 6 — Defina a vertical**
Selecione a vertical correta (Anest, Oft, Ortop, R1). Isso é crítico — sem a vertical correta, o produto não vai aparecer para closers da vertical errada.

**Passo 7 — Revise as tags**
O sistema sugere tags automaticamente. Adicione o status em `tags[0]`: `ativo`, `em breve` ou `descontinuado`.

**Passo 8 — Salve**
Clique em "Salvar". O sistema salva o documento e gera o embedding automaticamente em background.

**Passo 9 — Aguarde o embedding (1-2 minutos)**
O embedding é gerado de forma assíncrona. Aguarde 1-2 minutos antes de testar. Se testar antes, o documento não vai aparecer na busca vetorial.

**Passo 10 — Teste no Copilot Vendas**
Abra o Copilot Vendas, selecione modo `produto` e pergunte sobre o produto pelo nome exato. Verifique se o painel de fontes mostra o documento com `similarity: 1`.

---

### 1.5 Como verificar se o produto está funcionando

Depois de cadastrar, teste assim:

**Teste 1 — Pelo nome exato**
```
Modo: produto
Pergunta: "Me fala sobre o [Nome do Produto]"
Esperado: resposta com os dados do documento, painel de fontes mostrando o produto
```

**Teste 2 — Por apelido ou sigla**
```
Modo: produto
Pergunta: "Me explica o [sigla do produto]"
Esperado: mesmo resultado
```

**Teste 3 — Por contexto**
```
Modo: produto
Pergunta: "Qual produto indicar para médico que vai fazer o TEA em 3 meses?"
Esperado: o produto de Anest deve aparecer
```

Se o Teste 1 passa mas o Teste 2 falha → adicione a sigla no título ou na primeira linha do documento.

Se todos os testes falham → o embedding pode não ter sido gerado. Abra o documento na KB, faça uma edição mínima (adicione um espaço, remova), salve de novo.

---

### 1.6 Prioridade de cadastro

Se você tem 10 produtos e está subindo do zero, cadastre nesta ordem:

**1. Produtos mais vendidos** — o Copilot vai ser mais usado para esses
**2. Produtos com objeções complexas** — onde o closer mais precisa de suporte
**3. Produtos novos ou em lançamento** — o time precisa aprender rápido
**4. Produtos descontinuados** — por último, marque como `descontinuado` nas tags

---

### 1.7 Checklist de qualidade por produto

Antes de dar o produto como "pronto", marque cada item:

```
□ Título é o nome exato que o time usa
□ Apelidos/siglas estão na primeira linha do conteúdo
□ ICP definido com pelo menos 2 perfis específicos
□ Contra-indicações listadas
□ Pitch de 30 segundos escrito em primeira pessoa
□ Pelo menos 5 objeções com resposta completa
□ Condições comerciais atualizadas (preço, parcelamento, bônus)
□ Vertical correta selecionada
□ Categoria = produto
□ Tags incluem o status (ativo/em breve/descontinuado)
□ Testado no Copilot — documento aparece como fonte com similarity: 1
```

---

## Parte 2 — Configurando o Sistema (Gestor)

Antes de liberar o sistema para o time, o gestor precisa configurar essas áreas. A ordem importa.

---

### 2.1 Configuração em 6 etapas (ordem recomendada)

**Etapa 1 → Subirprodutos** (Parte 1 deste documento)
Faça isso primeiro. O Copilot sem produtos é inútil.

**Etapa 2 → Criar e validar FAQs** (`/faq`)
Crie no mínimo as 10 perguntas mais frequentes do time e as 10 mais frequentes dos leads. Valide todas. Rascunho não entra no RAG.

**Etapa 3 → Alimentar a Matriz de Objeções** (`/objecoes`)
Cadastre as 10-15 objeções mais comuns com script completo. Win rate é opcional mas ajuda o LLM a calibrar a resposta.

**Etapa 4 → Configurar o Verdadeiro Valor** (`/verdadeiro-valor`)
Escreva o texto de valor da empresa e cadastre os Big Numbers (aprovações, resultados, diferenciais). Esse conteúdo aparece em TODOS os contextos do Copilot.

**Etapa 5 → Configurar Agenda** (`/agenda`)
Cadastre todas as provas ativas com datas de inscrição. O Copilot usa essas datas para criar urgência nas propostas.

**Etapa 6 → Configurar Onboarding** (`/onboarding-config`)
Se o time tem colaboradores novos, configure a trilha antes de ativar o onboarding.

---

### 2.2 Como configurar o Verdadeiro Valor para máximo impacto

O Verdadeiro Valor é injetado em **todo** contexto, em todos os modos, para todos os closers. Invista tempo aqui.

**Texto principal — o que escrever:**

```markdown
## Por que a Med-Review é diferente

[Argumento 1 com dado específico — ex: "87% de aprovação no TEA nos últimos 3 ciclos"]
[Argumento 2 com dado específico]
[Argumento 3]

## O que o aluno recebe que nenhum outro curso oferece
[Lista com diferenciais concretos, não genéricos]

## Prova social
[Histórias reais de aprovação. Quantos alunos, quantas provas, que resultados]

## Comparativo com a concorrência
[Só o que é verificável e verdadeiro]
```

**Big Numbers — exemplos de bons registros:**

```
87%          → Taxa de aprovação no TEA
1.200+       → Médicos aprovados nos últimos 2 anos
92%          → Alunos satisfeitos (NPS)
3x           → Mais conteúdo prático que a média do mercado
```

Cada Big Number tem label, valor, descrição e pode ter vertical. Use vertical quando o número é específico (ex: taxa de aprovação Anest vs R1).

---

### 2.3 Como configurar a Matriz de Objeções para o Copilot usar bem

A Matriz é a fonte mais consultada no modo `objeção`. Qualidade aqui impacta diretamente nas respostas do Copilot.

**Estrutura de cada objeção — o que não pode faltar:**

```
Objeção (topic): "É muito caro"
  → Escreva como o lead fala, não como a empresa documenta

Significado real (real_meaning):
  → "O lead não viu valor suficiente ainda, ou está comparando com cursos mais baratos"
  → Seja específico. Evite "o lead tem objeção financeira" — isso é genérico

Resposta recomendada (recommended_response):
  → Script completo. O Copilot vai usar esse script como base.
  → "Entendo que o investimento parece alto à primeira vista. Mas pensa comigo:
     você vai gastar [X] meses estudando. Se reprovar, vai gastar de novo.
     A aprovação no TEA libera [Y reais/mês] de diferença salarial. Em [Z meses]
     o curso se paga sozinho. E a nossa taxa de aprovação é de 87%."

O que NÃO dizer (what_not_to_say):
  → "Não diga: 'é barato pelo que oferece' — soa defensivo"
  → "Não compare preço diretamente com concorrentes"

Win rate: 72%
  → Estimativa baseada no histórico real ou no feeling do time
```

**As 15 objeções que todo produto precisa ter:**
1. "É muito caro" / "Não tenho esse dinheiro agora"
2. "Vou pensar"
3. "Deixa eu falar com minha esposa/marido"
4. "Já tentei [X] cursos e não fui aprovado"
5. "Não tenho tempo para estudar"
6. "O próximo ciclo já está chegando, vou esperar"
7. "Não sei se vou fazer essa prova"
8. "Quero comparar com outros cursos"
9. "Me manda o material para eu avaliar"
10. "Vou tentar sozinho primeiro"
11. "Acabei de me formar, ainda estou me decidindo"
12. "Trabalhando em dois plantões, não consigo estudar direito"
13. "Já comprei outro curso"
14. "Preciso de um desconto maior"
15. "Vou esperar a próxima turma / o próximo lançamento"

---

### 2.4 Como configurar o Onboarding

Vá em `/onboarding-config`. Configure nesta ordem:

**1. Trilha de temas**
Liste os temas na ordem em que o colaborador deve aprender. Seja específico:

```
✅ "Produtos da vertical R1 — linha completa"
✅ "Como fazer diagnóstico de lead"
✅ "Matriz de objeções — as 10 mais comuns"
✅ "Processo de proposta e fechamento"

❌ "Produtos"
❌ "Vendas"
```

**2. Mensagem de boas-vindas**
Tom acolhedor, explica o que vai acontecer:

```
"Bem-vindo ao treinamento do time Med-Review! 
Vou te guiar pela nossa trilha de aprendizado.
Cada tema tem conteúdo real da nossa base, não teoria genérica.
Ao final de cada tema, vou fazer algumas perguntas para checar o aprendizado.
Qualquer dúvida, me pergunte. Pode ser bem informal. Vamos lá?"
```

**3. Instruções personalizadas**
Regras específicas para o Copilot de onboarding:

```
"Sempre que o colaborador perguntar sobre preço de produto, explique 
o valor e o contexto antes de dar o número bruto.
Se o colaborador errar algo no quiz, não corrija de forma abrupta —
explique o raciocínio correto com calma.
Priorize exemplos práticos antes de conceitos abstratos."
```

**4. Tom:** Didático / Encorajador (evite tom excessivamente formal para onboarding)

**5. Complexidade:** Iniciante para primeiros 3 temas, Intermediário depois

---

### 2.5 Ativando colaboradores em onboarding

1. Vá em `/onboarding-config` ou `/usuarios`
2. Encontre o colaborador (role atual: `closer`)
3. Clique em "Ativar Onboarding" — role muda para `onboarding`
4. O colaborador agora enxerga o Copilot Onboarding e perde acesso ao Copilot Vendas
5. Quando concluir a trilha, volte e clique "Concluir / Reverter" — role volta para `closer`

---

## Parte 3 — Usando o Copilot do Jeito Certo

Esta parte é para **todos os usuários**. O Copilot tem muito mais capacidade do que parece se você souber como perguntar.

---

### 3.1 A regra mais importante

**O Copilot responde com base no que você escreve. Contexto vago = resposta vaga.**

Compare:
```
❌ "Me ajuda com uma objeção"

✅ "Lead médico anestesiologista, 38 anos, PJ, perguntou pelo TEA,
    adorou a proposta mas disse 'tá caro, vou ver se aparece outra opção'.
    Tenho a prova em 60 dias. O que faço?"
```

A segunda pergunta permite que o Copilot:
- Detecte a vertical (Anest → busca documentos de Anest)
- Identifique a objeção exata ("tá caro, vou ver se tem opção")
- Use a urgência (60 dias) como argumento
- Responda com o script correto da Matriz de Objeções

---

### 3.2 Qual modo usar em cada situação

| Situação | Modo | Como perguntar |
|----------|------|----------------|
| Acabei de falar com um lead novo | Diagnose | "Lead [descrição]. O que você quer saber do perfil e o que eu deveria fazer?" |
| Quero estudar um produto antes de ligar | Produto | "Me explica o [produto] completo" |
| Lead travou em uma objeção | Objeção | "Lead disse [frase exata da objeção]. O que faço?" |
| Preciso montar uma proposta | Proposta | "Proposta para [perfil do lead] interessado em [produto]" |
| Lead sumiu, preciso reengajar | Follow-up | "Lead sumiu há [X dias] depois de [situação]. Copy de follow-up" |
| Dúvida sobre processo ou regra | Regra | "Qual é a regra para [situação]?" |
| Preciso de mensagem para WhatsApp | Copys | "Copy de [objetivo] para lead [perfil]" |
| Qualquer outra coisa | Livre | Pergunte livremente |

---

### 3.3 Como usar o modo Diagnose

O modo Diagnose é para o início do ciclo comercial — quando você tem um lead mas não sabe bem por onde começar.

**O que incluir na pergunta:**
- Formação e especialidade do lead
- Situação atual (trabalhando? PJ? CLT? Residente?)
- O que ele mencionou de interesse
- Onde travou (se já houve contato)
- Quanto tempo até a prova (se souber)

**Exemplo:**
```
"Lead: clínico geral, 32 anos, quer migrar para anestesia, nunca fez TEA.
Ficou interessado quando mencionei o Extensivo Anest mas perguntou 
'funciona mesmo pra quem não é anestesiologista ainda?'. 
O que o perfil indica e como abordo essa dúvida?"
```

---

### 3.4 Como usar o modo Produto

Use para estudar antes de uma call difícil ou para gerar a versão comercial na hora.

**Para estudar o produto:**
```
"Me explica o [produto] completo — o que é, pra quem, o que inclui e os principais argumentos"
```

**Para gerar versão comercial:**
```
"Me dá a versão comercial do [produto] para um lead [perfil específico]"
```

**Para comparar dois produtos:**
```
"Diferença entre o [Produto A] e o [Produto B] para um lead que [situação].
Qual eu deveria indicar?"
```

O Copilot vai buscar o documento do produto pelo nome. Se o produto estiver bem cadastrado, a resposta vai ter os dados reais — preço, o que inclui, argumentos, objeções.

---

### 3.5 Como usar o modo Objeção

Este modo funciona melhor quando você descreve a objeção com as **palavras exatas que o lead usou**.

**Ruim:**
```
"Lead tem objeção financeira"
```

**Bom:**
```
"Lead disse: 'é muito investimento, não sei se vale agora com tudo que tá acontecendo no plantão'"
```

A diferença: a segunda versão é semelhante às objeções reais da Matriz. O sistema vai encontrar a objeção correta e dar o script certo.

**Inclua o contexto:**
```
"Lead médico anestesiologista, já tem 5 anos de formado, quer fazer TEA mas disse:
'acho que consigo estudar sozinho esse ano, não sei se preciso de curso'.
Prova em 4 meses."
```

Nesse caso o Copilot vai usar o contexto (4 meses, TEA, autonomia) para argumentar com urgência e prova social.

---

### 3.6 Como usar o modo Proposta

O modo proposta gera um card estruturado. Para gerar bem, inclua:

- Perfil do lead (especialidade, situação)
- Produto de interesse
- Contexto da negociação (está avançado? primeira conversa?)
- Restrições conhecidas (orçamento limitado, prazo específico)

**Exemplo:**
```
"Proposta para médica oftalmologista, 29 anos, PJ, consultou pelo Intensivo Oft,
prova do CBO em 5 meses. Demonstrou interesse mas pediu parcelamento.
Gera proposta com ênfase no ROI e urgência de prazo."
```

**Depois de apresentar a proposta:**
- Se o lead aceitou → clique "Win" no card
- Se o lead recusou → clique "Loss"

Esses registros alimentam a base de exemplos de orçamentos, que o Copilot usa em propostas futuras para calibrar argumentação.

---

### 3.7 Como usar o modo Follow-up

**Quando usar:** lead sumiu após qualquer ponto do funil.

**O que informar:**
- Quando foi o último contato
- O que aconteceu nesse contato (recebeu proposta, disse que ia pensar, sumiu no meio da conversa)
- Tom que você quer (mais direto, mais suave, com urgência, sem pressão)

**Exemplo:**
```
"Lead sumiu há 4 dias. Último contato: enviei proposta do Extensivo Anest,
ele leu (vi que abriu) mas não respondeu. Lead é conservador, não gosta de pressão.
Copy de follow-up suave, sem cobrar resposta, mas criando movimento."
```

---

### 3.8 Usando suas configurações pessoais a favor

Antes de usar o Copilot de forma séria, configure seu perfil em `/settings`:

**Vertical principal:** define qual vertical o RAG prioriza quando você não menciona a vertical na pergunta. Se você trabalha com R1, coloque R1 primeiro.

**Style Wizard:** o Copilot vai escrever copys e follow-ups no seu tom. Se você é direto, ele vai ser direto. Se usa emojis, ele vai usar. O exemplo livre (passo 5) é o mais importante — escreva como você realmente fala.

**Nome:** o Copilot vai te chamar pelo nome e vai usar seu nome em propostas quando relevante.

---

### 3.9 Verificando a qualidade da resposta

**Veja o painel de fontes** (ícone de documentos na interface do chat). Ele mostra:
- Quais documentos foram usados para gerar a resposta
- A similaridade de cada um (0.0 a 1.0)

**O que uma boa resposta mostra:**
```
Fontes usadas:
• Extensivo Anest (similarity: 1.00)   ← produto encontrado direto
• "Qual a taxa de aprovação?" (similarity: 0.91)  ← FAQ relevante
• "Não tenho tempo" (similarity: 0.87)  ← objeção correspondente
```

**O que uma resposta problemática mostra:**
```
Fontes usadas:
• "Como funciona o acesso à plataforma?" (similarity: 0.51)  ← FAQ pouco relevante
• Playbook de Vendas Geral (similarity: 0.48)  ← muito genérico
```

Se as fontes são pouco relevantes → o documento certo pode não estar na base ou está mal escrito.

---

### 3.10 O que o Copilot NÃO faz

Conhecer os limites evita frustração:

- **Não tem memória entre sessões.** Cada vez que você abre o sistema, começa do zero. Não adianta dizer "como falei antes" em uma sessão nova.
- **Não acessa sistemas externos.** Não vê o CRM, não vê o WhatsApp, não sabe o histórico real do lead.
- **Não inventa.** Se o produto não está na base, ele avisa que tem informações parciais (🔴 LACUNA). Isso é bom — é o sinal para alimentar a base.
- **Não dá garantias legais ou financeiras.** Qualquer argumento sobre ROI ou retorno deve ser verificado com o gestor antes de usar com o lead.

---

## Parte 4 — Manutenção Contínua

O sistema só mantém qualidade se for alimentado continuamente.

---

### 4.1 Rotina semanal do gestor

```
□ Validar FAQs em rascunho (se alguém criou na semana)
□ Checar Acompanhamento Onboarding — alguém pausou?
□ Ver quais tópicos têm alta taxa de erro no quiz → revisar o documento na KB
□ Atualizar condições comerciais nos produtos que mudaram (preço, bônus)
```

### 4.2 Rotina mensal

```
□ Revisar os 5 produtos mais consultados — as informações estão atualizadas?
□ Revisar objeções com win rate < 50% — o script pode estar errado ou desatualizado
□ Adicionar novas técnicas comerciais na KB (category: tecnica-comercial) — alimenta o Insight do Dia
□ Verificar provas na Agenda — remover as passadas, adicionar próximas
□ Exportar e revisar Big Numbers — os números ainda estão corretos?
```

### 4.3 Quando um produto muda

Qualquer alteração em preço, condições, bônus ou entregáveis:

1. Vá em `/produtos` (Catálogo)
2. Encontre o produto
3. Edite os campos que mudaram
4. Salve — o embedding é regenerado automaticamente
5. Aguarde 1-2 minutos e teste no Copilot

### 4.4 Quando um closer tem resposta de objeção que funciona bem

1. Peça para ele ir em `/objecoes`
2. Encontrar a objeção
3. Clicar em "Minha resposta"
4. Escrever o script pessoal que funciona

O Copilot Vendas vai incluir essa resposta pessoal no contexto toda vez que aquela objeção aparecer para esse closer. Isso é um diferencial real — o Copilot usa o que funciona para cada pessoa.

### 4.5 Quando o Copilot dá uma resposta errada ou estranha

1. **Identifique se é falta de conteúdo ou conteúdo errado**
   - "Não tenho informações sobre X" → cadastrar X na base
   - "Diz que o preço é Y mas o preço correto é Z" → corrigir o documento na KB

2. **Verifique as fontes usadas** (painel de fontes no chat)
   - Se a fonte errada foi usada → verificar se o documento está atualizado
   - Se nenhuma fonte relevante aparece → o documento pode estar com embedding NULL

3. **Se o problema persistir** → abrir o documento no KB, editar minimamente e salvar novamente para regenerar o embedding

---

## Apêndice — Checklist de lançamento

Use esse checklist quando for lançar o sistema para o time pela primeira vez.

```
PRÉ-LANÇAMENTO — GESTOR

[ ] Todos os produtos ativos cadastrados na KB com category=produto
[ ] Cada produto testado no Copilot Vendas (modo produto)
[ ] Mínimo 10 FAQs validadas por vertical
[ ] Matriz de objeções com pelo menos as 15 objeções principais
[ ] Verdadeiro Valor preenchido com texto + mínimo 5 Big Numbers
[ ] Provas ativas cadastradas na Agenda com datas corretas
[ ] Pelo menos 3 técnicas comerciais na KB (category: tecnica-comercial)
[ ] Trilha de onboarding configurada (se houver colaboradores novos)
[ ] Usuários cadastrados com role correto

PRÉ-LANÇAMENTO — CADA CLOSER

[ ] Perfil configurado (nome, vertical principal)
[ ] Style Wizard concluído (5 passos)
[ ] Leu o Manual do Usuário (MANUAL.md)

DIA DE LANÇAMENTO

[ ] Gestor fez demo do Copilot Vendas para o time (5 minutos)
[ ] Time testou pelo menos 1 pergunta por modo
[ ] Canal de feedback aberto (onde reportar problemas de resposta)

PÓS-LANÇAMENTO (1ª semana)

[ ] Gestor revisou quais perguntas geraram lacunas (🔴 LACUNA)
[ ] FAQs criadas para as perguntas sem resposta
[ ] Documentos corrigidos onde a resposta estava errada
```
