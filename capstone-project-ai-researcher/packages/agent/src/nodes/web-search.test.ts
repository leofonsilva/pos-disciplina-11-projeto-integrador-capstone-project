import { describe, expect, it, vi } from 'vitest';

import type { SearchProvider } from '../search/types.js';
import { makeWebSearchNode } from './web-search.js';

const htmlDaPagina = `
  <html>
    <body>
      <article>
        <h1>Vale anuncia novo projeto</h1>
        <p>A Vale anunciou hoje um novo projeto de expansão em Carajás.</p>
      </article>
    </body>
  </html>
`;

function fakeSearchProvider(urls: string[]): SearchProvider {
  return {
    search: vi
      .fn()
      .mockResolvedValue(urls.map((url, i) => ({ title: `Resultado ${i}`, snippet: '', url }))),
  };
}

describe('makeWebSearchNode', () => {
  it('busca, extrai, faz chunk, embeda e insere um documento por resultado', async () => {
    const searchProvider = fakeSearchProvider(['https://noticias.example.com/vale']);
    const embeddings = { embedQuery: vi.fn().mockResolvedValue([0.1, 0.2]) };
    const buscarPagina = vi.fn().mockResolvedValue(htmlDaPagina);
    const inserirDocumentoWeb = vi.fn().mockResolvedValue(undefined);

    const node = makeWebSearchNode(searchProvider, embeddings, buscarPagina, inserirDocumentoWeb);

    const result = await node({
      question: 'Por que a Vale investiu em Carajás?',
      missingAspects: ['motivo do investimento'],
    });

    expect(searchProvider.search).toHaveBeenCalledWith(
      'Por que a Vale investiu em Carajás? motivo do investimento',
    );
    expect(buscarPagina).toHaveBeenCalledWith('https://noticias.example.com/vale');
    expect(inserirDocumentoWeb).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Resultado 0',
        content: expect.stringContaining('A Vale anunciou hoje'),
        sourceUrl: 'https://noticias.example.com/vale',
        embedding: [0.1, 0.2],
      }),
    );
    expect(result).toEqual({});
  });

  it('usa a pergunta sozinha quando não há missingAspects', async () => {
    const searchProvider = fakeSearchProvider([]);
    const embeddings = { embedQuery: vi.fn() };
    const buscarPagina = vi.fn();
    const inserirDocumentoWeb = vi.fn();

    const node = makeWebSearchNode(searchProvider, embeddings, buscarPagina, inserirDocumentoWeb);
    await node({ question: 'Qual a receita da Vale?', missingAspects: [] });

    expect(searchProvider.search).toHaveBeenCalledWith('Qual a receita da Vale?');
  });

  it('ignora um resultado cuja página falha e continua pros demais', async () => {
    const searchProvider = fakeSearchProvider([
      'https://fora-do-ar.example.com',
      'https://noticias.example.com/vale',
    ]);
    const embeddings = { embedQuery: vi.fn().mockResolvedValue([0.1]) };
    const buscarPagina = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(htmlDaPagina);
    const inserirDocumentoWeb = vi.fn().mockResolvedValue(undefined);

    const node = makeWebSearchNode(searchProvider, embeddings, buscarPagina, inserirDocumentoWeb);
    await node({ question: 'x', missingAspects: [] });

    expect(buscarPagina).toHaveBeenCalledTimes(2);
    expect(inserirDocumentoWeb).toHaveBeenCalledTimes(1);
  });

  it('degrada graciosamente quando o SearchProvider falha — não propaga, segue pra próxima query', async () => {
    const searchProvider: SearchProvider = {
      search: vi
        .fn()
        .mockRejectedValueOnce(new Error('circuito aberto'))
        .mockResolvedValueOnce([{ title: 'Resultado', snippet: '', url: 'https://x.example.com' }]),
    };
    const embeddings = { embedQuery: vi.fn().mockResolvedValue([0.1]) };
    const buscarPagina = vi.fn().mockResolvedValue(htmlDaPagina);
    const inserirDocumentoWeb = vi.fn().mockResolvedValue(undefined);

    const node = makeWebSearchNode(searchProvider, embeddings, buscarPagina, inserirDocumentoWeb);

    const result = await node({
      question: 'Por que a receita caiu?',
      missingAspects: ['motivo A', 'motivo B'],
    });

    expect(result).toEqual({});
    expect(searchProvider.search).toHaveBeenCalledTimes(2); // as duas queries foram tentadas
    expect(inserirDocumentoWeb).toHaveBeenCalledTimes(1); // só a segunda query rendeu documento
  });

  it('aplica o ttlDias informado no cálculo de expiração', async () => {
    const searchProvider = fakeSearchProvider(['https://noticias.example.com/vale']);
    const embeddings = { embedQuery: vi.fn().mockResolvedValue([0.1]) };
    const buscarPagina = vi.fn().mockResolvedValue(htmlDaPagina);
    const inserirDocumentoWeb = vi.fn().mockResolvedValue(undefined);

    const node = makeWebSearchNode(
      searchProvider,
      embeddings,
      buscarPagina,
      inserirDocumentoWeb,
      1,
    );
    await node({ question: 'x', missingAspects: [] });

    const linha = inserirDocumentoWeb.mock.calls[0][0];
    const diffMs = linha.expiresAt.getTime() - linha.fetchedAt.getTime();
    expect(diffMs).toBe(24 * 60 * 60 * 1000);
  });
});
