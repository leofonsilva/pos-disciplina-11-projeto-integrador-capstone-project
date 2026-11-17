# CLAUDE.md

## Contexto

Este repositório é o **AI Researcher**, projeto demonstrativo do módulo Capstone da Pós-Graduação em Engenharia AI-Native da UNIPDS.

**O código é material didático.** Ele será lido linha a linha por alunos e explicado em vídeo. Isso muda o critério de qualidade: clareza vence concisão, explícito vence esperto, e uma abstração só se justifica quando tem dois ou mais usos reais. Código correto porém difícil de narrar é código a ser reescrito.

O histórico de commits também é material — cada fase é uma tag Git, e o `git diff` entre tags é conteúdo de aula. Commits devem contar a história na ordem em que ela será ensinada.

**O que a aplicação faz:** chatbot consultor de investimentos. Consulta uma base vetorial de indicadores financeiros de 20 empresas da B3, avalia se o contexto recuperado é suficiente, busca na web quando não é, persiste o enriquecimento e responde com citação e data-base.

---

## Estado atual do repositório

Bloco 0 (fundação) está pronto: monorepo pnpm workspaces + Turborepo (`package.json`, `pnpm-workspace.yaml`, `turbo.json`), tooling (`tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.editorconfig`) e `packages/contracts` (schema zod de `/health`).

Bloco B (corpus CVM) está pronto e fechado: `packages/corpus` coleta ITR/DFP direto de `dados.cvm.gov.br`, normaliza e gera os 80 documentos (`packages/corpus/data/documentos/{TICKER}.json`, 20 empresas × 4 trimestres) com o parágrafo determinístico já embutido. Rodar `pnpm collect` de novo busca os trimestres mais recentes disponíveis na hora — os arquivos em `data/documentos/` são o snapshot da última coleta, e são versionados. B.6 (conferência manual dos números contra os releases oficiais, via `pnpm --filter @hero/corpus run report [TICKER...]`) e B.7 (revisão do `evals/dataset.json`, 27 perguntas nos grupos A/B/C) foram concluídos por revisão humana — o dataset é considerado definitivo.

**Achado do D.5 sobre o corpus:** `packages/corpus/src/paragraphs/template.ts` só menciona `receita_liquida`, `lucro_liquido`, margem líquida (calculada) e `caixa_operacional` no parágrafo indexado — `lucro_bruto`, `ativo_total` e `patrimonio_liquido` são coletados e normalizados, mas nunca aparecem no texto que vira embedding. Isso apareceu ao validar o nó `grade` contra `evals/dataset.json`: duas perguntas sobre `patrimonio_liquido`/`ativo_total`, originalmente no grupo A, foram reclassificadas pro grupo B (B09/B10) porque de fato caem no fallback de busca web — o `grade` estava certo, o gap é no template. Decisão consciente de não expandir o template agora; se isso mudar, B.5 reabre e os 80 documentos + seed precisam rodar de novo.

Bloco A (fundação GCP) está pronto: projeto `ai-researcher-capstone` em `us-central1`, Artifact Registry, Cloud SQL Postgres 16 com `pgvector` habilitado, Secret Manager com `database-url`, Workload Identity Federation para o GitHub Actions (sem chave de service account) e Firebase Hosting inicializado. Detalhes, valores e a cronometragem (A.7 — ultrapassou os 20 min, virou pré-requisito assíncrono) estão em `infra/README.md`. Nenhuma credencial em arquivo local ou versionado — tudo vem do Secret Manager.

Bloco C (walking skeleton + deploy zero) está pronto: `apps/api` (Fastify, `GET /api/health` checando o Postgres de verdade via `pg`, com timeout e sem derrubar o processo se o banco cair) e `apps/web` (Angular 22, criado pela skill oficial `angular-new-app`, consumindo `/api/health` via `resource()`) rodam com `pnpm dev` (proxy local `/api` → `:3000`, sem CORS em lugar nenhum). `docker-compose.yml` na raiz sobe Postgres+pgvector efêmero, api e web via `infra/docker/*.Dockerfile` (build com `turbo prune --docker`). `.github/workflows/deploy.yml` builda/testa/lint, e em push pra `main` faz deploy da API no Cloud Run (via Cloud Build) e do Angular no Firebase Hosting — autenticado por WIF, sem nenhum secret no GitHub. `firebase.json` faz o rewrite `/api/**` → Cloud Run, mesma lógica do proxy local e do nginx do `docker-compose`. `scripts/capstone-check.ts` (`pnpm capstone:check --url <url>`) cobre os itens 1–3 do checklist (endpoint público, deploy automatizado, segredos protegidos); os demais itens chegam com os blocos que os implementam.

**Achado tardio (sessão do G.1/G.3):** `pnpm db:migrate` e `pnpm seed` nunca tinham rodado contra o Cloud SQL de produção — o banco estava com zero tabelas desde sempre. `/health` sempre respondeu `ok` (só testa conexão, não schema), então isso nunca apareceu no `capstone:check`; `/chat` provavelmente nunca funcionou em produção, mascarado primeiro pelo `SERPER_API_KEY` ausente (pendência do D) e só descoberto depois de resolver essa. Corrigido rodando os dois via `cloud-sql-proxy` local contra a instância real (`ai-researcher-capstone:us-central1:ai-researcher-db`) — `db:migrate` cria as tabelas, `seed` chama a Vertex AI de verdade pra gerar os 80 embeddings (custo real, pequeno). Confirmado com `/chat` real em produção, resposta completa com citação e trace chegando no Langfuse. Nenhuma automação de CI/CD roda migração ou seed — os dois são passos manuais fora do `deploy.yml`, e não há proteção contra esquecê-los de novo num projeto novo (vale considerar pro `capstone:check` ou pro workflow, mas não é código deste bloco).

Bloco D (grafo do agente) está pronto e fechado: `packages/agent` monta o grafo via LangGraph.js (`buildGraph` em `src/graph.ts`) — `retrieve → grade → [suficiente | guard cortou] → answer`, com fallback pra `webSearch → retrieve` quando o contexto é insuficiente, limitado a `MAX_ITERATIONS = 2`. Cada nó recebe suas dependências de LLM/rede por parâmetro, nunca importa cliente global, e é testável com fake, sem chamada real. O corpus CVM (`documentos`) e o enriquecimento web (`documentos_web`, com TTL aplicado na leitura, não por job de limpeza) moram em tabelas separadas; `buscarDocumentosSimilares` consulta as duas e combina por distância. O nó `answer` garante citação (fonte + data-base, deduplicada por `sourceUrl`) e filtra linguagem recomendatória por código antes de devolver a resposta — não só por instrução de prompt, porque instrução de prompt não é garantia; é esse filtro que sustenta o teste de guardrail que a seção de domínio deste arquivo exige. `POST /api/chat` (`apps/api/src/routes/chat.ts`) expõe o grafo via streaming SSE, um evento por nó, com `Cache-Control: no-cache, no-transform` pra não bufferizar no Cloud Run. Modelos vêm de `MODEL_GRADE`/`MODEL_ANSWER`/`MODEL_EMBEDDING`, nunca hardcoded (`packages/agent/src/llm.ts`, `embeddings.ts`).

**Pendência que o D não fechou:** `SERPER_API_KEY`/`GOOGLE_CUSTOM_SEARCH_API_KEY`/`GOOGLE_CUSTOM_SEARCH_CX` ainda não existem no Secret Manager nem são injetadas pelo workflow de deploy. `criarGraphPadrao()` em `apps/api/src/app.ts` só constrói o grafo real no primeiro `POST /chat` (não no boot do processo), então o Cloud Run sobe e `/health` responde normal — mas `/chat` falha com um evento SSE de erro até essas variáveis serem configuradas. Confirmado com um servidor local de verdade, não só em teste com fake. Existe um segundo bug independente que também derrubava `/chat`, já corrigido no F.3: `gemini-3.5-flash-lite`/`gemini-3.6-flash` só respondiam em `location: "global"` na Vertex AI, e o código usava `us-central1` como default — ver `infra/README.md`.

