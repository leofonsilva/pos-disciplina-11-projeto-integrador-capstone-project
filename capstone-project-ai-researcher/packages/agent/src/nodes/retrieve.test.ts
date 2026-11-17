import { describe, expect, it, vi } from 'vitest';

import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { makeRetrieveNode } from './retrieve.js';

const documentoFake: RetrievedDoc = {
  id: '1',
  ticker: 'ABEV',
  companyName: 'Ambev S.A.',
  setor: 'Bebidas e Fumo',
  period: '2T25',
  periodEnd: '2025-06-30',
  paragraph: 'No 2T25, a Ambev S.A. reportou receita líquida de R$ 20,1 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/...',
  fetchedAt: new Date('2026-08-08T02:19:40.760Z'),
  distance: 0.08,
};

describe('makeRetrieveNode', () => {
  it('embeda a pergunta e devolve os documentos encontrados pelo buscar', async () => {
    const embeddings = { embedQuery: vi.fn().mockResolvedValue([0.1, 0.2]) };
    const buscar = vi.fn().mockResolvedValue([documentoFake]);

    const node = makeRetrieveNode(embeddings, buscar);
    const result = await node({ question: 'Qual a receita da Ambev?' });

    expect(embeddings.embedQuery).toHaveBeenCalledWith('Qual a receita da Ambev?');
    expect(buscar).toHaveBeenCalledWith([0.1, 0.2], 5);
    expect(result.documents).toEqual([documentoFake]);
  });

  it('usa o topK do estado quando informado, em vez do default', async () => {
    const embeddings = { embedQuery: vi.fn().mockResolvedValue([0.1]) };
    const buscar = vi.fn().mockResolvedValue([]);

    const node = makeRetrieveNode(embeddings, buscar);
    await node({ question: 'x', topK: 10 });

    expect(buscar).toHaveBeenCalledWith([0.1], 10);
  });
});
