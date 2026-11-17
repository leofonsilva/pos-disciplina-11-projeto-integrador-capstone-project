# Aula 5.2 — /metrics, budget de tokens e rate limiting

## Cena 2 — Contadores de tokens e custo

```text
Crie contadores Prometheus (prom-client) num Registry próprio: llm_tokens_total (labels node, model, kind) e llm_cost_usd_total (labels node, model). Crie um callback LangChain genérico que correlacione handleChatModelStart/handleLLMEnd por runId, lendo metadata.langgraph_node e metadata.ls_model_name, e incremente os contadores a partir do usage_metadata real devolvido pela Vertex AI — nunca uma estimativa. O custo vem de uma tabela de preço USD por milhão de tokens; modelo fora da tabela loga aviso e conta como custo zero, nunca quebra a resposta. Esse callback deve entrar somado ao criarLangfuseCallbacks() já existente — callbacks: [...criarLangfuseCallbacks(), criarMetricsCallback()] — no mesmo call site do graph.stream()/invoke() em apps/api/src/app.ts, nunca sozinho dentro de llm.ts: o LangGraph propaga o callback manager por AsyncLocalStorage, e um callbacks explícito dentro de um nó substituiria esse ambiente em vez de somar a ele.
```

## Cena 4 — `GET /api/metrics`

```text
Exponha GET /api/metrics no formato Prometheus, usando o Registry já criado. Defina uma interface mínima pro registry, não o tipo concreto do prom-client, pra apps/api não ganhar essa dependência.
```

## Cena 6 — Rate limiting + budget diário de tokens

```text
Adicione rate limiting global com @fastify/rate-limit, configurável por RATE_LIMIT_MAX/RATE_LIMIT_WINDOW, desligado em /health e /metrics, com as opções calculadas dentro de uma função chamada em build() — não num objeto de módulo lido no import, pra funcionar tanto em produção quanto em teste que ajusta a env var em runtime. Adicione um budget diário de tokens em memória, que zera na virada do dia UTC, alimentado pela mesma fonte de tokens do callback de métricas — não uma segunda contagem. Verifique o orçamento no início da rota /chat, antes de escrever qualquer byte da resposta SSE.
```
