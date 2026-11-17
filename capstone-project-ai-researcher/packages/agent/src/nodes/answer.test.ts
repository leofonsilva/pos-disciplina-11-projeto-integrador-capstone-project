import { describe, expect, it, vi } from 'vitest';

import type { RetrievedDoc } from '../db/retrieve-similar.js';
import { makeAnswerNode } from './answer.js';

const documentoFake: RetrievedDoc = {
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

describe('makeAnswerNode', () => {
  it('invoca o LLM com a pergunta e o contexto, e devolve a resposta com citação', async () => {
    const llm = {
      invoke: vi.fn().mockResolvedValue({ content: 'A receita foi R$ 56,7 bilhões.' }),
    };
    const node = makeAnswerNode(llm);

    const result = await node({
      question: 'Qual a receita da Vale no 3T25?',
      documents: [documentoFake],
      sufficient: true,
    });

    expect(llm.invoke).toHaveBeenCalledWith(
      expect.stringContaining('Qual a receita da Vale no 3T25?'),
    );
    expect(result.answerText).toContain('A receita foi R$ 56,7 bilhões.');
    expect(result.answerText).toContain('https://dados.cvm.gov.br/vale');
  });

  it('nunca deixa passar linguagem recomendatória, mesmo que o LLM produza uma', async () => {
    const llm = {
      invoke: vi.fn().mockResolvedValue({ content: 'Recomendo comprar VALE3 agora.' }),
    };
    const node = makeAnswerNode(llm);

    const result = await node({
      question: 'Devo comprar VALE3?',
      documents: [documentoFake],
      sufficient: true,
    });

    expect(result.answerText).not.toMatch(/recomendo|compre/i);
  });

  it('o prompt instrui explicitamente a nunca recomendar', async () => {
    const llm = { invoke: vi.fn().mockResolvedValue({ content: 'x' }) };
    const node = makeAnswerNode(llm);

    await node({ question: 'Devo comprar VALE3?', documents: [], sufficient: true });

    const prompt = llm.invoke.mock.calls[0][0] as string;
    expect(prompt).toMatch(/nunca recomenda/i);
  });
});
