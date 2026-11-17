# Aula 2.3 — Serper

## Cena 5 — `SearchProvider` com Serper e Google Custom Search

Terminal em `packages/agent`.

```text
Crie packages/agent/src/search com uma interface SearchProvider mínima (search(query: string): Promise<SearchResult[]>, com SearchResult tendo title, snippet, url). Implemente duas versões reais usando fetch nativo, sem SDK de nenhum provedor: makeSerperProvider(apiKey) chamando POST https://google.serper.dev/search com a chave no header X-API-KEY e a query no corpo ({ q: query }), mapeando organic[] pra SearchResult[]; e makeGoogleCustomSearchProvider(apiKey, cx) chamando GET https://www.googleapis.com/customsearch/v1 com key, cx e q como query params, mapeando items[]. Um criarSearchProvider() em index.ts lê SEARCH_PROVIDER (default serper), valida que a(s) variável(is) de ambiente da chave existem, e lança erro claro se não existirem ou se o provider for desconhecido. Teste os dois providers e a fábrica com fetch fake (vi.stubGlobal), sem rede real.
```
