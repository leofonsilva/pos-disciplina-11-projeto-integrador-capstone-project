# Pós Disciplina 11 - Projeto Integrador - Capstone Project

## Introdução

Este repositório contém o projeto final da disciplina **Engenharia de Software com IA Aplicada**, construído do primeiro commit à entrega em produção na nuvem. O projeto é o **AI Researcher**, um chatbot especializado em investimentos de bolsa que busca informações em uma base vetorial com dados públicos da CVM, avalia se o contexto é suficiente, recorre à web quando necessário e responde citando a fonte, sem nunca recomendar compra ou venda.

O desenvolvimento segue uma linha do tempo de cinco etapas: **(1) Ideação, Setup e Deploy Inicial**, onde preparamos o ambiente, a infraestrutura GCP e o esqueleto do sistema (Walking Skeleton); **(2) Orquestração Cognitiva**, onde construímos o cérebro do agente com LangGraph, RAG, busca web e streaming; **(3) Qualidade e Resiliência**, onde adicionamos testes, circuit breaker e exposição via MCP; **(4) Frontend**, onde conectamos a interface Angular ao backend com streaming e painel de raciocínio; e **(5) Observabilidade e Produção**, onde finalizamos com telemetria, controle de custos e documentação. O projeto usa **JavaScript/TypeScript** (Node.js + Angular) como stack principal, **LangGraph.js** para orquestração, **Vertex AI** para LLM e embeddings, e **Google Cloud Platform (GCP)** para infraestrutura.

## Pré-requisitos

Antes de começar, é preciso ter instalado e configurado:

- **Node.js 24** (versão usada no workflow do GitHub Actions)
- **pnpm** (`npm install -g pnpm` ou `corepack enable pnpm`)
- **Docker + Docker Compose** (para o Postgres local)
- **gcloud CLI** (Google Cloud SDK)
- **Claude Code** (ou substituto: Gemini CLI, Codex, Antigravity)
- **Conta GCP** com billing ativa
- **Conta Serper** (busca web — 2.500 queries gratuitas sem cartão)
- **Conta Langfuse** (observabilidade — plano gratuito até 2 usuários)

> **WSL:** em distros mínimas, o Playwright pode falhar por falta de `libatomic1`. Instale com `sudo apt-get install -y libatomic1`. Para o pnpm, use `npm install -g pnpm` ou o script oficial `curl -fsSL https://get.pnpm.io/install.sh | sh -`; o `apt` não é o caminho recomendado para o pnpm em si.

## Setup Inicial

### 1. Fork e clone do repositório

Faça um **fork** do repositório do curso na sua conta do GitHub e clone o seu fork:

```bash
git clone <url-do-seu-fork>
cd capstone-project-ai-researcher
```

O repositório oficial do curso é o **Capstone Project AI Researcher**. Se você quer construir passo a passo, o ponto de partida é o repositório separado **AI Researcher Seed** (a `main` do Seed equivale à branch `starter` do Capstone).

### 2. Instalação das dependências

```bash
pnpm install
pnpm exec playwright install   # baixa os browsers para o teste E2E
```

### 3. Autenticação no Google Cloud

```bash
gcloud auth login                         # login do CLI
gcloud auth application-default login     # login do SDK (bibliotecas)
```

### 4. Criação do arquivo `.env`

Copie o template e preencha com as suas chaves:

```bash
cp .env.example .env
```

Conteúdo mínimo do `.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_researcher
GOOGLE_CLOUD_PROJECT=<id-do-seu-projeto>
GOOGLE_CLOUD_LOCATION=global
MODEL_GRADE=gemini-3.5-flash-lite
MODEL_ANSWER=gemini-3.6-flash
MODEL_EMBEDDING=gemini-embedding-001
SERPER_API_KEY=<sua-chave-serper>
LANGFUSE_PUBLIC_KEY=<sua-chave-publica-langfuse>
LANGFUSE_SECRET_KEY=<sua-chave-secreta-langfuse>
LANGFUSE_HOST=https://cloud.langfuse.com
```

> O `.env` é carregado automaticamente por todo `pnpm dev` do monorepo. Ele é gitignorado e **nunca** deve ser versionado. Em produção, as chaves vêm do Secret Manager.

### 5. Configuração dos serviços externos

