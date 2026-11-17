import { describe, expect, it } from 'vitest';
import { criarBuscarDemo } from './retrieve-demo.js';

describe('criarBuscarDemo', () => {
  it('devolve sempre o mesmo documento fixo, ignorando embedding e k', async () => {
    const buscar = criarBuscarDemo();

    const resultado = await buscar([1, 2, 3], 5);

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toMatchObject({
      ticker: 'VALE',
      period: '3T25',
      periodEnd: '2025-09-30',
    });
  });
});
