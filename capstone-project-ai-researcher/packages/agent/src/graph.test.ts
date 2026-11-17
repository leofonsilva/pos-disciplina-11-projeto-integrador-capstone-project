import { describe, expect, it, vi } from 'vitest';

import { buildGraph, MAX_ITERATIONS, ResearchState } from './graph.js';

const htmlDaPagina = '<html><body><p>Notícia de teste sobre a empresa.</p></body></html>';

function fakeGradeLlm(result: { sufficient: boolean; missingAspects: string[] }) {
  return { withStructuredOutput: () => ({ invoke: vi.fn().mockResolvedValue(result) }) };
}

function fakeDeps(overrides: {
  gradeLlm: ReturnType<typeof fakeGradeLlm>;
  searchProviderFalha?: boolean;
}) {
  return {
    embeddings: { embedQuery: vi.fn().mockResolvedValue([0.1, 0.2]) },
    buscar: vi.fn().mockResolvedValue([]),
    gradeLlm: overrides.gradeLlm,
    searchProvider: {
      search: overrides.searchProviderFalha
        ? vi.fn().mockRejectedValue(new Error('circuito aberto'))
        : vi
            .fn()
            .mockResolvedValue([{ title: 'Resultado', snippet: '', url: 'https://x.example.com' }]),
    },
    buscarPagina: vi.fn().mockResolvedValue(htmlDaPagina),
    inserirDocumentoWeb: vi.fn().mockResolvedValue(undefined),
    answerLlm: { invoke: vi.fn().mockResolvedValue({ content: 'Resposta de teste.' }) },
  };
}

async function coletarNos(
  app: ReturnType<typeof buildGraph>,
  input: typeof ResearchState.State,
): Promise<string[]> {
  const nos: string[] = [];
  for await (const chunk of await app.stream(input)) {
    nos.push(...Object.keys(chunk));
  }
  return nos;
}

describe('buildGraph', () => {
  it('vai direto pro fim quando o contexto já é suficiente na primeira rodada', async () => {
    const deps = fakeDeps({ gradeLlm: fakeGradeLlm({ sufficient: true, missingAspects: [] }) });
    const app = buildGraph(deps);

    const trace = await coletarNos(app, { question: 'Qual a receita da Vale?' });

    expect(trace).toEqual(['retrieve', 'grade', 'answer']);
    expect(deps.searchProvider.search).not.toHaveBeenCalled();
  });

  it('busca na web e volta pro retrieve quando insuficiente, até o guard cortar o loop', async () => {
    const deps = fakeDeps({
      gradeLlm: fakeGradeLlm({ sufficient: false, missingAspects: ['motivo qualitativo'] }),
    });
    const app = buildGraph(deps);

    const trace = await coletarNos(app, { question: 'Por que a receita da Vale caiu?' });

    expect(trace).toEqual(['retrieve', 'grade', 'webSearch', 'retrieve', 'grade', 'answer']);
    expect(deps.searchProvider.search).toHaveBeenCalledTimes(1);
  });

  it('não entra em laço infinito: o número de rodadas de grade é limitado por MAX_ITERATIONS', async () => {
    const deps = fakeDeps({
      gradeLlm: fakeGradeLlm({ sufficient: false, missingAspects: ['x'] }),
    });
    const app = buildGraph(deps);

    const trace = await coletarNos(app, { question: 'x' });
    const rodadasDeGrade = trace.filter((no) => no === 'grade').length;

    expect(rodadasDeGrade).toBe(MAX_ITERATIONS);
  });

  it('devolve o estado final com iterations no limite e sufficient false quando o guard corta', async () => {
    const deps = fakeDeps({
      gradeLlm: fakeGradeLlm({ sufficient: false, missingAspects: ['x'] }),
    });
    const app = buildGraph(deps);

    const estadoFinal = await app.invoke({ question: 'x' });

    expect(estadoFinal.iterations).toBe(MAX_ITERATIONS);
    expect(estadoFinal.sufficient).toBe(false);
    // Guard cortou com contexto insuficiente — o nó answer ainda responde, com o aviso.
    expect(estadoFinal.answerText).toContain('incompleto');
  });

  it('degradação graciosa: SearchProvider fora do ar não derruba o grafo — chega em answer normalmente', async () => {
    const deps = fakeDeps({
      gradeLlm: fakeGradeLlm({ sufficient: false, missingAspects: ['motivo qualitativo'] }),
      searchProviderFalha: true,
    });
    const app = buildGraph(deps);

    const estadoFinal = await app.invoke({ question: 'Por que a receita caiu?' });

    expect(estadoFinal.answerText).toContain('Resposta de teste.');
    expect(estadoFinal.answerText).toContain('incompleto');
    expect(deps.inserirDocumentoWeb).not.toHaveBeenCalled();
  });
});