`SERPER_API_KEY` real está no `~/.zshrc` local (não versionado) e também no Secret Manager (`serper-api-key`) e no `deploy.yml`, injetada no Cloud Run — pendência do D fechada tanto local quanto em produção, confirmado com `/chat` real. **Achado sobre a alternativa `SEARCH_PROVIDER=google`:** o Custom Search JSON API está **fechado pra novos clientes** desde já (confirmado direto em `developers.google.com/custom-search/v1/overview` em ago/2026: "The Custom Search JSON API is closed to new customers") e descontinua em 1º de janeiro de 2027 pra quem já tinha. Ou seja, um aluno novo seguindo este README hoje não consegue provisionar nenhum dos dois providers de graça — Serper só dá 2.500 créditos de trial e depois é pago a partir de $50/mês, sem tier mensal barato. Não é uma decisão de arquitetura tomada ainda, só um achado que vale revisitar (candidatos com tier grátis pra agente de IA: Tavily, Brave Search API) antes que vire bloqueio real pra quem for montar o ambiente do zero.

Bloco E (qualidade, resiliência e MCP) está fechado, com uma ressalva documentada abaixo (E.11): cobertura de teste no parser/seleção de conta do coletor CVM (E.1; E.2 e E.3 já tinham vindo prontos do Bloco D — teste de roteamento e de guardrail já existiam), fixtures de busca web + modo `DEMO=true` sem rede (E.4), timeout/retry/circuit breaker no `SearchProvider` (E.5), degradação graciosa de ponta a ponta quando a busca cai (E.6), erros padronizados em `application/problem+json` (E.7), `packages/mcp-server` com a tool `perguntar` nos dois transportes — stdio (`src/stdio.ts`, para `claude mcp add`) e Streamable HTTP, tanto standalone (`src/http.ts`) quanto como gateway em `/api/mcp` dentro do `apps/api` (E.8–E.10) — e três itens novos no `capstone:check` (E.12): testes no CI, degradação graciosa e guardrail contra a URL de produção.

**E.11 bloqueado, não implementável neste plano:** "CI como required check" pede branch protection no GitHub, mas o repositório é privado numa conta no plano Free — `gh api .../branches/main/protection` sempre devolve 403 pedindo upgrade pra GitHub Pro/Team (ou tornar o repo público). Isso é uma restrição de plano, não uma decisão de código; não vai ser contornado sem uma decisão do dono do repositório sobre billing ou visibilidade. O que já existe cobre o risco principal: `.github/workflows/deploy.yml` roda `test` em todo PR e o job `deploy` só executa se `test` passar (`needs: test`) — código quebrado não chega ao Cloud Run mesmo sem a trava formal de branch protection no merge. `pnpm capstone:check` (item 4) inicialmente checava as duas partes (job passou + configurado como required check) e reportava a segunda como indisponível; por pedido do dono do projeto, essa segunda parte foi removida do script — ela nunca vai passar neste plano do GitHub, então checá-la só adiciona ruído (inclusive um `gh: Upgrade to GitHub Pro...` no stderr a cada execução). O item 4 agora verifica só se o job `test` passou na última execução, que é o que de fato dá pra confirmar por aqui.

**Achado tardio (sessão do G.1):** o item 10 (`checarGuardrail`) do `capstone-check.ts` dava falso positivo sempre que o guardrail interno funcionava certo — o próprio texto de recusa (`RESPOSTA_GUARDRAIL` em `packages/agent/src/answer/format-resposta.ts`: "Não recomendamos... nunca aconselha...") contém as palavras "recomendamos" e "aconselha", que os padrões do script (independentes de propósito do filtro interno) casavam sem olhar a negação. Ou seja: quanto melhor o guardrail funcionava, mais o check reprovava. Corrigido com lookbehind `(?<!não )(?<!nunca )` nos três padrões de verbo — confirmado contra produção real (pergunta "Devo comprar ações da Vale agora?"), antes e depois da correção.

Bloco F (frontend) está pronto e fechado: F.1–F.7 completos. O protótipo do F.1 foi feito no **Claude Design** (`claude.ai/design`), não no Google Stitch originalmente previsto no plano — trocado por decisão do dono do projeto, já refletido em `docs/hero-project-plano.md` e `docs/hero-project-tarefas.md`. O export está versionado em `docs/design/prototype/`: `ai-researcher-chat.dc.html` é a versão canônica (paleta própria extraída da página da UNIPDS — fundo quase-preto, accent ciano, único botão em lima), `ai-researcher-chat-nocturne.dc.html` é uma variante alternativa com a skin de um design system genérico que existia no mesmo projeto do Claude Design, mantida só como referência. Os arquivos `.dc.html` são o formato de export da ferramenta — dependem de um runtime (`support.js` + `window.React` injetado pelo preview) que só existe dentro do Claude Design, não abrem como HTML estático fora dela. F.2 (skill `frontend-design`, em `.claude/skills/`) traduz os tokens e os padrões de componente do protótipo canônico em regras — inclui a decisão de domínio de nunca usar verde/vermelho em dado financeiro ou estado do pipeline, pra não sugerir compra/venda.

F.3 (chat com streaming) implementou `apps/web/src/app/chat/` (Chat, ChatMessageComponent), `state/chat-store.ts` e `api/chat.service.ts`. `POST /api/chat` não usa `EventSource` (não suporta POST) — `ChatService` lê o `ReadableStream` da `fetch` e parseia os frames SSE manualmente. O grafo emite um evento por nó, não por token — o texto final do nó `answer` chega inteiro de uma vez; o efeito "token a token" é só client-side, revelado palavra por palavra por um timer em `ChatStore`. Isso superou o placeholder de `/api/health` que ocupava `app.html` desde o walking skeleton do Bloco C. Testado de ponta a ponta num Chrome de verdade (golden path e degradação graciosa) contra um servidor fake, e via curl contra o backend real.

**Emenda de 2026-08-30, na preparação do roteiro 4.2:** a primeira versão do F.3 removeu `HealthService` do frontend por completo (nada mais o usava) e deixou `Chat` como único conteúdo de `app.html`, sem router — o `/api/health` ficou coberto só pelos testes de `apps/api` e pelo `capstone:check`, via HTTP direto, nunca pela UI. Na gravação real da 4.1 (clone separado do curso), esse passo de "substituir a casca de health check por `Chat`" não tinha prompt próprio — o componente `Chat` foi criado mas `app.html` nunca foi atualizado, e a tela raiz continuou mostrando o placeholder de health check antigo, com `Chat` pronto mas sem rota nenhuma o servindo. Corrigido introduzindo roteamento de verdade (`@angular/router`, já dependência do `angular-new-app`, nenhuma instalação nova): `app.routes.ts` mapeia `''` → `Chat` e `/health` → um componente `Health` novo (`apps/web/src/app/health/`), que reaproveita o padão antigo do `HealthService` (recriado, agora com `fetch` em vez de `HttpClient`, pra ficar consistente com `ChatService`) — `resource()` chamando `GET /api/health`, mesmo texto de status de antes. `App` vira só um `<router-outlet />`. Decisão: manter a página de health visível (não removê-la de novo), só tirá-la da rota raiz — dá pra conferir o endpoint pela própria UI sem abrir o Network tab, sem competir com o chat pela tela inicial. O prompt que faltava vira conteúdo novo da Cena 3 da 4.2 (ver `docs/hero-project-tarefas.md`/histórico de roteiro), não uma regravação da 4.1. O backend real, com `DEMO=true` e a base local seedada, respondeu ao `retrieve` normalmente e falhou no `grade` com **404 do Vertex AI** em `gemini-3.5-flash-lite` ("model was not found or your project does not have access") — anterior ao F.3, não introduzido por ele. Raiz encontrada e corrigida: esses dois modelos só respondem em `location: "global"` nesse projeto, não em `us-central1` (o default anterior de `packages/agent/src/llm.ts`). Provavelmente estava quebrado em produção desde o Bloco D — `GOOGLE_CLOUD_LOCATION` nunca foi configurada em nenhum ambiente. Depois da correção, `retrieve → grade → answer` completo foi confirmado com curl contra Postgres e Vertex AI reais.

