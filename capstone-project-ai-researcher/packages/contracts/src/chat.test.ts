import { describe, expect, it } from 'vitest';

import { chatRequestSchema, chatStreamEventSchema } from './chat.js';

describe('chatRequestSchema', () => {
  it('aceita uma pergunta não vazia', () => {
    expect(chatRequestSchema.parse({ question: 'Qual a receita da Ambev?' }).question).toBe(
      'Qual a receita da Ambev?',
    );
  });

  it('rejeita pergunta vazia', () => {
    expect(() => chatRequestSchema.parse({ question: '' })).toThrow();
  });
});

describe('chatStreamEventSchema', () => {
  it('aceita o evento do nó retrieve, com o resumo dos documentos', () => {
    expect(() =>
      chatStreamEventSchema.parse({
        node: 'retrieve',
        documents: [
          { id: '1', ticker: 'ABEV', period: '2T25', sourceUrl: 'https://x.example.com' },
        ],
      }),
    ).not.toThrow();
  });

  it('aceita o evento do nó grade', () => {
    expect(() =>
      chatStreamEventSchema.parse({
        node: 'grade',
        sufficient: false,
        missingAspects: ['motivo qualitativo'],
        iterations: 1,
      }),
    ).not.toThrow();
  });

  it('aceita o evento do nó answer', () => {
    expect(() =>
      chatStreamEventSchema.parse({ node: 'answer', answerText: 'A receita foi X.' }),
    ).not.toThrow();
  });

  it('rejeita nó desconhecido', () => {
    expect(() => chatStreamEventSchema.parse({ node: 'inexistente' })).toThrow();
  });
});
