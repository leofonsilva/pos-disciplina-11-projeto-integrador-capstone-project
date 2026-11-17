import { describe, expect, it } from 'vitest';

import type { RetrievedDoc } from '@hero/agent';
import { paraEventoSse } from './chat-event.js';

const docCorpus: RetrievedDoc = {
  id: '1',
  ticker: 'VALE',
  companyName: 'Vale S.A.',
  setor: 'Mineração',
  period: '3T25',
  periodEnd: '2025-09-30',
  paragraph: 'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/vale',
  fetchedAt: new Date('2026-08-08T00:00:00.000Z'),
  distance: 0.05,
};

describe('paraEventoSse', () => {
  it('resume os documentos do retrieve, sem o paragraph inteiro', () => {
    const evento = paraEventoSse('retrieve', { documents: [docCorpus] });

    expect(evento).toEqual({
      node: 'retrieve',
      documents: [
        {
          id: '1',
          ticker: 'VALE',
          period: '3T25',
          title: undefined,
          sourceUrl: 'https://dados.cvm.gov.br/vale',
        },
      ],
    });
  });

  it('repassa sufficient/missingAspects/iterations do grade', () => {
    const evento = paraEventoSse('grade', {
      sufficient: false,
      missingAspects: ['motivo qualitativo'],
      iterations: 1,
    });

    expect(evento).toEqual({
      node: 'grade',
      sufficient: false,
      missingAspects: ['motivo qualitativo'],
      iterations: 1,
    });
  });

  it('repassa o answerText do answer', () => {
    const evento = paraEventoSse('answer', { answerText: 'A receita foi X.' });

    expect(evento).toEqual({ node: 'answer', answerText: 'A receita foi X.' });
  });

  it('devolve só o nome do nó pro webSearch, que não produz campo de estado', () => {
    expect(paraEventoSse('webSearch', {})).toEqual({ node: 'webSearch' });
  });
});
