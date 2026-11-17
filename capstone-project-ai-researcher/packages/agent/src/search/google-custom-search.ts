import type { SearchProvider, SearchResult } from './types.js';

// Formato de resposta da Custom Search JSON API — só os campos que usamos.
// https://developers.google.com/custom-search/v1/reference/rest/v1/Search
interface GoogleCustomSearchResponse {
  items?: { title: string; snippet: string; link: string }[];
}

export function paraResultadosGoogle(resposta: GoogleCustomSearchResponse): SearchResult[] {
  return (resposta.items ?? []).map((item) => ({
    title: item.title,
    snippet: item.snippet,
    url: item.link,
  }));
}

const TIMEOUT_MS = 10_000;

export function makeGoogleCustomSearchProvider(apiKey: string, cx: string): SearchProvider {
  return {
    async search(query: string): Promise<SearchResult[]> {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', apiKey);
      url.searchParams.set('cx', cx);
      url.searchParams.set('q', query);

      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

      if (!response.ok) {
        throw new Error(`Google Custom Search respondeu ${response.status} pra "${query}"`);
      }

      return paraResultadosGoogle((await response.json()) as GoogleCustomSearchResponse);
    },
  };
}
