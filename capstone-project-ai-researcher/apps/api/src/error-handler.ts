import { ZodError } from 'zod';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { CircuitoAbertoError, OrcamentoDiarioExcedidoError } from '@hero/agent';
import type { ProblemDetails } from '@hero/contracts';

import { LimiteDeRequisicoesExcedidoError } from './rate-limit.js';

const BASE_URL = 'https://ai-researcher.dev/problems';

export function paraProblema(error: Error): ProblemDetails {
  if (error instanceof ZodError) {
    return {
      type: `${BASE_URL}/entrada-invalida`,
      title: 'Entrada inválida',
      status: 400,
      detail: error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
    };
  }

  if (error instanceof CircuitoAbertoError) {
    return {
      type: `${BASE_URL}/busca-indisponivel`,
      title: 'Busca temporariamente indisponível',
      status: 503,
      detail: error.message,
    };
  }

  if (error instanceof OrcamentoDiarioExcedidoError) {
    return {
      type: `${BASE_URL}/orcamento-excedido`,
      title: 'Orçamento diário de tokens excedido',
      status: 429,
      detail: error.message,
    };
  }

  if (error instanceof LimiteDeRequisicoesExcedidoError) {
    return {
      type: `${BASE_URL}/limite-de-requisicoes`,
      title: 'Limite de requisições excedido',
      status: 429,
      detail: error.message,
    };
  }

  return {
    type: `${BASE_URL}/erro-interno`,
    title: 'Erro interno',
    status: 500,
    detail: 'Ocorreu um erro inesperado. Tente novamente.',
  };
}

// Registrado uma única vez via app.setErrorHandler() — nenhuma rota trata erro por conta
// própria (ver fastify-route skill). Formato único: application/problem+json em toda a API.
export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  const problema = paraProblema(error);
  request.log.error(error);
  reply.code(problema.status).type('application/problem+json').send(problema);
}
