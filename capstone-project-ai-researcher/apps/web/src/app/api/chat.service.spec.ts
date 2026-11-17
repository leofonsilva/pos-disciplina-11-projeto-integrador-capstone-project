import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatService } from './chat.service';

function sseResponse(chunks: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    },
  });
  return new Response(stream, { status });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

describe('ChatService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('faz POST /api/chat com a pergunta e devolve um evento por nó do grafo', async () => {
    const fetchFake = vi
      .fn()
      .mockResolvedValue(
        sseResponse([
          'data: {"node":"retrieve","documents":[]}\n\n',
          'data: {"node":"answer","answerText":"A receita foi X."}\n\n',
        ]),
      );
    vi.stubGlobal('fetch', fetchFake);

    const eventos = await collect(new ChatService().ask('Qual a receita da Vale?'));

    expect(fetchFake).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ question: 'Qual a receita da Vale?' }),
      }),
    );
    expect(eventos).toEqual([
      { node: 'retrieve', documents: [] },
      { node: 'answer', answerText: 'A receita foi X.' },
    ]);
  });

  it('reconstrói um frame que chega dividido em vários pedaços do stream', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(sseResponse(['data: {"node":"ans', 'wer","answerText":"ok"}', '\n\n'])),
    );

    const eventos = await collect(new ChatService().ask('x'));

    expect(eventos).toEqual([{ node: 'answer', answerText: 'ok' }]);
  });

  it('lança erro quando o servidor emite o frame event: error', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          sseResponse([
            'data: {"node":"retrieve","documents":[]}\n\n',
            'event: error\ndata: {"message":"Erro ao processar a pergunta."}\n\n',
          ]),
        ),
    );

    await expect(collect(new ChatService().ask('x'))).rejects.toThrow(
      'Erro ao processar a pergunta.',
    );
  });

  it('lança erro quando a resposta HTTP não é ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse([], 500)));

    await expect(collect(new ChatService().ask('x'))).rejects.toThrow('status 500');
  });
});