**Serper (busca web):**
1. Cadastre-se em serper.dev (e-mail e senha, sem cartão).
2. No dashboard, crie uma API key.
3. Adicione em `SERPER_API_KEY` no `.env`.

**Langfuse (observabilidade):**
1. Cadastre-se em cloud.langfuse.com (plano gratuito até 2 usuários).
2. Crie um projeto e, em Settings, gere a API key (public + secret).
3. Adicione em `LANGFUSE_PUBLIC_KEY` e `LANGFUSE_SECRET_KEY` no `.env`. Confira a região (US, EU, JP) — o monitor precisa apontar para a mesma região do projeto.

**GitHub Secrets (para o deploy):**
Após criar o WIF no GCP (Módulo 1), adicione em **Settings → Secrets and variables → Actions** do seu fork:
- `GCP_PROJECT_ID` = id do seu projeto GCP
- `GCP_WIF_PROVIDER` = caminho completo do provider WIF
- `GCP_DEPLOY_SERVICE_ACCOUNT` = e-mail da service account `github-actions-deployer`

### 6. Subida do banco local

```bash
docker compose up -d
```

> O Postgres do Docker Compose é **efêmero**: ele apaga os dados quando o container é recriado (ex: ao reiniciar a máquina). Se isso acontecer, basta rodar `pnpm db:migrate` e `pnpm seed` novamente. O banco "de verdade" é o Cloud SQL, no GCP.

## Linha do Tempo do Projeto

| Módulo | Foco | Entregável Principal | Aulas |
| :--- | :--- | :--- | :--- |
| **Módulo 1** | Setup, Corpus e Deploy | Walking Skeleton (Health Check API + Angular) em produção | 1 a 7 |
| **Módulo 2** | Orquestração Cognitiva | Grafo LangGraph (Retrieve → Grade → Web Search → Answer) + SSE | 8 a 13 |
| **Módulo 3** | Qualidade e Resiliência | Testes sem rede, Circuit Breaker, Erros RFC 7807, Servidor MCP | 14 a 17 |
| **Módulo 4** | Frontend | Chat com streaming, painel de raciocínio e teste E2E | 18 a 21 |
| **Módulo 5** | Observabilidade e Produção | Langfuse, Métricas Prometheus, Rate Limit e README | 22 a 24 |

## Módulos

### Módulo 1: Ideação, Setup e Deploy Inicial

**O que foi construído:** Configuração do agente de código (`CLAUDE.md`), infraestrutura no GCP (Cloud Run, Cloud SQL, Secret Manager, Workload Identity), coleta e normalização do corpus da CVM, e o Walking Skeleton (API Fastify com health check e frontend Angular) publicado via GitHub Actions.

**Conceitos de engenharia abordados:**
- **CLAUDE.md vs. Skills:** O `CLAUDE.md` carrega o contexto global e as regras em toda interação, enquanto as *skills* são carregadas sob demanda (ex: skill do Angular só é lida em tarefas de frontend), economizando tokens.
- **Serverless e Custo:** O Cloud Run é serverless (cobra por requisição) e nasce privado por segurança, exigindo liberação explícita para `allUsers`. O Cloud SQL, por outro lado, cobra pela instância reservada mesmo sem uso.
- **Workload Identity Federation (WIF):** Autenticação sem chaves estáticas. O GitHub Actions gera um token OIDC efêmero e o troca por um token de service account apenas durante o deploy, evitando vazamento de credenciais.
- **Template Determinístico:** Os parágrafos do corpus da CVM são gerados por regras fixas (concatenação), sem uso de LLM, para evitar alucinações e custos desnecessários.
- **Walking Skeleton:** API com contrato Zod compartilhado (`packages/contracts`), health check real no banco (com fallback para `degraded`) e frontend Angular consumindo esse status.

**Fundação GCP:**
- A infraestrutura é provisionada via **prompts ao Claude Code**, que executa o `gcloud` um comando por vez, com aprovação. Os prompts completos estão no PDF da disciplina (Aula 6). Em resumo, o agente cria:

