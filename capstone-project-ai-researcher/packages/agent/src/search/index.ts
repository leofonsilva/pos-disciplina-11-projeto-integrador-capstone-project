import { criarSearchProviderFixture } from '../web-search/fixtures.js';
import { makeGoogleCustomSearchProvider } from './google-custom-search.js';
import { comResiliencia } from './resilient-search-provider.js';
import { makeSerperProvider } from './serper.js';
import type { SearchProvider } from './types.js';

export * from './types.js';
export { paraResultadosSerper } from './serper.js';
export { paraResultadosGoogle } from './google-custom-search.js';
export { CircuitoAbertoError, comResiliencia } from './resilient-search-provider.js';
export type { OpcoesResiliencia } from './resilient-search-provider.js';

// SEARCH_PROVIDER=serper|google — nunca hardcoded, mesma lógica de MODEL_GRADE/MODEL_ANSWER.
// DEMO=true tem prioridade sobre SEARCH_PROVIDER: demo reproduzível não depende de Serper/
// Google estarem no ar nem de chave configurada. A fixture não passa por comResiliencia —
// é síncrona-em-espírito, sem rede pra ter timeout/retry/circuito.
export function criarSearchProvider(): SearchProvider {
  if (process.env.DEMO === 'true') return criarSearchProviderFixture();

  const provider = process.env.SEARCH_PROVIDER ?? 'serper';

  if (provider === 'serper') {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) throw new Error('SERPER_API_KEY não configurada.');
    return comResiliencia(makeSerperProvider(apiKey));
  }

  if (provider === 'google') {
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const cx = process.env.GOOGLE_CUSTOM_SEARCH_CX;
    if (!apiKey || !cx)
      throw new Error('GOOGLE_CUSTOM_SEARCH_API_KEY/GOOGLE_CUSTOM_SEARCH_CX não configuradas.');
    return comResiliencia(makeGoogleCustomSearchProvider(apiKey, cx));
  }

  throw new Error(`SEARCH_PROVIDER desconhecido: "${provider}" (use "serper" ou "google")`);
}
