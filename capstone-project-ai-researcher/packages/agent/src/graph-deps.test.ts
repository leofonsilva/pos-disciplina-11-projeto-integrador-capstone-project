import { afterEach, describe, expect, it } from 'vitest';
import { criarGraphDepsPadrao } from './graph-deps.js';

describe('criarGraphDepsPadrao', () => {
  afterEach(() => {
    delete process.env.DEMO;
  });

  it('com DEMO=true, buscar() devolve a fixture sem tocar o Postgres', async () => {
    process.env.DEMO = 'true';

    const deps = criarGraphDepsPadrao();
    const documentos = await deps.buscar([0], 5);

    expect(documentos).toHaveLength(1);
    expect(documentos[0]).toMatchObject({ ticker: 'VALE', period: '3T25' });
  });
});
