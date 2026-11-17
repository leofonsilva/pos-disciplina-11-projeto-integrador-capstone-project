import type { FastifyPluginAsync } from 'fastify';
import { retrieveDebugQuerySchema, retrieveDebugResponseSchema } from '@hero/contracts';
import type { Buscar, EmbeddingsClient } from '@hero/agent';
import { makeRetrieveNode } from '@hero/agent';

export interface DebugRetrieveRouteOptions {
  embeddings: EmbeddingsClient;
  buscar: Buscar;
}

const debugRetrieveRoute: FastifyPluginAsync<DebugRetrieveRouteOptions> = async (
  app,
  { embeddings, buscar },
) => {
  const retrieve = makeRetrieveNode(embeddings, buscar);

  app.get('/debug/retrieve', async (request) => {
    const { question, k } = retrieveDebugQuerySchema.parse(request.query);
    const { documents } = await retrieve({ question, topK: k });

    return retrieveDebugResponseSchema.parse({
      documents: documents.map((documento) => ({
        ...documento,
        fetchedAt: documento.fetchedAt.toISOString(),
      })),
    });
  });
};

export default debugRetrieveRoute;