1. **Projeto e APIs:** `gcloud projects create ai-researcher-capstone`, vincula à billing account e habilita Cloud Run, Cloud SQL Admin, Artifact Registry, Secret Manager e IAM Credentials.
2. **Artifact Registry:** repositório Docker do projeto.
3. **Cloud SQL:** Postgres 16 com pgvector, instância `ai-researcher-db`, tier `db-f1-micro`, região `us-central1` (a mais barata), banco `ai_researcher`, extensão `vector` habilitada, usuário `app_user` com senha gerada.
4. **Secret Manager:** `database-url` com a connection string do `app_user`, sem passar por arquivo local.
5. **Workload Identity Federation:** pool `github-actions`, provider restrito ao seu repositório, service account `github-actions-deployer` com as roles necessárias e binding que autoriza o WIF a se passar por ela.
6. **Variáveis de ambiente:** `GOOGLE_CLOUD_PROJECT_ID` no `~/.zshrc` e as variáveis `GCP_PROJECT_ID`, `GCP_WIF_PROVIDER`, `GCP_DEPLOY_SERVICE_ACCOUNT` nos secrets do GitHub.
7. **Firebase Hosting:** inicialização do hosting no projeto.

> **Atenção:** o banco (Cloud SQL) leva de 20 a 30 minutos para provisionar. É de longe o passo mais demorado.

**Primeiro deploy**
- Depois de configurar o WIF e os secrets do GitHub, o deploy é disparado por um push na `main`:

```bash
git add .
git commit -m "feat: walking skeleton"
git push origin main
```

O GitHub Actions faz build, testes, autenticação via WIF, deploy canário no Cloud Run e publicação no Firebase Hosting. Se o health check falhar, a revisão anterior continua servindo.

**Correção comum no primeiro deploy:** o Cloud Run nasce privado e o health check via Firebase retorna 403. É preciso liberar `allUsers` com `roles/run.invoker` no endpoint `/api/health`:

```bash
# Prompt ao Claude Code:
# O Cloud Run está privado. Pra este endpoint (/api/health, sem custo de LLM ainda)
# ficar acessível publicamente, preciso liberar allUsers com roles/run.invoker.
```

**Comandos executados:**
```bash
# Autenticação GCP
gcloud auth login
gcloud auth application-default login

# Instalar dependências
npm install -g pnpm
git clone <seu-fork>
cd capstone-project-ai-researcher
pnpm install
pnpm exec playwright install

# Subir ambiente local
docker compose up -d
pnpm db:migrate
pnpm seed

# Rodar localmente
pnpm dev

# Verificar qualidade e deploy
pnpm test
pnpm capstone:check --url <sua-url>
```

> `pnpm capstone:check` só faz sentido depois do primeiro deploy, apontando para a URL do Firebase Hosting.

### Módulo 2: Orquestração Cognitiva e APIs

**O que foi construído:** O banco vetorial com `pgvector`, o script de seed para embeddings, os nós do grafo (`retrieve`, `grade`, `web search`), o fallback para busca web com TTL e o nó `answer` com guardrail por código e streaming SSE.

**Conceitos de engenharia abordados:**
- **RAG e Top-K:** A pergunta vira embedding, o banco calcula a proximidade (cosseno) e retorna os `k` documentos mais próximos. O índice HNSW acelera a busca, mas é aproximado (pode deixar passar algum documento).
- **Inversão de Dependência:** Cada nó do grafo é uma *factory* que recebe suas dependências (cliente de embeddings, função de busca) por parâmetro, permitindo testes com *fakes* e sem tocar no Vertex AI ou Postgres.
- **Saída Estruturada e Suficiência:** O nó `grade` usa um schema Zod (`sufficient`, `missingAspects`) para classificar se o contexto numérico da CVM responde à pergunta. Perguntas qualitativas (notícias, motivos) são sempre insuficientes.
- **Padrão Adapter na Busca:** A interface `SearchProvider` abstrai o fornecedor (Serper, Google Custom Search). A variável `SEARCH_PROVIDER` decide qual implementação usar sem alterar o agente.
- **TTL e Retroalimentação:** Informações da web recebem data de expiração (padrão 7 dias), pois notícias perdem validade. O `retrieve` consulta a CVM e a web (filtrando expirados), permitindo que o agente se retroalimente para perguntas futuras.
- **Aresta Condicional e Guard de Loop:** O grafo tem uma aresta condicional que decide entre `answer` e `webSearch`. Um contador `MAX_ITERATIONS = 2` impede loops infinitos.
- **Guardrail em Duas Camadas:** O *system prompt* instrui a nunca recomendar. Um filtro por expressão regular (regex) substitui a resposta por um aviso fixo se detectar linguagem recomendatória (ex: "recomendo", "vale a pena comprar"), mantendo as citações.
- **Streaming SSE:** O endpoint de chat transmite a execução do grafo por Server-Sent Events, com headers `Cache-Control: no-cache, no-transform` e `Connection: keep-alive` para funcionar no Cloud Run.

