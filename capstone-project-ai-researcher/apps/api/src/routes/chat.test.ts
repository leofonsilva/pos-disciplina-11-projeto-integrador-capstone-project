import { afterEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';

import chatRoute from './chat.js';
import type { GraphLike } from './chat.js';
import { errorHandler } from '../error-handler.js';

function fakeGraph(chunks: Record<string, unknown>[]): GraphLike {
  return {
    async stream() {
      return (async function* () {
        for (const chunk of chunks) yield chunk;
      })();
    },
  };
}

function parseSse(payload: string): { event?: string; data: unknown }[] {
  return payload
    .split('\n\n')
    .filter((bloco) => bloco.trim().length > 0)
    .map((bloco) => {
      const linhas = bloco.split('\n');
      const dataLinha = linhas.find((linha) => linha.startsWith('data: '));
      const eventoLinha = linhas.find((linha) => linha.startsWith('event: '));
      return {
        event: eventoLinha?.slice('event: '.length),
        data: JSON.parse(dataLinha?.slice('data: '.length) ?? 'null'),
      };
    });
}

afterEach(() => {
  delete process.env.TOKEN_BUDGET_DIARIO;
});

describe('POST /api/chat', () => {
  it('rejeita com problem+json 429 quando o orçamento diário de tokens estourou', async () => {
    process.env.TOKEN_BUDGET_DIARIO = '0';

    const app = Fastify();
    app.setErrorHandler(errorHandler);
    await app.register(chatRoute, { prefix: '/api', graph: fakeGraph([]) });

    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { question: 'x' },
    });

    expect(response.statusCode).toBe(429);
    expect(response.headers['content-type']).toBe('application/problem+json; charset=utf-8');
  });

  it('transmite um evento SSE por nó do grafo, na ordem em que ele roda', async () => {
    const app = Fastify();
    await app.register(chatRoute, {
      prefix: '/api',
      graph: fakeGraph([
        { retrieve: { documents: [] } },
        { grade: { sufficient: true, missingAspects: [], iterations: 1 } },
        { answer: { answerText: 'A receita foi X.' } },
      ]),
    });

    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { question: 'Qual a receita da Vale?' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/event-stream');

    const eventos = parseSse(response.payload);
    expect(eventos.map((e) => (e.data as { node: string }).node)).toEqual([
      'retrieve',
      'grade',
      'answer',
    ]);
    expect(eventos[2].data).toEqual({ node: 'answer', answerText: 'A receita foi X.' });
  });

  it('rejeita question ausente com problem+json de erro de validação', async () => {
    const app = Fastify();
    app.setErrorHandler(errorHandler);
    await app.register(chatRoute, { prefix: '/api', graph: fakeGraph([]) });

    const response = await app.inject({ method: 'POST', url: '/api/chat', payload: {} });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toBe('application/problem+json; charset=utf-8');
  });

  it('emite um evento de erro e encerra o stream se o grafo falhar no meio da execução', async () => {
    const app = Fastify();
    const graph: GraphLike = {
      async stream() {
        return (async function* () {
          yield { retrieve: { documents: [] } };
          throw new Error('Vertex AI indisponível');
        })();
      },
    };
    await app.register(chatRoute, { prefix: '/api', graph });

    const response = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { question: 'x' },
    });

    const eventos = parseSse(response.payload);
    expect(eventos.at(-1)?.event).toBe('error');
  });
});
