import type { RateLimitOptions } from '@fastify/rate-limit';

export class LimiteDeRequisicoesExcedidoError extends Error {
  constructor() {
    super('Limite de requisições excedido. Tente novamente em instantes.');
    this.name = 'LimiteDeRequisicoesExcedidoError';
  }
}

// RATE_LIMIT_MAX/RATE_LIMIT_WINDOW nunca hardcoded, mesma lógica de MODEL_GRADE/MODEL_ANSWER.
// errorResponseBuilder devolve a instância do erro (não um objeto solto): o plugin faz
// `throw errorResponseBuilder(...)` internamente, então isso passa pelo app.setErrorHandler()
// central igual a qualquer outro erro de domínio (CircuitoAbertoError, OrcamentoDiarioExcedidoError)
// — nunca formata a resposta aqui, error-handler.ts é o único lugar que sabe o formato
// problem+json.
// Função, não objeto no carregamento do módulo: as env vars precisam ser lidas no momento do
// build() (dentro de app.ts), não na hora em que este arquivo é importado — mesmo motivo do
// bug do MeterProvider em otel-metrics.ts (G.3), só que aqui o efeito seria env var lida cedo
// demais em teste, não perda de dado em produção.
export function criarRateLimitOptions(): RateLimitOptions {
  return {
    max: Number(process.env.RATE_LIMIT_MAX ?? 20),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '1 minute',
    errorResponseBuilder: () => new LimiteDeRequisicoesExcedidoError(),
  };
}
