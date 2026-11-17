import { describe, expect, it, vi } from 'vitest';

import { makePerguntarTool } from './perguntar.js';
import type { GraphLike } from './perguntar.js';

describe('makePerguntarTool', () => {
  it('invoca o grafo com a pergunta e devolve a resposta como conteúdo de texto', async () => {
    const graph: GraphLike = {
      invoke: vi.fn().mockResolvedValue({ answerText: 'A receita foi R$ 56,7 bilhões.' }),
    };
    const perguntar = makePerguntarTool(graph);

    const resultado = await perguntar({ question: 'Qual a receita da Vale?' });

    expect(graph.invoke).toHaveBeenCalledWith({ question: 'Qual a receita da Vale?' });
    expect(resultado).toEqual({
      content: [{ type: 'text', text: 'A receita foi R$ 56,7 bilhões.' }],
    });
  });

  it('devolve isError, sem propagar a exceção, quando o grafo falha', async () => {
    const graph: GraphLike = {
      invoke: vi.fn().mockRejectedValue(new Error('Vertex AI indisponível')),
    };
    const perguntar = makePerguntarTool(graph);

    const resultado = await perguntar({ question: 'x' });

    expect(resultado.isError).toBe(true);
    expect(resultado.content[0]).toMatchObject({
      type: 'text',
      text: expect.stringContaining('Vertex AI indisponível'),
    });
  });
});
