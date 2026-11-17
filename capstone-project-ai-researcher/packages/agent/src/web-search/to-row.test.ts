import { describe, expect, it } from 'vitest';

import { paraLinhaWeb } from './to-row.js';

describe('paraLinhaWeb', () => {
  it('calcula expiresAt a partir de fetchedAt e ttlDias', () => {
    const fetchedAt = new Date('2026-08-09T12:00:00.000Z');

    const linha = paraLinhaWeb({
      query: 'Vale projeto Carajás',
      title: 'Vale anuncia novo projeto',
      content: 'A Vale anunciou hoje um novo projeto de expansão em Carajás.',
      sourceUrl: 'https://noticias.example.com/vale-projeto',
      fetchedAt,
      ttlDias: 7,
      embedding: [0.1, 0.2],
    });

    expect(linha.expiresAt).toEqual(new Date('2026-08-16T12:00:00.000Z'));
    expect(linha.fetchedAt).toEqual(fetchedAt);
    expect(linha.embedding).toEqual([0.1, 0.2]);
  });
});