**Comandos executados:**

```bash
# Aplicar migrations e popular o banco (necessário sempre que o container for recriado)
pnpm db:migrate
pnpm seed

# Rodar os testes (ponto de exclamação executa no shell sem sair do agente)
!pnpm test
```

### Módulo 3: Qualidade, Resiliência e MCP

**O que foi construído:** Testes do grafo sem rede, resiliência com timeout, retry e circuit breaker, degradação graciosa, erros padronizados com RFC 7807 e o servidor MCP (Model Context Protocol) com transporte stdio e Streamable HTTP.

**Conceitos de engenharia abordados:**
- **LLM como API de Terceiro:** A LLM não é idempotente; nos testes, é substituída por um *fake* (`fakeChatModel`). Código determinístico (guardrail regex) tem teste padrão; o parser de CSV é testado com *fixture* em arquivo com bytes latin1 reais.
- **Timeout, Retry e Circuit Breaker:** Proteções aplicadas ao provedor de busca. O timeout evita espera infinita; o retry com backoff resolve falhas passageiras; o circuit breaker para de insistir em um serviço que está se recuperando (após falhas consecutivas, abre o circuito e falha na hora).
- **Padrão Decorator:** A função `comResiliencia()` envolve qualquer `SearchProvider` com as três proteções acima, sem reescrever as implementações do Serper ou Google.
- **Degradação Graciosa:** Se a busca web falhar, o grafo não cai; o `answer` responde com o contexto da CVM e avisa que o contexto pode estar incompleto. Em pagamentos, a falha tem que ser falha (abortar).
- **Erros Padronizados (RFC 7807):** Um *error handler* central mapeia `ZodError` para 400, erro de circuito aberto para 503 e erros genéricos para 500, sem vazar stack trace.
- **Duck Typing:** O erro de circuito aberto é reconhecido pelo nome da exceção, mantendo a API desacoplada do pacote do agente.
- **MCP com uma Única Tool:** Em vez de abrir todo o grafo, o servidor MCP expõe apenas a tool `perguntar`. A descrição da tool é lida pelo agente externo para decidir quando chamá-la.
- **stdio vs. Streamable HTTP:** O stdio serve para uso local (script); o Streamable HTTP expõe a tool em um servidor e dentro da API. As rotas `/chat` e `/mcp` compartilham a mesma instância do grafo para não duplicar *circuit breakers*.

**Modo demo (`DEMO=true`)**
- Para testes manuais e E2E sem consumir cota do Serper nem chamadas ao Vertex AI, ligue o modo demo:

```bash
# Opção 1: variável inline
DEMO=true pnpm dev

# Opção 2: no .env
echo "DEMO=true" >> .env
pnpm dev
```

Com a flag ligada, o grafo responde com mocks: embeddings fake (vetor de zeros), busca fixture (documento fixo da Vale 3T25), grade sempre suficiente e answer fixo. O seed real **nunca** roda em modo demo — a função de embeddings em lote (`criarEmbeddingsReal()`) fica isolada.

**Comandos executados:**

```bash
pnpm test
pnpm build
claude mcp add <nome> -- <comando-do-script>
```

### Módulo 4: Frontend

**O que foi construído:** Protótipo visual (Claude Design), skill `frontend-design`, rotas Angular, `ChatService`, `ChatStore`, `parseAnswer`, componente de chat com streaming, painel de estado do grafo (`GraphStore`), disclaimer fixo e teste E2E com Playwright.

