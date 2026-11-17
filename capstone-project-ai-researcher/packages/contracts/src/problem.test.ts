import { describe, expect, it } from 'vitest';

import { problemDetailsSchema } from './problem.js';

describe('problemDetailsSchema', () => {
  it('aceita um problem details válido', () => {
    expect(() =>
      problemDetailsSchema.parse({
        type: 'https://ai-researcher.dev/problems/entrada-invalida',
        title: 'Entrada inválida',
        status: 400,
        detail: 'question: obrigatório',
      }),
    ).not.toThrow();
  });

  it('rejeita status como string', () => {
    expect(() =>
      problemDetailsSchema.parse({
        type: 'x',
        title: 'x',
        status: '400',
        detail: 'x',
      }),
    ).toThrow();
  });
});
