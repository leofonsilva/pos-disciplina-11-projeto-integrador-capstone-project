import { afterEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { build } from './app.js';

const documentoFake = {
  id: '1',
  ticker: 'ABEV',
  companyName: 'Ambev S.A.',
  setor: 'Bebidas e Fumo',
  period: '2T25',
  periodEnd: '2025-06-30',
  paragraph: 'No 2T25, a Ambev S.A. reportou receita líquida de R$ 20,1 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/...',
  fetchedAt: new Date('2026-08-08T02:19:40.760Z'),
  distance: 0.08,
};

describe('GET /api/debug/retrieve', () => {
  it('não registra a rota quando DEBUG_ROUTES está desligada (default)', async () => {
    const app = build({ checkDatabase: async () => true });

    const response = await app.inject({ method: 'GET', url: '/api/debug/retrieve?question=x' });

    expect(response.statusCode).toBe(404);
  });

  it('devolve os documentos do buscar quando a flag está ligada', async () => {
    const app = build({
      checkDatabase: async () => true,
      debugRoutes: true,
      embeddings: { embedQuery: async () => [0.1, 0.2] },
      buscar: async () => [documentoFake],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/debug/retrieve?question=Qual+a+receita+da+Ambev%3F',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      documents: [{ ...documentoFake, fetchedAt: documentoFake.fetchedAt.toISOString() }],
    });
  });

  it('rejeita question ausente com problem+json de erro de validação', async () => {
    const app = build({
      checkDatabase: async () => true,
      debugRoutes: true,
      embeddings: { embedQuery: async () => [0.1] },
      buscar: async () => [],
    });

    const response = await app.inject({ method: 'GET', url: '/api/debug/retrieve' });

    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toBe('application/problem+json; charset=utf-8');
    expect(response.json()).toMatchObject({
      title: 'Entrada inválida',
      status: 400,
    });
  });
});

describe('GET /api/health', () => {
  it('responde ok quando o banco está saudável', async () => {
    const app = build({ checkDatabase: async () => true });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok', database: 'ok' });
  });

  it('responde degraded (mas HTTP 200) quando o banco falha — falha de banco não derruba o serviço', async () => {
    const app = build({ checkDatabase: async () => false });

    const response = await app.inject({ method: 'GET', url: '/api/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'degraded', database: 'error' });
  });
});

describe('Rate limiting (G.4)', () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_MAX;
    delete process.env.RATE_LIMIT_WINDOW;
  });

  it('devolve 429 em problem+json depois do limite configurado, em /api/chat', async () => {
    process.env.RATE_LIMIT_MAX = '1';
    process.env.RATE_LIMIT_WINDOW = '1 minute';
    const app = build({
      checkDatabase: async () => true,
      graph: {
        async stream() {
          return (async function* () {})();
        },
      },
    });

    const primeira = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { question: 'x' },
    });
    const segunda = await app.inject({
      method: 'POST',
      url: '/api/chat',
      payload: { question: 'x' },
    });

    expect(primeira.statusCode).toBe(200);
    expect(segunda.statusCode).toBe(429);
    expect(segunda.headers['content-type']).toBe('application/problem+json; charset=utf-8');
    expect(segunda.json()).toMatchObject({ title: 'Limite de requisições excedido', status: 429 });
  });

  it('não aplica rate limit em /api/health, mesmo com limite baixo configurado', async () => {
    process.env.RATE_LIMIT_MAX = '1';
    const app = build({ checkDatabase: async () => true });

    const primeira = await app.inject({ method: 'GET', url: '/api/health' });
    const segunda = await app.inject({ method: 'GET', url: '/api/health' });
    const terceira = await app.inject({ method: 'GET', url: '/api/health' });

    expect([primeira.statusCode, segunda.statusCode, terceira.statusCode]).toEqual([200, 200, 200]);
  });
});

describe('POST /api/mcp (gateway MCP pro Angular)', () => {
  let app: ReturnType<typeof build> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it('expõe a tool perguntar em /api/mcp — mesma tool do transporte stdio, via HTTP', async () => {
    const mcpGraph = {
      invoke: vi.fn().mockResolvedValue({ answerText: 'A receita foi R$ 56,7 bilhões.' }),
    };
    app = build({ checkDatabase: async () => true, mcpGraph });

    const enderecoBase = await app.listen({ port: 0, host: '127.0.0.1' });
    const transport = new StreamableHTTPClientTransport(new URL(`${enderecoBase}/api/mcp`));
    const cliente = new Client({ name: 'teste', version: '0.0.0' });
    await cliente.connect(transport);

    const { tools } = await cliente.listTools();
    expect(tools.map((t) => t.name)).toEqual(['perguntar']);

    const resultado = await cliente.callTool({
      name: 'perguntar',
      arguments: { question: 'Qual a receita da Vale?' },
    });

    expect(mcpGraph.invoke).toHaveBeenCalledWith({ question: 'Qual a receita da Vale?' });
    expect(resultado.content).toEqual([{ type: 'text', text: 'A receita foi R$ 56,7 bilhões.' }]);

    await cliente.close();
  });
});
