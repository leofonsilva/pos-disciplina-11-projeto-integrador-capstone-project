import { describe, expect, it } from 'vitest';

import { retrieveDebugQuerySchema, retrieveDebugResponseSchema } from './retrieve.js';

describe('retrieveDebugQuerySchema', () => {
  it('aceita question sem k e aplica o default 5', () => {
    expect(retrieveDebugQuerySchema.parse({ question: 'Qual a receita da Ambev?' }).k).toBe(5);
  });

  it('converte k de string de query param pra número', () => {
    expect(retrieveDebugQuerySchema.parse({ question: 'x', k: '10' }).k).toBe(10);
  });

  it('rejeita question vazia', () => {
    expect(() => retrieveDebugQuerySchema.parse({ question: '' })).toThrow();
  });

  it('rejeita k acima de 20', () => {
    expect(() => retrieveDebugQuerySchema.parse({ question: 'x', k: '21' })).toThrow();
  });
});

describe('retrieveDebugResponseSchema', () => {
  it('aceita uma lista de documentos válida', () => {
    expect(() =>
      retrieveDebugResponseSchema.parse({
        documents: [
          {
            id: '1',
            ticker: 'ABEV',
            companyName: 'Ambev S.A.',
            setor: 'Bebidas e Fumo',
            period: '2T25',
            periodEnd: '2025-06-30',
            paragraph: 'No 2T25...',
            sourceUrl: 'https://dados.cvm.gov.br/...',
            fetchedAt: '2026-08-08T02:19:40.760Z',
            distance: 0.12,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('aceita um documento web, sem os campos exclusivos do corpus CVM', () => {
    expect(() =>
      retrieveDebugResponseSchema.parse({
        documents: [
          {
            id: '2',
            title: 'Vale anuncia novo projeto',
            paragraph: 'A Vale anunciou hoje um novo projeto de expansão em Carajás.',
            sourceUrl: 'https://noticias.example.com/vale-projeto',
            fetchedAt: '2026-08-09T00:00:00.000Z',
            distance: 0.2,
          },
        ],
      }),
    ).not.toThrow();
  });
});
