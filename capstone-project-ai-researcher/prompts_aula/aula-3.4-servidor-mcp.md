# Aula 3.4 — O servidor MCP

## Cena 3 — Tool `perguntar`, transporte stdio

Terminal na raiz do repositório.

```text
Cria packages/mcp-server, um servidor MCP com uma única tool, perguntar: recebe uma pergunta em texto e roda o grafo inteiro que já existe em packages/agent — retrieve → grade → webSearch → answer — devolvendo a resposta final, já citada e com guardrail aplicado. A descrição da tool é lida pelo cliente MCP pra decidir quando chamar — não é documentação pra humano — então precisa deixar claro o domínio (20 empresas da B3, dados da CVM) e repetir o guardrail (nunca recomenda). O grafo é recebido por parâmetro (GetGraph), mesmo padrão de injeção de dependência do resto do projeto, pra testar com fake sem tocar Postgres nem Vertex AI — usa o InMemoryTransport do próprio SDK do MCP pra testar o servidor inteiro. Se o grafo falhar, a tool nunca deixa a exceção crua vazar — devolve isError: true com uma mensagem genérica, mesma filosofia de degradação graciosa da E.6. A construção do grafo real (Postgres + Vertex AI) — incluindo os clients de embeddings, grade e answer, que ainda não existem como módulo reutilizável — deve morar dentro de packages/agent, memoizada por processo: o transporte HTTP desta mesma aula vai precisar exatamente da mesma função. Constrói o grafo real só na primeira chamada, nunca na inicialização do processo. Sobe primeiro o transporte stdio, pro claude mcp add.
```

## Cena 5 — `.env` local pro grafo real

Depois de subir só o Postgres com `docker compose up postgres -d`.

```text
Cria (ou completa, se já existir) o .env na raiz do repositório — é o que tsx --env-file-if-exists=../../.env carrega sozinho em todo pnpm dev do monorepo. Precisa ter: DATABASE_URL apontando pro Postgres local do docker-compose (postgresql://postgres:postgres@localhost:5432/ai_researcher); GOOGLE_CLOUD_PROJECT com o id do projeto GCP deste curso; GOOGLE_CLOUD_LOCATION=global — não us-central1, esses modelos só respondem em global; e os três nomes de modelo, nunca hardcoded no código: MODEL_GRADE=gemini-3.5-flash-lite, MODEL_ANSWER=gemini-3.6-flash, MODEL_EMBEDDING=gemini-embedding-001.
```

## Cena 6 — Conversa real usando a tool MCP

Depois de registrar o servidor. O comando que funcionou, após os dois erros mostrados na aula:

```bash
claude mcp add ai-researcher -- node --env-file=.env packages/mcp-server/dist/index.js
```

Pergunta feita numa conversa nova do Claude Code:

```text
Usando a tool perguntar do servidor ai-researcher, qual foi a receita líquida da Vale no último trimestre?
```

## Cena 8 — Streamable HTTP + gateway em `/api/mcp`

```text
Expõe o packages/mcp-server também via Streamable HTTP, além do stdio que já existe — mesma tool perguntar, um plugin Fastify reutilizável (mcpHttpPlugin), registrável em dois lugares: um servidor standalone com porta própria (MCP_HTTP_PORT, default 3100), e também dentro do apps/api, como gateway em /api/mcp pro Angular consumir, sem CORS novo, reaproveitando a mesma porta e o mesmo proxy que o /chat já usa. Modo stateless — sem sessão guardada em memória entre chamadas, GET/DELETE respondem 405. A superfície pública que o apps/api importa (o plugin, os tipos do grafo) precisa ficar separada dos arquivos que têm efeito colateral ao rodar (o bootstrap do stdio, o app.listen() do servidor HTTP standalone) — importar esse pacote como biblioteca nunca pode disparar nenhum dos dois. E dentro do apps/api, /chat e /mcp devem compartilhar a mesma instância do grafo, não duas separadas — senão viram dois SearchProviders com dois circuit breakers independentes pra mesma API.
```
