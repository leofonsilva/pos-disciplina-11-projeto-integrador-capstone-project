import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CircuitoAbertoError, OrcamentoDiarioExcedidoError } from '@hero/agent';

import { paraProblema } from './error-handler.js';

describe('paraProblema', () => {
  it('mapeia ZodError pra 400, com o path e a mensagem de cada issue', () => {
    let erro: Error;
    try {
      z.object({ question: z.string() }).parse({});
      throw new Error('não deveria chegar aqui');
    } catch (e) {
      erro = e as Error;
    }

    const problema = paraProblema(erro);

    expect(problema.status).toBe(400);
    expect(problema.title).toBe('Entrada inválida');
    expect(problema.detail).toContain('question');
  });

  it('mapeia CircuitoAbertoError pra 503', () => {
    const problema = paraProblema(new CircuitoAbertoError());

    expect(problema.status).toBe(503);
    expect(problema.title).toBe('Busca temporariamente indisponível');
  });

  it('mapeia OrcamentoDiarioExcedidoError pra 429', () => {
    const problema = paraProblema(new OrcamentoDiarioExcedidoError(1_000_000));

    expect(problema.status).toBe(429);
    expect(problema.title).toBe('Orçamento diário de tokens excedido');
  });

  it('mapeia qualquer outro erro pra 500, sem vazar detalhe interno', () => {
    const problema = paraProblema(new Error('detalhe interno sensível — stack trace, etc.'));

    expect(problema.status).toBe(500);
    expect(problema.detail).not.toContain('detalhe interno sensível');
  });
});
