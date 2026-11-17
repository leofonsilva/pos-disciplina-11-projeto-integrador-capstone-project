import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatStreamEvent } from '@hero/contracts';
import { ChatService } from '../api/chat.service';
import { ChatStore } from './chat-store';

function fakeChatService(events: ChatStreamEvent[], erro?: Error): ChatService {
  return {
    async *ask() {
      for (const evento of events) yield evento;
      if (erro) throw erro;
    },
  } as ChatService;
}

function setup(chatService: ChatService): ChatStore {
  TestBed.configureTestingModule({
    providers: [ChatStore, { provide: ChatService, useValue: chatService }],
  });
  return TestBed.inject(ChatStore);
}

describe('ChatStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adiciona a mensagem do usuário inteira e uma mensagem do assistente pendente', async () => {
    const store = setup(fakeChatService([]));

    const promise = store.send('Qual a receita da Vale?');
    await vi.runAllTimersAsync();
    await promise;

    const [user, assistant] = store.messages();
    expect(user).toMatchObject({ role: 'user', words: ['Qual a receita da Vale?'], done: true });
    // O nó answer nunca chegou (fake não emite eventos) — a mensagem do assistente fica como
    // foi criada em send(), sem revelar nada.
    expect(assistant).toMatchObject({ role: 'assistant', words: [], done: false });
  });

  it('revela a resposta do evento answer token a token, não tudo de uma vez', async () => {
    const store = setup(
      fakeChatService([
        { node: 'retrieve', documents: [] },
        { node: 'answer', answerText: 'Foi bom.' },
      ]),
    );

    const promise = store.send('x');
    await vi.advanceTimersByTimeAsync(0);

    const parcial = store.messages().at(-1)!;
    expect(parcial.done).toBe(false);
    expect(parcial.revealed).toBeLessThan(parcial.words.length);

    await vi.runAllTimersAsync();
    await promise;

    const final = store.messages().at(-1)!;
    expect(final.done).toBe(true);
    expect(final.revealed).toBe(final.words.length);
    expect(final.words.join('')).toBe('Foi bom.');
  });

  it('extrai as citações do bloco Fontes: do answerText, e o corpo revelado não inclui esse bloco', async () => {
    const answerText =
      'A receita líquida da Vale no 3T25 foi de R$ 56,7 bilhões.\n\n' +
      'Fontes:\n' +
      '- VALE (3T25, data-base 2025-09-30): https://dados.cvm.gov.br/exemplo';
    const store = setup(fakeChatService([{ node: 'answer', answerText }]));

    const promise = store.send('x');
    await vi.runAllTimersAsync();
    await promise;

    const final = store.messages().at(-1)!;
    expect(final.words.join('')).toBe('A receita líquida da Vale no 3T25 foi de R$ 56,7 bilhões.');
    expect(final.citations).toEqual([
      {
        label: 'VALE (3T25)',
        periodEnd: '2025-09-30',
        origem: 'Base local (CVM)',
        sourceUrl: 'https://dados.cvm.gov.br/exemplo',
      },
    ]);
  });

  it('marca pending durante o streaming e desliga ao terminar', async () => {
    const store = setup(fakeChatService([{ node: 'answer', answerText: 'ok' }]));

    const promise = store.send('x');
    expect(store.pending()).toBe(true);

    await vi.runAllTimersAsync();
    await promise;

    expect(store.pending()).toBe(false);
  });

  it('degrada graciosamente quando o serviço lança erro — não trava a mensagem em branco', async () => {
    const store = setup(
      fakeChatService([{ node: 'retrieve', documents: [] }], new Error('rede caiu')),
    );

    const promise = store.send('x');
    await vi.runAllTimersAsync();
    await promise;

    const assistant = store.messages().at(-1)!;
    expect(assistant.done).toBe(true);
    expect(assistant.words.join('')).toContain('Não foi possível obter uma resposta');
    expect(store.pending()).toBe(false);
  });

  it('reset limpa as mensagens', async () => {
    const store = setup(fakeChatService([{ node: 'answer', answerText: 'ok' }]));

    const promise = store.send('x');
    await vi.runAllTimersAsync();
    await promise;

    store.reset();

    expect(store.messages()).toEqual([]);
    expect(store.pending()).toBe(false);
  });

  it('ignora send novo enquanto uma pergunta ainda está pendente', async () => {
    const store = setup(fakeChatService([{ node: 'answer', answerText: 'primeira' }]));

    const primeira = store.send('primeira pergunta');
    const segunda = store.send('segunda pergunta');
    await vi.runAllTimersAsync();
    await Promise.all([primeira, segunda]);

    const perguntasDoUsuario = store.messages().filter((m) => m.role === 'user');
    expect(perguntasDoUsuario).toHaveLength(1);
  });
});