F.4 (citações clicáveis com data-base) lida com uma divergência entre o protótipo e o formato real: o `answerText` não marca posição de citação inline no meio da frase, ele termina com um bloco `Fontes:\n- rótulo: url` (`formatarCitacoes`, um item por documento deduplicado). `state/citation.ts` (`parseAnswer`) separa o corpo do bloco de fontes — só o corpo é revelado palavra a palavra; as citações da mensagem aparecem de uma vez quando ela termina, como pílulas clicáveis abaixo do texto, reaproveitando o padrão de painel inline (Data-base/Origem/link) já documentado na skill `frontend-design`. Confirmado contra o backend real que o formato de `answerText` bate exatamente com o que `parseAnswer` espera.

F.5 (painel de estado do grafo em tempo real) esbarrou numa limitação estrutural do stream: `POST /api/chat` só emite um evento por nó *concluído* (ver `apps/api/src/routes/chat.ts`), nunca "nó iniciado" — então "tempo real" com o nó ativo destacado exige prever a próxima etapa a partir da que acabou de chegar. `state/graph-store.ts` faz essa previsão (retrieve→grade sempre; grade→webSearch ou answer pelo `sufficient` e por uma contagem local de iterações que espelha `MAX_ITERATIONS` de `packages/agent/src/graph.ts`, não importado no frontend pra não levar LangGraph/Vertex AI/pg pro bundle do browser; webSearch→retrieve sempre) e modela as etapas como uma lista que cresce a cada passagem por um nó, não um mapa fixo de 4 posições — isso é o que garante não colapsar o loop (`angular-component` skill), com `Retrieve`/`Grade` repetidos ganhando `· iteração N`. `ChatStore` encaminha cada evento do stream pro `GraphStore` na mesma iteração do fetch, sem duplicar a chamada de rede. Testado num Chrome de verdade com um servidor fake simulando contexto insuficiente na primeira volta — o histórico completo (retrieve → grade → webSearch → retrieve · iteração 2 → grade · iteração 2 → answer) ficou visível, com duração e banner de fallback corretos.

F.6 (disclaimer regulatório persistente) é a faixa fixa entre o header e o corpo do chat em `chat.html`, renderizada incondicionalmente — não atrás de nenhum `@if`, então não some durante o streaming nem depende de interação. Sem modal, sem botão de fechar.

F.7 (Playwright, caminho feliz, rodando no CI) esbarrou num limite real do modo demo: "sem rede" (E.4) até aqui só cobria a busca web — `retrieve` ainda chamava a Vertex AI de verdade pra gerar o embedding da pergunta, e `grade`/`answer` sempre chamavam a Vertex AI de verdade. Sem GCP nem Postgres no runner do GitHub Actions, isso bloquearia o E2E de largada. `DEMO=true` foi estendido pra cobrir o grafo inteiro: `criarEmbeddings()` (`embeddings.ts`) devolve zeros (o valor não importa — `db/retrieve-demo.ts` também é fixture e ignora o embedding, sempre devolvendo o mesmo documento real da Vale 3T25 congelado do corpus), e `llm.ts`/`llm-demo.ts` fazem o mesmo pra grade (sempre suficiente) e answer (resposta fixa). O seed nunca roda em modo demo — ganhou `criarEmbeddingsReal()` separado, que isola o `embedDocuments()` em lote que só ele usa. Com isso, `node dist/index.js` com `DEMO=true` e nada mais roda `/api/chat` de ponta a ponta sem Postgres nem credencial de GCP — confirmado com curl antes de escrever o teste.

`e2e/chat-happy-path.spec.ts` (`apps/web`) sobe os dois processos reais via `playwright.config.ts` (`webServer`) e cobre a jornada completa: disclaimer sempre visível, pergunta enviada, resposta em streaming com citação (data-base, origem, link), painel do grafo concluindo sem passar por `webSearch`. O target `e2e` que `ng add playwright-ng-schematics` criou em `angular.json` foi removido — ele só sabe subir o dev server do Angular, e brigava pela porta 4200 com o `webServer` do Playwright, que já sobe os dois servidores (api + web) sozinho; `apps/web/package.json` chama `playwright test` direto. `angular.json` também ganhou `proxyConfig` no target `serve` (antes só vinha do flag `--proxy-config` nos scripts `dev`/`start`, que o dev server iniciado pelo Playwright não usa). `.github/workflows/deploy.yml` instala o Chromium do Playwright e roda `pnpm test:e2e` no job `test`, então `deploy` (que depende de `test`) também fica bloqueado por regressão E2E.

Isso fecha o Bloco F inteiro.

Bloco G (observabilidade e produção) está pronto e fechado: G.1–G.7. `packages/agent/src/observability/langfuse.ts` instrumenta o grafo com `@langfuse/langchain` (`CallbackHandler`) + `@langfuse/otel` (`LangfuseSpanProcessor` registrado num `NodeTracerProvider`) — **não** `langfuse-langchain` (pacote sem escopo): esse é a geração legada v3 do SDK e exige a dependência `langchain` inteira como peer, que este projeto nunca teve (só `@langchain/core` + pacotes específicos). `registrarLangfuseTracing()` roda uma vez no boot de cada processo que pode invocar o grafo (`apps/api/src/index.ts`, `packages/mcp-server/src/stdio.ts` e `http.ts`); `criarLangfuseCallbacks()` é passado em todo `graph.stream()`/`graph.invoke()` (rota `/chat`, gateway `/api/mcp`, tool `perguntar` standalone). As duas funções são no-op sem `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` — trace desligado não impede nada de subir, mesmo espírito do `SERPER_API_KEY` pendente. Confirmado com credenciais falsas contra um host inexistente que uma exportação que falha não derruba a resposta nem trava o processo (export OTLP é assíncrono, best-effort).

**Pendência do G.1 fechada:** `langfuse-public-key`/`langfuse-secret-key` foram criados no Secret Manager (valores da conta que o dono do projeto criou no Langfuse) e `deploy.yml` injeta os dois no Cloud Run via `secrets:` (mesmo mecanismo do `DATABASE_URL`), mais `LANGFUSE_BASE_URL` via `env_vars:` — não é segredo, é só a URL do cloud (`us.cloud.langfuse.com`). IAM: a service account de execução do Cloud Run (`<numero-do-projeto>-compute@developer.gserviceaccount.com`, a mesma que já lia `database-url`) ganhou `secretmanager.secretAccessor` nos dois secrets novos. Produção manda trace de verdade a partir do próximo deploy — antes disso `/chat` já funcionava normal (guard já testado), só sem trace.

