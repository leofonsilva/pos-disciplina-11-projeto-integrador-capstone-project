import { describe, expect, it } from 'vitest';

import { dividirEmChunks } from './chunk.js';

describe('dividirEmChunks', () => {
  it('devolve um único chunk pra texto curto', async () => {
    const chunks = await dividirEmChunks('A Vale anunciou hoje um novo projeto em Carajás.');

    expect(chunks).toHaveLength(1);
  });

  it('divide texto longo em mais de um chunk', async () => {
    const paragrafo = 'A Vale anunciou hoje um novo projeto de expansão em Carajás. '.repeat(50);

    const chunks = await dividirEmChunks(paragrafo);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });

  it('devolve lista vazia pra texto vazio', async () => {
    expect(await dividirEmChunks('')).toEqual([]);
  });
});
