import { afterEach, describe, expect, it, vi } from 'vitest';

import { makeSerperProvider, paraResultadosSerper } from './serper.js';

describe('paraResultadosSerper', () => {
  it('mapeia organic pra SearchResult', () => {
    const resultados = paraResultadosSerper({
      organic: [
        { title: 'Vale anuncia resultado', snippet: 'A Vale...', link: 'https://exemplo.com/1' },
      ],
    });

    expect(resultados).toEqual([
      { title: 'Vale anuncia resultado', snippet: 'A Vale...', url: 'https://exemplo.com/1' },
    ]);
  });

  it('devolve lista vazia quando organic está ausente', () => {
    expect(paraResultadosSerper({})).toEqual([]);
  });
});

describe('makeSerperProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia a query no corpo e a API key no header, e mapeia a resposta', async () => {
    const fetchFake = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [{ title: 't', snippet: 's', link: 'https://x.com' }] }),
    });
    vi.stubGlobal('fetch', fetchFake);

    const provider = makeSerperProvider('minha-chave');
    const resultados = await provider.search('receita da Vale');

    expect(fetchFake).toHaveBeenCalledWith(
      'https://google.serper.dev/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-KEY': 'minha-chave' }),
        body: JSON.stringify({ q: 'receita da Vale' }),
      }),
    );
    expect(resultados).toEqual([{ title: 't', snippet: 's', url: 'https://x.com' }]);
  });

  it('lança erro quando a resposta não é ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));

    const provider = makeSerperProvider('minha-chave');

    await expect(provider.search('x')).rejects.toThrow('429');
  });
});