G.2 (`/api/metrics` com custo agregado, número conhecido, não estimado) usa `prom-client`: `packages/agent/src/observability/metrics.ts` define `Counter`s (`llm_tokens_total`, `llm_cost_usd_total`, com labels `node`/`model`/`kind`) num `Registry` próprio (não o default global do prom-client, pra não misturar com métricas de processo que este projeto ainda não coleta). `criarMetricsCallback()` é passado em todo `graph.stream()`/`graph.invoke()` — mesmo call site de `criarLangfuseCallbacks()` (`callbacks: [...criarLangfuseCallbacks(), criarMetricsCallback()]`, em `apps/api/src/app.ts` e `packages/mcp-server/src/server.ts`), **nunca** dentro de `llm.ts`: passar `{ callbacks: [...] }` explícito num `invoke()` de dentro de um nó substitui o callback manager ambiente que o LangGraph propaga via `AsyncLocalStorage`, em vez de somar a ele — isso quebra silenciosamente a geração do Langfuse pra aquela chamada (a "generation" simplesmente some do trace, sobra só o span do nó). Esse bug real foi introduzido numa primeira versão do G.2 e pego pelo passo de auto-auditoria de trace da skill oficial do Langfuse (ver abaixo) comparando um trace real com e sem o parâmetro. Como o callback é genérico (uma instância por chamada, sem node/model estáticos), ele correlaciona `handleChatModelStart` → `handleLLMEnd` por `runId` num `Map` local, lendo `metadata.langgraph_node` (que o LangGraph anexa a toda chamada de chat model dentro de um nó) e `metadata.ls_model_name` (convenção "LangSmith" que o LangChain anexa independente de LangSmith estar em uso) — o mesmo par de campos que `@langfuse/langchain` lê internamente pra atribuir a generation ao nó certo. `handleLLMError` limpa a entrada do Map em caso de falha, pra não vazar memória. O custo vem de `observability/pricing.ts`, uma tabela `Record<string, {input, output}>` em USD por milhão de tokens (Vertex AI, conferida em ago/2026) — modelo fora da tabela loga aviso uma vez e conta como custo zero, nunca quebra a resposta. `apps/api/src/routes/metrics.ts` expõe `GET /api/metrics` no formato Prometheus (`registry.contentType` + `registry.metrics()`), registrado com o mesmo padrão estrutural mínimo de `GraphLike` em `chat.ts` (`MetricsRegistry` como interface, não o tipo concreto do prom-client — `apps/api` não ganhou a dependência). Confirmado contra a Vertex AI e o Postgres reais (não só DEMO): `/api/chat` real produziu `llm_tokens_total`/`llm_cost_usd_total` corretos em `/api/metrics` **e** um trace no Langfuse com generation por nó, modelo e custo — o custo calculado por `pricing.ts` bateu com o custo que o próprio Langfuse calculou de forma independente (a diferença de centésimos de centavo é só tokens diferentes entre duas perguntas de teste distintas).

Escopo do G.2: só os nós `grade` e `answer` (chamadas de chat completion) — o custo de embeddings (`criarEmbeddingsReal()`) não entra porque `EmbeddingsClient.embedQuery()` não expõe callbacks na assinatura usada pelo nó `retrieve`, e mudar essa interface só pra isso não tinha um segundo uso real.

**Skill oficial do Langfuse instalada** (`npx skills add langfuse/skills --skill langfuse`, mesmo mecanismo de `angular/skills`) a pedido do dono do projeto, com `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`/`LANGFUSE_BASE_URL` já configuradas localmente (`~/.zshrc`, não versionado). O passo de auto-auditoria da skill (rodar de ponta a ponta, buscar o trace de volta via `langfuse-cli`, conferir contra `https://langfuse.com/docs/observability/best-practices`) confirmou que G.1 já cobre o essencial — generation por nó com modelo, tokens e custo capturados automaticamente pelo `@langfuse/langchain` — e pegou o bug do parágrafo acima antes de virar regressão permanente. Um ponto que a auditoria também achou e ainda não foi corrigido: o nome do trace raiz fica genérico (`"LangGraph"`, o default do LangGraph.js), não descritivo — a skill lista isso como prática ruim ("Generic trace names → Hard to filter"). Não fechado ainda por decisão consciente: dar um nome fixo tipo `"chat-response"` não ajuda muito mais que o atual num app com uma única rota; nomear pela pergunta arrisca colidir com a regra de nunca logar dado sensível sem necessidade. Fica como possível follow-up do G.3 (quando o Grafana Cloud também entrar em cena) em vez de mexer agora sem um objetivo concreto de filtro.

Ver acima — a pendência de produção do G.1 (Secret Manager + `deploy.yml`) foi fechada depois desta sessão.

G.3 (Grafana Cloud, "provisionado por arquivo, não clicado") pivotou do plano original do `docs/hero-project-tarefas.md` — datasource Cloud Monitoring do GCP (pull) — pra OTLP push, decisão do dono do projeto: ele já tinha `OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_EXPORTER_OTLP_HEADERS` configurados no `~/.zshrc` apontando pro gateway OTLP do Grafana Cloud, que autopopula o Mimir/Prometheus hospedado da própria stack. Mais simples que o plano original — sem IAM entre GCP e Grafana — e reaproveita `@opentelemetry/*`, já dependência desde o G.1. Escopo deliberadamente restrito ao que o Langfuse **não** cobre: saúde HTTP operacional (taxa de requisição, latência p95, taxa de erro 5xx, por rota), não custo/trace de LLM, que já é o G.1/G.2. `apps/api/src/observability/otel-metrics.ts` expõe `registrarOtelMetrics()` (chamado em `index.ts`, mesmo padrão no-op de `registrarLangfuseTracing()` — sem `OTEL_EXPORTER_OTLP_ENDPOINT`, não registra nada) e `otelHttpMetricsPlugin`, um hook `onResponse` que grava o histograma `http.server.request.duration` (nome/atributos na convenção semântica do OpenTelemetry: `http.route`, `http.request.method`, `http.response.status_code`) — `http.route` é o padrão da rota (`/chat`), nunca a URL com valor real, pra não virar alta cardinalidade nem logar query string.

Dois bugs reais apareceram só testando contra o Grafana Cloud de verdade (nenhum erro aparecia em log — o export OTLP "funcionava" silenciosamente sem entregar nada):
1. O histograma era criado no carregamento do módulo (fora da função do plugin), antes de `registrarOtelMetrics()` rodar. Diferente da API de trace do OpenTelemetry (que usa um proxy com bind tardio — é o que sustenta o Langfuse do G.1 funcionar mesmo com `criarLangfuseCallbacks()` importado antes do registro), a API de métricas resolve o `MeterProvider` no momento da criação do instrumento (`createHistogram()`), não no `record()` — um instrumento criado cedo demais fica preso no `NoopMeterProvider` pra sempre. Corrigido movendo a criação do histograma pra dentro da função do plugin, que só executa quando o Fastify processa `register()` no boot.
2. `api.register(otelHttpMetricsPlugin)` sem `fastify-plugin` cria um contexto de encapsulamento próprio pro plugin — o `addHook('onResponse', ...)` só valeria dentro desse contexto, e nenhuma rota real está registrada nele (health/chat/metrics/mcp são plugins irmãos). O hook literalmente nunca disparava. Corrigido envolvendo o plugin com `fp()` (`fastify-plugin`, nova dependência pequena e padrão do ecossistema Fastify pra exatamente esse caso), que anexa o hook no escopo pai em vez de ficar preso no filho. Registrado na raiz do `app`, não dentro do prefixo `/api`: um 404 de rota inexistente nunca entra no contexto encapsulado de `/api` (não bate com nenhuma rota lá dentro), então um hook só-dentro-do-prefixo nunca veria esses 404s.

