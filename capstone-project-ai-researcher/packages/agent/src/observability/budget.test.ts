import { afterEach, describe, expect, it } from 'vitest';

import {
  OrcamentoDiarioExcedidoError,
  registrarConsumoDeTokens,
  verificarOrcamento,
} from './budget.js';

afterEach(() => {
  delete process.env.TOKEN_BUDGET_DIARIO;
});

describe('verificarOrcamento', () => {
  it('sem TOKEN_BUDGET_DIARIO configurada, nunca lança, mesmo com consumo alto', () => {
    registrarConsumoDeTokens(10_000_000);

    expect(() => verificarOrcamento()).not.toThrow();
  });

  it('com TOKEN_BUDGET_DIARIO configurada e consumo abaixo do limite, não lança', () => {
    process.env.TOKEN_BUDGET_DIARIO = '999999999999';

    expect(() => verificarOrcamento()).not.toThrow();
  });

  it('com TOKEN_BUDGET_DIARIO configurada e consumo no limite ou acima, lança OrcamentoDiarioExcedidoError', () => {
    // O teste anterior (sem TOKEN_BUDGET_DIARIO) já registrou 10_000_000 tokens no contador
    // do dia — module-level, compartilhado entre os `it()` deste arquivo, mesmo padrão de
    // langfuse.test.ts/metrics.test.ts. Um limite de 1 token garante estourar independente do
    // que já foi consumido antes neste arquivo.
    process.env.TOKEN_BUDGET_DIARIO = '1';

    expect(() => verificarOrcamento()).toThrow(OrcamentoDiarioExcedidoError);
  });
});
