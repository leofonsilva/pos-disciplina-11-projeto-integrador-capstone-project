import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { FastifyPluginAsync, FastifyReply } from 'fastify';

import { criarServidor } from './server.js';
import type { GraphLike } from './tools/perguntar.js';

export interface McpHttpRouteOptions {
  graph?: GraphLike;
}

// Registrável tanto no servidor MCP standalone (porta própria, src/http.ts) quanto como
// gateway dentro do apps/api (mesma porta da API, prefixo /api/mcp) — "mesmas tools, duas
// portas": os dois montam este mesmo plugin, só muda onde ele é registrado.
//
// Modo stateless (sessionIdGenerator: undefined, mesmo padrão do exemplo oficial do SDK):
// cada POST cria seu próprio server+transport, sem sessão persistida em memória entre
// chamadas — não guarda nada que precise expirar ou vazar com o tempo. GET/DELETE (só fazem
// sentido em modo com sessão) respondem 405.
const mcpHttpRoute: FastifyPluginAsync<McpHttpRouteOptions> = async (app, { graph } = {}) => {
  app.post('/mcp', async (request, reply) => {
    const server = criarServidor(graph);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    reply.raw.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(request.raw, reply.raw, request.body);
  });

  const metodoNaoPermitido = async (_request: unknown, reply: FastifyReply) => {
    reply.code(405).send({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed — este servidor MCP é stateless.' },
      id: null,
    });
  };

  app.get('/mcp', metodoNaoPermitido);
  app.delete('/mcp', metodoNaoPermitido);
};

export default mcpHttpRoute;