Os dois ficaram cobertos por teste (`otel-metrics.test.ts`, com `InMemoryMetricExporter` do próprio `@opentelemetry/sdk-metrics`, sem rede) e confirmados contra o Grafana Cloud real: `http_server_request_duration_seconds_count{http_route="/api/health", http_response_status_code="200"}` e a variante 404 com `http_route="desconhecida"` apareceram consultando a API do Prometheus hospedado. `infra/grafana/dashboard.json` (RED — rate, erro, duração — 4 painéis, uid fixo `ai-researcher-api-operacional`) é aplicado via `pnpm grafana:dashboard` (`scripts/grafana-apply-dashboard.ts`, mesmo estilo de `scripts/capstone-check.ts`: `fetch()` direto, sem SDK novo) — o script busca o datasource Prometheus da stack dinamicamente via API (não hardcoda um UID) e faz upsert idempotente em `/api/dashboards/db`. Requer `GRAFANA_URL` (URL da stack) e `GRAFANA_CLOUD_DASH` (Access Policy Token com permissão de escrever dashboard — diferente do header OTLP, que só serve pra ingestão). Painel de latência p95 (`histogram_quantile`) mostrou `NaN` no teste com poucas requisições isoladas — artefato esperado de amostra esparsa num histograma, não um defeito; resolve sozinho com tráfego real ao longo do tempo.

`OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_EXPORTER_OTLP_HEADERS` também foram pro Cloud Run (`otel-exporter-otlp-headers` no Secret Manager — carrega a credencial do gateway, tratado como segredo; o endpoint em si não é segredo, vai como `env_vars`) — produção manda métrica HTTP real pro Grafana Cloud a partir do deploy que injetou isso.

G.4 (rate limiting + budget de tokens por dia, critério "429 no limite configurado") tem dois mecanismos independentes, cada um com seu próprio 429 em `application/problem+json`, mapeado em `apps/api/src/error-handler.ts` como qualquer outro erro de domínio (mesmo padrão de `CircuitoAbertoError`):
- **Rate limiting**: `@fastify/rate-limit` (plugin oficial do Fastify — evita bugs sutis de janela deslizante/limpeza de memória que uma implementação própria teria), registrado global na raiz do `app` (`apps/api/src/app.ts`, junto do `otelHttpMetricsPlugin`) e desligado explicitamente em `/health`/`/metrics` via `config: { rateLimit: false }` na própria rota (são baratas e batidas com frequência por infra, não usuário final). `RATE_LIMIT_MAX`/`RATE_LIMIT_WINDOW` configuráveis por env var, nunca hardcoded. `errorResponseBuilder` devolve a instância de `LimiteDeRequisicoesExcedidoError` (`apps/api/src/rate-limit.ts`) em vez de um objeto solto — o plugin faz `throw` dela internamente, então passa pelo error handler central igual a qualquer outro erro, sem formatar resposta em dois lugares.
- **Budget de tokens/dia**: `packages/agent/src/observability/budget.ts` acumula um contador em memória (zera na virada do dia UTC, checado na leitura como o TTL de `documentos_web`, não por cron) a partir do mesmo `usage_metadata` que alimenta `llm_tokens_total` do G.2 — `registrarConsumoDeTokens()` é chamado de dentro do `handleLLMEnd` de `criarMetricsCallback()` (metrics.ts), mesma fonte, não um segundo lugar reimplementando a mesma contagem. `verificarOrcamento()` é chamado em `chat.ts` logo após validar o corpo da requisição, **antes** do `reply.raw.writeHead(200, ...)` — depois do writeHead a resposta já é 200 (SSE), sem volta pra um status HTTP de erro de verdade. Sem `TOKEN_BUDGET_DIARIO` configurada, nunca lança — mesmo espírito de `LANGFUSE_PUBLIC_KEY`/`OTEL_EXPORTER_OTLP_ENDPOINT`: falta de configuração nunca bloqueia o serviço.

**Bug pego durante o desenvolvimento, antes de virar regressão:** a primeira versão de `rate-limit.ts` calculava as opções (`max`, `timeWindow`) num objeto no carregamento do módulo, lendo `process.env.RATE_LIMIT_MAX` cedo demais — funcionava em produção (env var já está setada antes do processo subir), mas um teste que setasse a env var e chamasse `build()` depois não via efeito nenhum, porque o objeto já tinha sido construído na importação. Mesma categoria do bug do `MeterProvider` no G.3, só que este só quebraria teste, não produção. Corrigido trocando por uma função (`criarRateLimitOptions()`) chamada dentro de `build()`.

**Limitação documentada, não escondida:** os dois mecanismos guardam estado em memória por processo — com mais de uma instância do Cloud Run, o rate limit e o budget de tokens são por instância, não globais entre elas. Aceitável pro escopo didático do projeto (sem Redis/Postgres extra só pra isso); persistir em banco resolveria mas é mudança de schema, fora de escopo do G.4.

Confirmado com um servidor local de verdade, não só em teste: `RATE_LIMIT_MAX=2` devolveu 200/200/429 em três chamadas seguidas a `/chat`, com `/health` respondendo 200 em paralelo; `TOKEN_BUDGET_DIARIO=1` deixou a primeira pergunta passar (zero tokens consumidos até então) e bloqueou a segunda com o `orcamento-excedido` certo.

G.5 (alerta de abuso + script de carga, critério "alerta dispara em execução controlada") provisiona três recursos no Grafana Cloud via API, todos idempotentes por nome/título fixo (`scripts/grafana-apply-alert.ts`, `pnpm grafana:alert`): uma pasta "AI Researcher", um contact point de e-mail (`ALERTA_EMAIL` — dado pessoal, não segredo, mas do mesmo jeito nunca hardcoded nem versionado) e uma regra de alerta (`infra/grafana/alert-rule.json`, com `__DATASOURCE_UID__`/`__FOLDER_UID__` substituídos em tempo de aplicação, mesmo padrão do `dashboard.json` do G.3). A regra consulta a mesma métrica HTTP do G.3 — `sum(increase(http_server_request_duration_seconds_count{..., http_response_status_code="429"}[5m])) > 5` — sem precisar de métrica nova: todo 429 do rate limit (G.4) ou do budget de tokens (G.4) já aparece ali. A política de notificação (`PUT /api/v1/provisioning/policies`, que substitui a árvore inteira) é lida antes de escrever: só adiciona/atualiza a rota deste projeto por label (`projeto: ai-researcher`), preserva o receiver raiz e qualquer outra rota que já exista.

`scripts/load-test.ts` (`pnpm load:test --url <url> [--n 40]`) dispara N requisições paralelas contra `/chat` só pra estourar o rate limit de propósito — como o 429 acontece no `onRequest` do `@fastify/rate-limit`, antes de qualquer chamada ao grafo, isso nunca gera custo de LLM pras requisições bloqueadas.

**Achado real rodando a primeira execução controlada:** a primeira rajada (logo após subir o servidor) nunca disparou o alerta, mesmo com `RATE_LIMIT_MAX` estourado de verdade (20 respostas 429 confirmadas). Causa: o `Counter` OTel é cumulativo, e o primeiro export (PeriodicExportingMetricReader, ~60s de intervalo) só aconteceu *depois* da rajada — a série já nasce com o valor pós-rajada, sem uma amostra "antes" pra `increase()` calcular a diferença. Prometheus/Mimir não vê saltos que acontecem inteiramente entre o boot do processo e o primeiro export. Confirmado disparando uma segunda rajada com o processo já estável (várias janelas de export no histórico): o alerta foi de `inactive` → `pending` → `firing` em ~90s, e o Alertmanager confirmou o alerta em estado `active` (roteado pro contact point). Isso não é bug de código — é uma característica de como `increase()` funciona sobre séries cumulativas, e vale saber pra não repetir o teste do jeito errado (rajada logo no boot) achando que o alerta está quebrado.

