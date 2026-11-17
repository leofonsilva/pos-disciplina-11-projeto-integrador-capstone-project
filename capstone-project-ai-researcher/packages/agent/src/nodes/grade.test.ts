import { describe, expect, it, vi } from 'vitest';

import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { makeGradeNode } from './grade.js';

const documentoFake: RetrievedDoc = {
  id: '1',
  ticker: 'VALE',
  companyName: 'Vale S.A.',
  setor: 'Mineração',
  period: '3T25',
  periodEnd: '2025-09-30',
  paragraph: 'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/...',
  fetchedAt: new Date('2026-08-08T02:19:40.760Z'),
  distance: 0.05,
};

function fakeLlm(result: { sufficient: boolean; missingAspects: string[] }) {
  return { withStructuredOutput: () => ({ invoke: vi.fn().mockResolvedValue(result) }) };
}

describe('makeGradeNode', () => {
  it('devolve sufficient true quando o LLM classifica o contexto como suficiente', async () => {
    const node = makeGradeNode(fakeLlm({ sufficient: true, missingAspects: [] }));

    const result = await node({
      question: 'Qual a receita da Vale no 3T25?',
      documents: [documentoFake],
    });

    expect(result.sufficient).toBe(true);
    expect(result.missingAspects).toEqual([]);
  });

  it('devolve sufficient false e os aspectos faltantes quando o contexto é insuficiente', async () => {
    const node = makeGradeNode(
      fakeLlm({ sufficient: false, missingAspects: ['motivo qualitativo da variação'] }),
    );

    const result = await node({
      question: 'Por que a receita da Vale caiu?',
      documents: [documentoFake],
    });

    expect(result.sufficient).toBe(false);
    expect(result.missingAspects).toEqual(['motivo qualitativo da variação']);
  });

  it('sempre reporta um incremento de 1 iteração — o total é responsabilidade do reducer do estado', async () => {
    const node = makeGradeNode(fakeLlm({ sufficient: true, missingAspects: [] }));

    const result = await node({ question: 'x', documents: [] });

    expect(result.iterations).toBe(1);
  });
});
