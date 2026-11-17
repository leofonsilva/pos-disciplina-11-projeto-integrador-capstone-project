import { describe, expect, it, vi } from 'vitest';

import { custoUsd } from './pricing.js';

describe('custoUsd', () => {
  it('calcula o custo em USD a partir do preço por milhão de tokens do modelo', () => {
    const custo = custoUsd('gemini-3.5-flash-lite', {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });

    expect(custo).toBeCloseTo(0.3 + 2.5);
  });

  it('não cobra output pra modelo de embedding', () => {
    const custo = custoUsd('gemini-embedding-001', { input_tokens: 1_000_000, output_tokens: 500 });

    expect(custo).toBeCloseTo(0.15);
  });

  it('devolve 0 e avisa uma vez pra modelo sem preço cadastrado', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const custo1 = custoUsd('modelo-desconhecido', { input_tokens: 1000, output_tokens: 1000 });
    const custo2 = custoUsd('modelo-desconhecido', { input_tokens: 1000, output_tokens: 1000 });

    expect(custo1).toBe(0);
    expect(custo2).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);

    warn.mockRestore();
  });
});
