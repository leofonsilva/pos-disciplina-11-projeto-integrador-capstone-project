import type { SearchProvider, SearchResult } from './types.js';

// Formato de resposta documentado em https://serper.dev/ — só os campos que usamos.
interface SerperResponse {
  organic?: { title: string; snippet: string; link: string }[];
}

export function paraResultadosSerper(resposta: SerperResponse): SearchResult[] {
  return (resposta.organic ?? []).map((item) => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
  }));
}

const TIMEOUT_MS = 10_000;

export function makeSerperProvider(apiKey: string): SearchProvider {
  return {
    async search(query: string): Promise<SearchResult[]> {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: query }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`Serper respondeu ${response.status} pra "${query}"`);
      }

      return paraResultadosSerper((await response.json()) as SerperResponse);
    },
  };
}
