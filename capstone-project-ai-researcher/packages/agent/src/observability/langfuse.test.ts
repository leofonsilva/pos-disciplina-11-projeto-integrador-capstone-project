import { CallbackHandler } from '@langfuse/langchain';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarLangfuseCallbacks, registrarLangfuseTracing } from './langfuse.js';

afterEach(() => {
  delete process.env.LANGFUSE_PUBLIC_KEY;
  delete process.env.LANGFUSE_SECRET_KEY;
});

describe('criarLangfuseCallbacks', () => {
  it('sem LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY, devolve array vazio', () => {
    expect(criarLangfuseCallbacks()).toEqual([]);
  });

  it('com as duas credenciais, devolve um CallbackHandler', () => {
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-teste';
    process.env.LANGFUSE_SECRET_KEY = 'sk-lf-teste';

    const callbacks = criarLangfuseCallbacks();

    expect(callbacks).toHaveLength(1);
    expect(callbacks[0]).toBeInstanceOf(CallbackHandler);
  });

  it('com só uma das duas credenciais, ainda devolve array vazio', () => {
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-teste';

    expect(criarLangfuseCallbacks()).toEqual([]);
  });
});

// registrarLangfuseTracing tem estado no nível do módulo (idempotência) — os testes rodam
// nessa ordem de propósito: o de "sem credenciais" primeiro, antes de qualquer chamada
// configurada marcar o tracer como já registrado.
describe('registrarLangfuseTracing', () => {
  it('sem credenciais, não registra o tracer provider', () => {
    const spy = vi.spyOn(NodeTracerProvider.prototype, 'register').mockImplementation(() => {});

    registrarLangfuseTracing();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('com credenciais, registra o tracer provider uma única vez mesmo chamado duas vezes', () => {
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-lf-teste';
    process.env.LANGFUSE_SECRET_KEY = 'sk-lf-teste';
    const spy = vi.spyOn(NodeTracerProvider.prototype, 'register').mockImplementation(() => {});

    registrarLangfuseTracing();
    registrarLangfuseTracing();

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});
