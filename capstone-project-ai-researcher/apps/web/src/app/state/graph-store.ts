import { Injectable, computed, signal } from '@angular/core';
import type { ChatStreamEvent } from '@hero/contracts';
import { detalheParaEvento, type GraphNode, type GraphStep } from './graph-step';

// Espelha packages/agent/src/graph.ts (MAX_ITERATIONS) — a mesma trava contra loop infinito,
// só que do lado do cliente, pra prever a próxima etapa antes do evento chegar (o stream só
// avisa nó concluído, nunca nó iniciado). Não importamos @hero/agent aqui: ele carrega
// LangGraph/Vertex AI/pg, dependências só de servidor que não pertencem ao bundle do frontend.
const MAX_ITERATIONS = 2;

@Injectable({ providedIn: 'root' })
export class GraphStore {
  private readonly _steps = signal<GraphStep[]>([]);
  readonly steps = this._steps.asReadonly();

  readonly fallbackActive = computed(() => this._steps().some((step) => step.node === 'webSearch'));

  private iteracaoAtual = 0;
  private nextId = 0;

  startRun(): void {
    this._steps.set([]);
    this.iteracaoAtual = 0;
    this.pushRunning('retrieve');
  }

  onEvent(event: ChatStreamEvent): void {
    this.marcarUltimoConcluido(event);

    const proximo = this.proximoNoEsperado(event);
    if (proximo) this.pushRunning(proximo);
  }

  // Chamado quando o stream termina em erro no meio do caminho — sem isso a última etapa
  // fica com o spinner girando pra sempre, como se o grafo tivesse travado.
  failRun(): void {
    this._steps.update((steps) => {
      const ultimo = steps.at(-1);
      if (!ultimo || ultimo.status !== 'running') return steps;
      const atualizado: GraphStep = {
        ...ultimo,
        status: 'done',
        finishedAt: Date.now(),
        detail: 'Interrompido por erro',
      };
      return [...steps.slice(0, -1), atualizado];
    });
  }

  reset(): void {
    this._steps.set([]);
    this.iteracaoAtual = 0;
  }

  private marcarUltimoConcluido(event: ChatStreamEvent): void {
    this._steps.update((steps) => {
      const ultimo = steps.at(-1);
      if (!ultimo || ultimo.node !== event.node || ultimo.status !== 'running') return steps;
      const atualizado: GraphStep = {
        ...ultimo,
        status: 'done',
        finishedAt: Date.now(),
        detail: detalheParaEvento(event),
      };
      return [...steps.slice(0, -1), atualizado];
    });
  }

  private proximoNoEsperado(event: ChatStreamEvent): GraphNode | null {
    if (event.node === 'retrieve') return 'grade';
    if (event.node === 'webSearch') return 'retrieve';
    if (event.node === 'grade') {
      if (event.sufficient) return 'answer';
      return this.iteracaoAtual >= MAX_ITERATIONS ? 'answer' : 'webSearch';
    }
    return null;
  }

  private pushRunning(node: GraphNode): void {
    if (node === 'retrieve') this.iteracaoAtual++;
    const iteration = node === 'retrieve' || node === 'grade' ? this.iteracaoAtual : undefined;
    this._steps.update((steps) => [
      ...steps,
      { id: `${node}-${this.nextId++}`, node, status: 'running', startedAt: Date.now(), iteration },
    ]);
  }
}
