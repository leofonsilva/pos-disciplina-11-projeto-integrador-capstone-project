import {
  buildGraph,
  criarGraphDepsPadrao,
  criarLangfuseCallbacks,
  criarMetricsCallback,
} from '@hero/agent';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { makePerguntarTool, perguntarConfig } from './tools/perguntar.js';
import type { GraphLike } from './tools/perguntar.js';

// Constrói o grafo real só na primeira chamada da tool, não na inicialização do servidor —
// mesmo motivo do apps/api/src/app.ts: criarSearchProvider() lança erro síncrono se
// SERPER_API_KEY/GOOGLE_CUSTOM_SEARCH_* faltar, e isso não deve impedir o servidor MCP de
// subir e listar suas tools.
function criarGraphPadrao(): GraphLike {
  let grafoReal: ReturnType<typeof buildGraph> | undefined;

  return {
    async invoke(input) {
      grafoReal ??= buildGraph(criarGraphDepsPadrao());
      return grafoReal.invoke(input, {
        callbacks: [...criarLangfuseCallbacks(), criarMetricsCallback()],
      });
    },
  };
}

// Registro das tools — compartilhado pelos dois transportes (stdio e Streamable HTTP): mesma
// config/callback, só muda como o cliente se conecta. graph é injetável pra teste, com
// default de produção.
export function criarServidor(graph: GraphLike = criarGraphPadrao()): McpServer {
  const server = new McpServer({ name: 'ai-researcher', version: '0.0.0' });

  server.registerTool('perguntar', perguntarConfig, makePerguntarTool(graph));

  return server;
}
