import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeGoogleCustomSearchProvider, paraResultadosGoogle } from './google-custom-search.js';

describe('paraResultadosGoogle', () => {
  it('mapeia items pra SearchResult', () => {
    const resultados = paraResultadosGoogle({
      items: [
        { title: 'Vale anuncia resultado', snippet: 'A Vale...', link: 'https://exemplo.com/1' },
      ],
    });

    expect(resultados).toEqual([
      { title: 'Vale anuncia resultado', snippet: 'A Vale...', url: 'https://exemplo.com/1' },
    ]);
  });

  it('devolve lista vazia quando items está ausente', () => {
    expect(paraResultadosGoogle({})).toEqual([]);
  });
});

describe('makeGoogleCustomSearchProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia key, cx e q como query params, e mapeia a resposta', async () => {
    const fetchFake = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ title: 't', snippet: 's', link: 'https://x.com' }] }),
    });
    vi.stubGlobal('fetch', fetchFake);

    const provider = makeGoogleCustomSearchProvider('minha-chave', 'meu-cx');
    const resultados = await provider.search('receita da Vale');

    const urlChamada: URL = fetchFake.mock.calls[0][0];
    expect(urlChamada.origin + urlChamada.pathname).toBe(
      'https://www.googleapis.com/customsearch/v1',
    );
    expect(urlChamada.searchParams.get('key')).toBe('minha-chave');
    expect(urlChamada.searchParams.get('cx')).toBe('meu-cx');
    expect(urlChamada.searchParams.get('q')).toBe('receita da Vale');
    expect(resultados).toEqual([{ title: 't', snippet: 's', url: 'https://x.com' }]);
  });

  it('lança erro quando a resposta não é ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const provider = makeGoogleCustomSearchProvider('minha-chave', 'meu-cx');

    await expect(provider.search('x')).rejects.toThrow('403');
  });
});
