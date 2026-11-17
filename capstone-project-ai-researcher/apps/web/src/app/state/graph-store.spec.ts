import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GraphStore } from './graph-store';

function setup(): GraphStore {
  TestBed.configureTestingModule({ providers: [GraphStore] });
  return TestBed.inject(GraphStore);
}

describe('GraphStore', () => {
  it('startRun já mostra retrieve em execução, antes de qualquer evento chegar', () => {
    const store = setup();
    store.startRun();

    expect(store.steps()).toEqual([
      expect.objectContaining({ node: 'retrieve', status: 'running', iteration: 1 }),
    ]);
  });

  it('contexto suficiente de primeira: retrieve → grade → answer, sem passar por webSearch', () => {
    const store = setup();
    store.startRun();

    store.onEvent({ node: 'retrieve', documents: [{ id: '1', sourceUrl: 'https://x.com' }] });
    store.onEvent({ node: 'grade', sufficient: true, missingAspects: [], iterations: 1 });
    store.onEvent({ node: 'answer', answerText: 'ok' });

    const nodes = store.steps().map((s) => s.node);
    expect(nodes).toEqual(['retrieve', 'grade', 'answer']);
    expect(store.steps().every((s) => s.status === 'done')).toBe(true);
    expect(store.fallbackActive()).toBe(false);
  });

  it('contexto insuficiente aciona o fallback: retrieve → grade → webSearch → retrieve → grade → answer', () => {
    const store = setup();
    store.startRun();

    store.onEvent({ node: 'retrieve', documents: [] });
    store.onEvent({
      node: 'grade',
      sufficient: false,
      missingAspects: ['fato relevante'],
      iterations: 1,
    });

    // onEvent marca o grade concluído e já empurra webSearch como "running" no mesmo passo —
    // o stream só avisa nó concluído, então prever o próximo é a única forma de mostrar algo
    // "em execução" em tempo real.
    expect(store.steps().at(-1)).toMatchObject({ node: 'webSearch', status: 'running' });
    expect(store.fallbackActive()).toBe(true);

    store.onEvent({ node: 'webSearch' });
    expect(store.steps().at(-1)).toMatchObject({
      node: 'retrieve',
      status: 'running',
      iteration: 2,
    });

    store.onEvent({
      node: 'retrieve',
      documents: [
        { id: '1', sourceUrl: 'https://x.com' },
        { id: '2', sourceUrl: 'https://y.com' },
      ],
    });
    store.onEvent({ node: 'grade', sufficient: true, missingAspects: [], iterations: 1 });
    store.onEvent({ node: 'answer', answerText: 'ok' });

    const nodes = store.steps().map((s) => s.node);
    expect(nodes).toEqual(['retrieve', 'grade', 'webSearch', 'retrieve', 'grade', 'answer']);
    expect(
      store
        .steps()
        .filter((s) => s.node === 'retrieve')
        .map((s) => s.iteration),
    ).toEqual([1, 2]);
  });

  it('guard de MAX_ITERATIONS: segunda vez insuficiente ainda assim vai pra answer, não webSearch de novo', () => {
    const store = setup();
    store.startRun();

    store.onEvent({ node: 'retrieve', documents: [] });
    store.onEvent({ node: 'grade', sufficient: false, missingAspects: [], iterations: 1 });
    store.onEvent({ node: 'webSearch' });
    store.onEvent({ node: 'retrieve', documents: [] });
    store.onEvent({ node: 'grade', sufficient: false, missingAspects: [], iterations: 1 });

    expect(store.steps().at(-1)).toMatchObject({ node: 'answer', status: 'running' });
  });

  it('failRun encerra a etapa em execução em vez de deixar o spinner girando pra sempre', () => {
    const store = setup();
    store.startRun();
    store.onEvent({ node: 'retrieve', documents: [] });

    store.failRun();

    expect(store.steps().at(-1)).toMatchObject({
      node: 'grade',
      status: 'done',
      detail: 'Interrompido por erro',
    });
  });

  it('reset limpa as etapas', () => {
    const store = setup();
    store.startRun();
    store.onEvent({ node: 'retrieve', documents: [] });

    store.reset();

    expect(store.steps()).toEqual([]);
  });
});
