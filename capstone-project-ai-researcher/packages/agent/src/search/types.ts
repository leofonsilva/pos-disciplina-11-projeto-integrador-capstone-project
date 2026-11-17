export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export interface SearchProvider {
  search(query: string): Promise<SearchResult[]>;
}