G.6 (canary + rollback, critério "revision defeituosa revertida em um comando") muda `deploy.yml`: o passo de deploy no Cloud Run ganhou `no_traffic: true` + `tag: canary` — a revisão nova sobe com 0% do tráfego, numa URL própria (`https://canary---<serviço>`). Um passo seguinte roda `curl --fail` contra `<canary-url>/api/health`; só se passar, um terceiro passo promove com `gcloud run services update-traffic --to-latest`. Se a revisão nova estiver quebrada, ela nunca chega a servir usuário real — a revisão antiga continua em 100% até alguém investigar, sem precisar de rollback pra esse caso específico. `scripts/rollback.ts` (`pnpm rollback [--revision <nome>]`) cobre o outro caso — uma revisão que passou no healthcheck mas falhou depois: lista as revisions por `gcloud run revisions list`, ordena por `creationTimestamp` e reverte 100% do tráfego pra anterior (ou pra uma revisão explícita) com `gcloud run services update-traffic --to-revisions=<nome>=100`, um único comando.

**Bug real pego no primeiro deploy com canary:** `steps.deploy.outputs.url` do `deploy-cloudrun@v3` já devolve a URL *com a tag* quando `tag: canary` é passado — não a URL base do serviço. A primeira versão do healthcheck prefixava `canary---` de novo por cima, gerando `canary---canary---...`, 404. O mecanismo de segurança funcionou apesar do bug: o healthcheck falhou, bloqueou a promoção, a revisão antiga nunca saiu de 100% do tráfego — confirmado com `gcloud run services describe` e curl direto na revisão nova (saudável de verdade, só a URL do healthcheck estava errada). Corrigido usando `steps.deploy.outputs.url` direto, sem prefixar. Rollback testado de ponta a ponta contra produção real, sem precisar de deploy quebrado de propósito: revertido pra `ai-researcher-api-00010-7mn` (`pnpm rollback`), confirmado com `/api/health`, promovido de volta pra latest com `pnpm rollback --revision <nome>`.

G.7 (`capstone:check` itens 6–9, critério "doze verificações completas") adiciona quatro checks em `scripts/capstone-check.ts`, todos com o mesmo princípio dos itens anteriores — reporta indisponível em vez de mascarar sucesso quando falta configuração local:
- **Item 6** (traces no Langfuse): `GET /api/public/traces?fromTimestamp=<24h atrás>` com Basic auth (`LANGFUSE_PUBLIC_KEY:LANGFUSE_SECRET_KEY` em base64) — `meta.totalItems > 0` confirma trace nas últimas 24h. `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`/`LANGFUSE_BASE_URL` são locais (`~/.zshrc`), não vêm da URL do alvo checado.
- **Item 7** (rate limiting + alerta): dispara 25 requisições paralelas contra `/chat` (número pequeno de propósito — o bastante pra estourar o `RATE_LIMIT_MAX` default de 20 sem gastar mais LLM que o necessário, já que 429 nunca invoca o grafo); se alguma vier 429, confirma a regra de alerta no Grafana via `GET /api/v1/provisioning/alert-rules` (mesma API do G.5).
- **Item 8** (rollback disponível): `gcloud run revisions list`, mais de uma revision com `condition.type=Ready/status=True` — mesma consulta que `scripts/rollback.ts` faz pra escolher o alvo.
- **Item 9** (custo por pergunta): `GET /metrics`, confirma que `llm_cost_usd_total` está exposta (G.2).

`pnpm capstone:check --url https://ai-researcher-capstone.web.app` rodou 10/10 contra produção real depois do G.6/G.7 — os itens 7 (429/alerta) e 8 (rollback) usaram o serviço de verdade, não fake.

Bloco H (empacotamento) está pronto e fechado: H.1–H.5.

H.1: `README.md` na raiz (não existia até aqui) com três diagramas Mermaid — infraestrutura, o grafo do agente (RAG corretivo) e o pipeline de deploy canary — validados renderizando com `@mermaid-js/mermaid-cli` antes de commitar. Achado real: um node id `graph` colide com palavra reservada da gramática do Mermaid mesmo dentro de `flowchart TB` (não só `graph TB`) — quebrava o parser com um erro de sintaxe genérico apontando pro texto do label, não pro id. Renomeado pra `agentGraph`.

H.2: `make destroy` (`Makefile` + `scripts/destroy.ts`) remove os recursos GCP do Bloco A nessa ordem — Cloud SQL primeiro, porque é o único custo fixo do projeto (~US$ 10-15/mês), então é o que mais importa parar de cobrar rápido mesmo que os passos seguintes falhem ou demorem. Pede o `project id` de volta antes de rodar qualquer coisa (sem `--yes`, nenhum comando executa). Executado de verdade no H.5 (ver abaixo) — todos os passos removeram e confirmaram `✓ removido`, sem falha nenhuma.

H.3: item 11 do `capstone:check` (`checarReadme()`) confirma seção de arquitetura + diagrama Mermaid no README. **Item 12 (URL do vídeo) removido do escopo** — do check e do projeto — por decisão do dono: o vídeo ainda não existe. Achado real corrigido: a rajada do item 7 (estoura o rate limit de propósito) rodava antes do item 10 (guardrail, que também bate em `/chat`) — o guardrail via 429 por causa da rajada, não por um problema de verdade. Corrigido separando ordem de execução (rajada por último entre os checks que usam `/chat`) da ordem de exibição (`resultados.sort((a, b) => a.numero - b.numero)` antes de imprimir) — os números do relatório continuam batendo com o checklist de `docs/hero-project-plano.md`, independente da ordem em que cada check de fato rodou. Confirmado **11/11** contra produção real depois do fix.

**H.4 pronto.** Nenhuma tag Git tinha sido criada em nenhum bloco anterior deste repositório (`git tag -l` vazio até aqui) — o plano original previa tag por fase (`v1`...`v6`), mas o trabalho rodou inteiro direto em `main`. Tageado retroativamente, verificando pra cada bloco se o commit que *diz* "fechado" no texto é de fato o último antes do primeiro commit do bloco seguinte (nem sempre é — ver achado abaixo):

- `v1` → `95c31b1` (Bloco C)
- `v2` → `3128650` (Bloco D)
- `v3` → `eb90d86` (Bloco E)
- `v4` → `41c28c8` (Bloco F)
- `v5` → `1d4c07c` (Bloco G)
- `v6` ainda não existe — o Bloco H não está fechado (H.5 pendente); tagear agora seria prematuro, a tag marca bloco *completo*.

**Achado real:** `v1` não é o commit `1ae7a00` ("Marca Bloco C como fechado no CLAUDE.md") — é `95c31b1` ("Libera acesso público ao Cloud Run e confirma capstone:check 3/3"), quatro commits depois. O CLAUDE.md foi marcado como fechado *antes* da estabilização real do primeiro deploy (três bugs que só apareceram rodando contra produção de verdade, documentados em `infra/README.md`). Os outros quatro blocos (D, E, F, G) não tinham esse desalinhamento — o commit "fechado" já era o último antes do bloco seguinte começar.

Branch `starter` criada em `v1` e publicada (`git branch starter v1 && git push origin starter`) — é o que o aluno clona pra começar o curso: walking skeleton + deploy zero funcionando, sem grafo do agente, frontend ou observabilidade. `capstone:check` já estava completo (11/11) desde o H.3, contra o estado atual de `main` — não precisa rodar contra a `starter`, que só tem os itens 1-3 implementados (é o estado do C).

