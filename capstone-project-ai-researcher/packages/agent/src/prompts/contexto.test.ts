import { describe, expect, it } from 'vitest';

import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { formatarContexto } from './contexto.js';

const docCorpus: RetrievedDoc = {
  id: '1',
  ticker: 'VALE',
  companyName: 'Vale S.A.',
  setor: 'Mineração',
  period: '3T25',
  periodEnd: '2025-09-30',
  paragraph: 'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/...',
  fetchedAt: new Date('2026-08-08T00:00:00.000Z'),
  distance: 0.05,
};

const docWeb: RetrievedDoc = {
  id: '2',
  title: 'Vale anuncia novo projeto',
  paragraph: 'A Vale anunciou hoje um novo projeto de expansão em Carajás.',
  sourceUrl: 'https://noticias.example.com/vale-projeto',
  fetchedAt: new Date('2026-08-09T00:00:00.000Z'),
  distance: 0.2,
};

describe('formatarContexto', () => {
  it('formata documento do corpus com ticker e período', () => {
    expect(formatarContexto([docCorpus])).toBe(
      '- [VALE 3T25] No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
    );
  });

  it('formata documento web com o título, marcado como web', () => {
    expect(formatarContexto([docWeb])).toBe(
      '- [web: Vale anuncia novo projeto] A Vale anunciou hoje um novo projeto de expansão em Carajás.',
    );
  });

  it('devolve string vazia pra lista vazia', () => {
    expect(formatarContexto([])).toBe('');
  });
});
