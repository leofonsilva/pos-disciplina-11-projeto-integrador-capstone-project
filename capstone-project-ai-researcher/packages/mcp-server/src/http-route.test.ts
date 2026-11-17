import { afterEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

import mcpHttpRoute from './http-route.js';
import type { GraphLike } from './tools/perguntar.js';

async function subirServidor(graph: GraphLike) {
  const app = Fastify();
  await app.register(mcpHttpRoute, { graph });
  const enderecoBase = await app.listen({ port: 0, host: '127.0.0.1' });
  return { app, enderecoBase };
}

describe('mcpHttpRoute', () => {
  let app: Awaited<ReturnType<typeof subirServidor>>['app'] | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('serve a tool perguntar via Streamable HTTP, de ponta a ponta', async () => {
    const graph: GraphLike = {
      invoke: vi.fn().mockResolvedValue({ answerText: 'A receita foi R$ 56,7 bilhões.' }),
    };
    const servidor = await subirServidor(graph);
    app = servidor.app;

    const transport = new StreamableHTTPClientTransport(new URL(`${servidor.enderecoBase}/mcp`));
    const cliente = new Client({ name: 'teste-http', version: '0.0.0' });
    await cliente.connect(transport);

    const { tools } = await cliente.listTools();
    expect(tools.map((t) => t.name)).toEqual(['perguntar']);

    const resultado = await cliente.callTool({
      name: 'perguntar',
      arguments: { question: 'Qual a receita da Vale?' },
    });

    expect(graph.invoke).toHaveBeenCalledWith({ question: 'Qual a receita da Vale?' });
    expect(resultado.content).toEqual([{ type: 'text', text: 'A receita foi R$ 56,7 bilhões.' }]);

    await cliente.close();
  });

  it('GET e DELETE respondem 405 — servidor stateless não tem sessão pra retomar', async () => {
    const servidor = await subirServidor({ invoke: vi.fn() });
    app = servidor.app;

    const getResponse = await fetch(`${servidor.enderecoBase}/mcp`);
    expect(getResponse.status).toBe(405);

    const deleteResponse = await fetch(`${servidor.enderecoBase}/mcp`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(405);
  });
});
