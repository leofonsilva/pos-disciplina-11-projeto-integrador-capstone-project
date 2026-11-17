# Aula 2.4 — Fallback pra busca web e o upsert retroativo

## Cena 3 — O nó `web_search`

Terminal em `packages/agent`.

```text
Crie o nó web_search (packages/agent/src/nodes/web-search.ts). Recebe question e missingAspects do estado. Monta uma query por aspecto faltante (${question} ${aspecto}), ou só a pergunta se a lista estiver vazia. Para cada query, chama searchProvider.search(), pega os 3 primeiros resultados, busca o HTML de cada URL (fetch nativo, timeout de 10s), extrai texto legível (sem tags), divide em chunks de ~1000 caracteres com sobreposição de 100, gera embedding de cada chunk e insere um documento por chunk numa tabela nova documentos_web — com query, title, content, sourceUrl, fetchedAt e expiresAt calculado a partir de um TTL em dias (default 7). Se uma página falhar (fora do ar, timeout), ignora esse resultado e segue pros outros, sem derrubar o nó inteiro. Estenda buscarDocumentosSimilares (o mesmo usado pelo nó retrieve da aula passada) pra também consultar documentos_web — filtrando expirados — e combinar os resultados dos dois com o do corpus CVM, ordenado só pela distância. Tudo testável com fakes, sem rede nem Postgres real.
```
