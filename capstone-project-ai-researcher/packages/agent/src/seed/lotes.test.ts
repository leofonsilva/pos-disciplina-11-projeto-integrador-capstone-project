import { describe, expect, it } from 'vitest';

import { emLotes } from './lotes.js';

describe('emLotes', () => {
  it('divide em lotes do tamanho informado', () => {
    expect(emLotes([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('devolve um único lote quando o tamanho excede a lista', () => {
    expect(emLotes([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('devolve lista vazia para entrada vazia', () => {
    expect(emLotes([], 10)).toEqual([]);
  });
});