**Conceitos de engenharia abordados:**
- **Protótipo como Fonte de Skill:** O design é criado no Claude Design, exportado como HTML standalone e usado para gerar a skill `frontend-design` (tokens de cor, tipografia e padrões).
- **Fallback não é Erro:** O banner que anuncia a busca web usa a paleta ciano (cor de estado normal), não vermelho/amarelo de alerta.
- **Serviço, Store e Componente:** No Angular, o `ChatService` lê o stream de eventos; o `ChatStore` guarda as mensagens e revela a resposta palavra por palavra (a cada 70ms) para dar fluidez; o componente apenas renderiza.
- **Citações por Origem:** O `parseAnswer` formata a citação conforme a origem: CVM (ticker, período, data-base) ou web (host da URL).
- **GraphStore sem Dependência de Servidor:** O painel deduz o andamento do grafo (próximo nó) a partir dos eventos recebidos. Ele espelha a constante `MAX_ITERATIONS` do backend, sem importar o pacote do agente (que carregaria LangGraph, Postgres e Vertex AI para o bundle do navegador).
- **Agente vs. Playwright:** Testar a interface com um agente é útil no desenvolvimento, mas caro para a esteira de CI. No CI, o agente escreve o script e o Playwright o executa.
- **E2E com Modo Demo:** O teste sobe a API com `DEMO=true` (evitando custos com Serper e Vertex AI), envia a pergunta, espera a resposta em streaming, clica na citação e confirma a data-base.

**Comandos executados:**

```bash
ng analytics off
pnpm dev
pnpm test:e2e
```

### Módulo 5: Observabilidade e Produção

**O que foi construído:** Instrumentação com Langfuse (telemetria por nó), métricas de tokens e custo (Prometheus), rate limiting, budget diário de tokens, README com diagramas Mermaid e encerramento do ambiente no GCP.

**Conceitos de engenharia abordados:**
- **Telemetria vs. Métrica:** Telemetria é o trace item a item (Langfuse). Métrica é o agregado (Prometheus). A métrica interna é criada para alimentar os controles de custo.
- **OpenTelemetry:** Padrão aberto para telemetria. O `LangfuseSpanProcessor` intercepta as chamadas do grafo sem interferir na execução.
- **Contadores Prometheus:** `llm_tokens_total` e `llm_cost_usd_total` são alimentados pelo uso real do Vertex AI. O custo vem de uma tabela de preço por milhão de tokens; modelo fora da tabela loga aviso e conta como custo zero.
- **Rate Limit:** Limita o volume de chamadas (protege contra abuso, bot e loop). Retorna 429 quando o limite é atingido. Rotas de health e métricas são isentas.
- **Budget Diário de Tokens:** Zera na virada do dia UTC, é alimentado pela mesma fonte de tokens do callback de métricas e é verificado no início da rota `/chat`, antes de qualquer byte ser escrito. Retorna 429 se excedido.
- **Mermaid para Arquitetura:** Diagramas escritos em texto são mais baratos para a IA gerar. O GitHub renderiza nativamente. A palavra `graph` é reservada no Mermaid e quebra o parser (usar `agentGraph`).
- **Encerramento no GCP:** O Cloud SQL cobra mesmo sem uso. O encerramento do projeto para a cobrança, mas ele fica arquivado por 30 dias e pode ser restaurado.

**Comandos executados:**

```bash
# Para chamadas reais ao Vertex AI (DEMO=false no .env ou removido)
pnpm dev

# Verificação pós-deploy (aponta para a URL do Firebase Hosting)
pnpm capstone:check --url https://<seu-projeto>.web.app

# Reverter o deploy canário para a revisão anterior (se o canário falhar)
pnpm rollback
```

> `pnpm rollback` só é necessário quando o deploy canário falha após a promoção parcial de tráfego; ele devolve 100% do tráfego para a revisão anterior.

## Comandos Consolidados (Referência Rápida)

```bash
# Autenticação GCP (pré-requisito)
gcloud auth login
gcloud auth application-default login

# Ambiente Local
pnpm install
pnpm exec playwright install
docker compose up -d
pnpm db:migrate
pnpm seed
pnpm dev

# Modo demo (sem custo de Serper/Vertex AI)
DEMO=true pnpm dev

# Testes e Qualidade
pnpm test
pnpm test:e2e
pnpm lint
pnpm capstone:check --url <url>

# Build e Deploy
git push origin main          # dispara o GitHub Actions (deploy canário)
pnpm build
pnpm rollback                 # reverte o tráfego se necessário

# MCP
claude mcp add <nome> -- <comando-do-script>
```
