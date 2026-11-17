import { describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { criarServidor } from './server.js';
import type { GraphLike } from './tools/perguntar.js';

async function conectar(graph: GraphLike) {
  const [transporteServidor, transporteCliente] = InMemoryTransport.createLinkedPair();
  const servidor = criarServidor(graph);
  const cliente = new Client({ name: 'teste', version: '0.0.0' });

  await Promise.all([servidor.connect(transporteServidor), cliente.connect(transporteCliente)]);

  return cliente;
}

describe('criarServidor', () => {
  it('lista a tool perguntar, com nome e schema de entrada corretos', async () => {
    const graph: GraphLike = { invoke: vi.fn() };
    const cliente = await conectar(graph);

    const { tools } = await cliente.listTools();

    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('perguntar');
    expect(tools[0].inputSchema.properties).toHaveProperty('question');
  });

  it('chama a tool perguntar de ponta a ponta pelo protocolo MCP', async () => {
    const graph: GraphLike = {
      invoke: vi.fn().mockResolvedValue({ answerText: 'A receita foi R$ 56,7 bilhões.' }),
    };
    const cliente = await conectar(graph);

    const resultado = await cliente.callTool({
      name: 'perguntar',
      arguments: { question: 'Qual a receita da Vale?' },
    });

    expect(graph.invoke).toHaveBeenCalledWith({ question: 'Qual a receita da Vale?' });
    expect(resultado.content).toEqual([{ type: 'text', text: 'A receita foi R$ 56,7 bilhões.' }]);
  });
});