**H.5 pronto — validação por destruição e reconstrução real do próprio projeto de produção.** Por decisão explícita do dono do projeto, em vez de esperar uma segunda conta GCP e uma segunda pessoa, o teste real foi: rodar `pnpm destroy` de verdade contra `ai-researcher-capstone` (não só o gate de confirmação, dessa vez os `gcloud` de fato) e reconstruir tudo do zero no mesmo projeto, seguindo `infra/README.md` como roteiro. Isso não cobre o "alguém que não escreveu o código" do critério original, mas cobre a parte que mais importa tecnicamente: será que os passos documentados bastam pra reconstruir do zero, sem depender de nada que só existe na minha memória de sessão?

`scripts/destroy.ts` validado de ponta a ponta: todos os passos (Cloud SQL, Cloud Run, Artifact Registry, 5 secrets, WIF pool, service account de deploy) removeram e confirmaram `✓ removido`, sem nenhuma falha.

Cinco gaps reais apareceram na reconstrução — nenhum era óbvio a partir do `infra/README.md`/`deploy.yml` como estavam escritos:

1. **Workload Identity Pool tem soft-delete de 30 dias.** `gcloud iam workload-identity-pools delete` não apaga de verdade — o pool fica em `state: DELETED`, recuperável por até 30 dias. Tentar recriar com o mesmo nome nesse período falharia (não testado o erro exato, porque o estado foi checado antes); o caminho certo é `gcloud iam workload-identity-pools undelete github-actions-pool --location=global`, que devolve o pool `ACTIVE` com `attributeCondition`/`attributeMapping`/`oidc` intactos — e, mais importante, preserva o mesmo caminho de recurso (`projects/<numero-do-projeto>/.../providers/github-actions-provider`) já hardcoded em `deploy.yml`, evitando editar o workflow.
2. **Service account de deploy não tem esse soft-delete** — `gcloud iam service-accounts create github-actions-deployer` com o mesmo nome funcionou direto, sem conflito. Mas as 8 IAM roles no projeto e o binding `roles/iam.workloadIdentityUser` (que autoriza o principal do WIF a se passar por essa SA) **não sobrevivem** à recriação, mesmo com nome idêntico — por baixo é um recurso novo, com unique ID novo. Os dois precisam ser refeitos manualmente; `infra/README.md` documenta as 8 roles em texto (bom, isso ajudou), mas não documentava o binding de `workloadIdentityUser` como um passo próprio.
3. **`gcloud sql instances create` sem `--edition` explícito** hoje faz default pra `ENTERPRISE_PLUS`, que rejeita `db-f1-micro` (erro: `Invalid Tier (db-f1-micro) for (ENTERPRISE_PLUS) Edition`). `infra/README.md` já mencionava "`db-f1-micro` (menor tier suportado em Postgres via edição Enterprise)" em prosa, mas um roteiro literal precisa do comando com `--edition=ENTERPRISE` explícito — sem isso, o comando documentado simplesmente não funciona mais (mudança de default do lado do Google, não do projeto).
4. **`--no-traffic` não é aceito pelo `gcloud run deploy` ao CRIAR um serviço novo** — só funciona em cima de uma revisão já existente. O canary do G.6 nunca tinha sido testado contra um Cloud Run inexistente, porque desde que o G.6 foi implementado o serviço já existia. `deploy.yml` falhou no primeiro push depois da reconstrução: `ERROR: (gcloud.run.deploy) --no-traffic not supported when creating a new service`. Corrigido com um passo novo (`Verifica se o Cloud Run já existe`, via `gcloud run services describe`) que decide entre dois passos de deploy: com `no_traffic`/`tag: canary` se o serviço já existe, sem os dois (100% do tráfego direto — não tem revisão anterior pra proteger mesmo) se é a primeira vez. O healthcheck e a promoção seguintes se adaptam ao resultado (`steps.deploy-canary.outputs.url || steps.deploy-first.outputs.url`; a promoção só roda quando houve canary). Esse é um fix permanente no workflow, não só desta sessão — sem ele, qualquer clone do zero (H.5 de verdade, com outra pessoa) travaria no primeiro deploy.
5. **O acesso público do Cloud Run (`allUsers` / `roles/run.invoker`) nunca foi automatizado.** `infra/README.md` documenta que foi liberado manualmente em 2026-08-08 (Bloco C), via `gcloud run services add-iam-policy-binding`, "depois de confirmar explicitamente — é exposição real pra internet inteira". Isso nunca virou parte de `deploy.yml` nem de nenhum script — é IAM do *serviço*, não da revisão, então nem o próprio deploy recria. `pnpm destroy` removeu o binding junto com o serviço; a reconstrução ficou com um Cloud Run saudável mas **privado por padrão**, e o healthcheck do canary falhou com `403` (não com erro de saúde da aplicação) até eu reaplicar o binding manualmente. Diferente dos achados 1-4, esse não é um bug de comando — é uma decisão de segurança de propósito (exposição pública não devia ser automática/silenciosa), mas o efeito colateral é que ela também não é *lembrada* em lugar nenhum executável: só em prosa no README. Fica documentado aqui como um passo manual que qualquer reconstrução completa precisa refazer.

Um achado à parte, fora do GCP: a senha do `app_user` gerada com `openssl rand -base64 24` quebrou o parser de URL do Node (`new URL()`) dentro do `pg-connection-string`, porque base64 pode conter `/`, `+` e `=` — caracteres que uma connection string precisa ter percent-encoded e não estavam. `db:migrate` e `seed` falharam com `TypeError: Invalid URL` antes de tocar o banco. Corrigido gerando a senha com `openssl rand -hex 24` (só alfanumérico, sem necessidade de encoding). Vale como nota pra quem for gerar credencial de banco à mão seguindo o roteiro: prefira hex a base64.

Depois dos cinco fixes, `pnpm capstone:check --url https://ai-researcher-capstone.web.app` confirmou **11/11** contra o projeto inteiramente reconstruído — Cloud SQL, Cloud Run, Artifact Registry, WIF, service account e os 5 secrets todos recriados do zero nesta sessão, corpus reindexado via `pnpm seed` real, deploy automatizado via GitHub Actions com o fix do canary. Isso fecha o Bloco H inteiro (H.1–H.5).

Depois dos quatro fixes, `pnpm db:migrate` + `pnpm seed` (via `cloud-sql-proxy` local, mesmo padrão do achado do G.1/G.3) rodaram limpos contra a instância nova — 80 documentos indexados com embeddings reais da Vertex AI.

O restante deste arquivo — Stack, Estrutura, Comandos — descreve o **estado-alvo** completo do projeto, não necessariamente o estado atual em todo detalhe.

**Achado do Bloco B que vale saber antes de mexer no coletor:** o código de conta padronizado da CVM (`CD_CONTA`) não é estável entre setores — bancos têm uma árvore de DRE/BPP diferente da industrial, e até dois bancos entre si divergem na posição do lucro líquido. `packages/corpus/src/collect/select-quarters.ts` busca `lucro_liquido` e `patrimonio_liquido` por texto de `DS_CONTA` (com `ST_CONTA_FIXA=S`) por causa disso — não volte a usar código fixo pra esses dois campos sem reler o comentário no topo do arquivo.

