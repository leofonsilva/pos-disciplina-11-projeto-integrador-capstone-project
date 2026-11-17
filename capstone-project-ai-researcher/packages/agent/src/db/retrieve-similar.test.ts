import { describe, expect, it } from 'vitest';

import { combinarResultados } from './retrieve-similar.js';
import type { RetrievedDoc } from './retrieve-similar.js';

function docCorpus(distance: number): RetrievedDoc {
  return {
    id: `corpus-${distance}`,
    ticker: 'VALE',
    companyName: 'Vale S.A.',
    setor: 'Mineração',
    period: '3T25',
    periodEnd: '2025-09-30',
    paragraph: 'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
    sourceUrl: 'https://dados.cvm.gov.br/...',
    fetchedAt: new Date('2026-08-08T00:00:00.000Z'),
    distance,
  };
}

function docWeb(distance: number): RetrievedDoc {
  return {
    id: `web-${distance}`,
    title: 'Vale anuncia novo projeto de minério',
    paragraph: 'A Vale anunciou hoje um novo projeto de expansão em Carajás.',
    sourceUrl: 'https://noticias.example.com/vale-projeto',
    fetchedAt: new Date('2026-08-09T00:00:00.000Z'),
    distance,
  };
}

describe('combinarResultados', () => {
  it('intercala corpus e web ordenando só pela distância', () => {
    const resultado = combinarResultados([docCorpus(0.3), docCorpus(0.1)], [docWeb(0.2)], 5);

    expect(resultado.map((doc) => doc.id)).toEqual(['corpus-0.1', 'web-0.2', 'corpus-0.3']);
  });

  it('corta em k mesmo com mais resultados combinados que k', () => {
    const resultado = combinarResultados(
      [docCorpus(0.1), docCorpus(0.2)],
      [docWeb(0.05), docWeb(0.3)],
      2,
    );

    expect(resultado.map((doc) => doc.id)).toEqual(['web-0.05', 'corpus-0.1']);
  });
});
