# Aula 2.1 — pgvector, HNSW e o seed do corpus

## Cena 6 — Schema da tabela `documentos`

Terminal em `packages/agent`, depois da tag `v1`.

```text
Crie o schema Drizzle da tabela documentos em packages/agent/src/db/schema.ts: colunas para todos os campos do corpus (ticker, company_name, setor, period, period_end, os seis indicadores financeiros como bigint, source_url, fetched_at, o paragraph já pronto) mais uma coluna embedding do tipo vector(768) do pgvector. Adicione um índice único em (ticker, period) e um índice HNSW na coluna embedding usando o operador de distância de cosseno. Gere a migration com drizzle-kit.
```

## Cena 8 — Script de seed

```text
Crie um script de seed em packages/agent/src/seed/run.ts que lê todos os JSONs de packages/corpus/data/documentos/, valida com um schema zod, gera o embedding do campo paragraph de cada documento chamando a Vertex AI em lotes de 10 (não um por vez), e insere no Postgres via Drizzle com upsert por (ticker, period) — se rodar de novo, atualiza em vez de duplicar. Separe a criação do cliente de embeddings reais numa função própria, porque o modo DEMO do projeto (aula futura) vai precisar trocar isso por um fake sem chamar rede.
```