O plano de execução completo (ementa, arquitetura, cronograma por tag Git, checklist do `capstone:check`) está em `docs/hero-project-plano.md`. A quebra em tarefas por bloco, com a ordem de dependência entre elas, está em `docs/hero-project-tarefas.md` — comece por lá para saber o que fazer a seguir.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| API | Fastify + TypeScript |
| Orquestração | LangGraph.js |
| Frontend | Angular 22 (standalone, signals) |
| Banco | Postgres + pgvector (Cloud SQL) |
| LLM e embeddings | Vertex AI via LangChain.js |
| Busca web | Custom Search / Serper, atrás de interface |
| Tools | MCP (stdio + Streamable HTTP) |
| Testes | Vitest + Playwright |
| Observabilidade | Langfuse, Prometheus, Grafana Cloud |
| Deploy | Cloud Run + Firebase Hosting, via GitHub Actions |

---

## Estrutura

```
apps/
  api/            Fastify, rotas, bootstrap
  web/            Angular
packages/
  agent/          grafo, nós, prompts, providers
  mcp-server/     registro das tools
  contracts/      schemas zod compartilhados
  corpus/         coleta CVM, normalização, geração de parágrafos
infra/            Dockerfile, workflows, IaC
evals/            dataset de perguntas
scripts/          capstone:check, seed, destroy
```

Regra de dependência: `apps/*` pode importar `packages/*`; `packages/*` nunca importa `apps/*`. `contracts` não importa ninguém.

---

## Comandos

```bash
pnpm dev              # api + web em watch
pnpm build            # build de tudo
pnpm test             # unitários
pnpm test:e2e         # Playwright
pnpm lint             # ESLint + Prettier
pnpm collect          # coleta CVM — só na preparação do material
pnpm seed             # popula pgvector a partir dos JSONs versionados
pnpm capstone:check   # verificações de produção
```

---

## Regras de trabalho

**Pergunte antes de:**
- Instalar qualquer dependência nova.
- Criar uma abstração, interface ou camada que ainda não tem dois usos concretos.
- Alterar o schema do banco ou os schemas em `contracts`.
- Mudar configuração de deploy, workflow ou infraestrutura.
- Reorganizar pastas ou mover arquivos entre pacotes.

**Nunca:**
- Escrever segredo, chave ou connection string em arquivo versionado. Tudo vem de variável de ambiente, e em produção do Secret Manager.
- Commitar os ZIPs ou CSVs brutos da CVM. Apenas os JSONs normalizados são versionados.
- Usar LLM para gerar os parágrafos do corpus. São determinísticos, por template.
- Adicionar `any` sem comentário justificando. `unknown` com narrowing é preferível.
- Escrever teste que depende de rede. Use fixtures ou fakes.

---

## Convenções

**TypeScript**
- `strict: true`. Sem `any` implícito.
- Validação de entrada com zod na fronteira (rota HTTP, tool MCP, leitura de arquivo). Dentro do domínio, confie nos tipos.
- Erros de domínio são classes nomeadas, não strings. A API responde em `application/problem+json`.

**Nomes**
- Arquivos em `kebab-case`. Tipos e classes em `PascalCase`. Funções e variáveis em `camelCase`.
- Nós do grafo têm nome de verbo: `retrieve`, `grade`, `webSearch`, `answer`.

**Testes**
- Unitário para tudo que é determinístico: normalizador, gerador de parágrafos, chunker, parser.
- Comportamento do grafo é testado com LLM fake, nunca com chamada real.
- Um teste de guardrail é obrigatório e não pode ser removido.

**Commits**
- Mensagem no imperativo, em português, sem prefixo convencional.
- Um commit resolve uma coisa. Se a mensagem precisa de "e", provavelmente são dois commits.

---

## Domínio: restrição regulatória

A consultoria de valores mobiliários é atividade regulada pela CVM. **O sistema informa, nunca recomenda.**

Na prática:
- O prompt do nó `answer` proíbe sugestão de compra, venda ou manutenção de posição.
- Toda resposta cita a fonte e o período do dado.
- Existe um teste automatizado que envia "devo comprar X?" e verifica ausência de linguagem recomendatória. Se ele quebrar, o comportamento é o problema — não o teste.
- A interface exibe disclaimer permanente.

---

## O corpus

Fonte única: CVM Dados Abertos, formulários ITR e DFP. 20 empresas da B3, últimos 4 trimestres.

Indicadores extraídos: `receita_liquida`, `lucro_bruto`, `lucro_liquido`, `ativo_total`, `patrimonio_liquido`, `caixa_operacional`. A CVM publica em milhares de reais — a conversão acontece na normalização, uma única vez.

Cada empresa e trimestre vira **um parágrafo autocontido**, gerado por template determinístico, indexado como um chunk sem fragmentação.

Metadados obrigatórios em todo documento: `ticker`, `company_name`, `setor`, `period`, `period_end`, `source_url`, `fetched_at`.

O corpus contém apenas números. Perguntas qualitativas caem no fallback para busca web — isso é intencional e é o que a aula demonstra.

---

## Modelos

**Regra: apenas modelos estáveis.** Modelos em preview são descontinuados com duas semanas de aviso — inaceitável para material gravado que fica no ar por meses. A família Gemini 2.5 está em processo de aposentadoria e não entra no projeto.

| Papel | Modelo | Por quê |
|---|---|---|
| Nó `grade` | `gemini-3.5-flash-lite` | Classificação com saída estruturada. Alto volume, baixa complexidade — é onde o custo se multiplica pelo loop |
| Nó `answer` | `gemini-3.6-flash` | Equilíbrio entre velocidade e qualidade. Precisa acertar citação e respeitar o guardrail |
| Embeddings | `gemini-embedding-001` | Estável e adequado a RAG. O `gemini-embedding-2-preview` é multimodal, mas preview |

**Nome de modelo nunca é hardcoded.** Cada papel tem sua própria variável de ambiente:

```
MODEL_GRADE=gemini-3.5-flash-lite
MODEL_ANSWER=gemini-3.6-flash
MODEL_EMBEDDING=gemini-embedding-001
```

Duas razões: o material sobrevive à troca de modelo sem regravação, e a comparação de custo por nó — visível no trace do Langfuse — é conteúdo da Unidade 5.

Trocar o modelo de embedding invalida o índice inteiro. Se acontecer, o `pnpm seed` precisa rodar de novo do zero.

**Nota:** o Vertex AI vem sendo renomeado para Gemini Enterprise Agent Platform. As URLs da documentação mudaram; a API permanece a mesma.

---

## Skills

O repositório usa duas origens de skills, e a distinção é intencional — ela é parte do conteúdo da Unidade 1.

**Oficiais do Angular**, mantidas pelo time do framework e atualizadas a cada release:

```bash
npx skills add https://github.com/angular/skills
```

- `angular-developer` — geração de código e orientação arquitetural: componentes, serviços, reatividade (signals, `linkedSignal`, `resource`), formulários, injeção de dependência, roteamento, SSR, acessibilidade, animações, estilo, testes e CLI.
- `angular-new-app` — criação de aplicação nova via Angular CLI.

**Do repositório**, em `.claude/skills/`, cobrindo apenas o que é específico deste projeto:

- `fastify-route` — validação, problem+json, SSE.
- `langgraph-node` — assinatura de nó, estado, arestas condicionais, testabilidade.
- `angular-component` — store, consumo de SSE, painel do grafo, disclaimer.
- `frontend-design` — tokens de cor/tipografia/forma e fidelidade ao protótipo do F.1.

Regra de precedência: em conflito entre uma skill oficial e uma do repositório sobre idioma do framework, **a oficial vence**. Skills próprias descrevem decisões deste projeto, não regras da biblioteca.

---

## Observação sobre versões

As versões de Angular, LangGraph.js e dos modelos do Vertex AI mudam com frequência. Ao encontrar divergência entre este arquivo e a API real da biblioteca, siga a biblioteca e avise, em vez de forçar o padrão descrito aqui.
