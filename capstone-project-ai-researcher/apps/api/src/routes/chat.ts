import type { FastifyPluginAsync } from 'fastify';
import { chatRequestSchema, chatStreamEventSchema } from '@hero/contracts';
import { verificarOrcamento } from '@hero/agent';

import { paraEventoSse } from './chat-event.js';

// Só o formato mínimo que a rota usa do CompiledStateGraph do LangGraph — permite fake em
// teste sem subir o grafo de verdade (ver fastify-route skill: dependência externa entra
// pela injeção do caso de uso, nunca por mock de módulo).
export interface GraphLike {
  stream(input: { question: string }): Promise<AsyncIterable<Record<string, unknown>>>;
}

export interface ChatRouteOptions {
  graph: GraphLike;
}

const chatRoute: FastifyPluginAsync<ChatRouteOptions> = async (app, { graph }) => {
  app.post('/chat', async (request, reply) => {
    const { question } = chatRequestSchema.parse(request.body);
    // Checado antes do writeHead: se lançar, ainda dá pra responder com um status HTTP normal
    // (429 via error-handler), não um evento SSE de erro — depois do writeHead a resposta já
    // é 200, sem volta.
    verificarOrcamento();

    // `no-transform` é obrigatório: sem ele o streaming é bufferizado no Cloud Run e a
    // resposta chega de uma vez, não token a token / nó a nó.
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    });

    try {
      for await (const chunk of await graph.stream({ question })) {
        for (const [node, update] of Object.entries(chunk)) {
          const evento = chatStreamEventSchema.parse(paraEventoSse(node, update));
          reply.raw.write(`data: ${JSON.stringify(evento)}\n\n`);
        }
      }
    } catch (error) {
      request.log.error(error);
      reply.raw.write(
        `event: error\ndata: ${JSON.stringify({ message: 'Erro ao processar a pergunta.' })}\n\n`,
      );
    } finally {
      reply.raw.end();
    }
  });
};

export default chatRoute;
