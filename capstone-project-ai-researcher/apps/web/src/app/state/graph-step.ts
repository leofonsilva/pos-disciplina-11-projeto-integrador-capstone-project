import type { ChatStreamEvent } from '@hero/contracts';

export type GraphNode = 'retrieve' | 'grade' | 'webSearch' | 'answer';
export type StepStatus = 'running' | 'done';

export interface GraphStep {
  readonly id: string;
  readonly node: GraphNode;
  readonly status: StepStatus;
  readonly startedAt: number;
  readonly finishedAt?: number;
  // Só retrieve/grade carregam iteração — é o número de voltas do loop
  // retrieve → grade → webSearch → retrieve, contado no cliente (ver GraphStore).
  readonly iteration?: number;
  readonly detail?: string;
}

export function detalheParaEvento(event: ChatStreamEvent): string | undefined {
  if (event.node === 'retrieve') {
    const total = event.documents?.length ?? 0;
    return total === 1 ? '1 documento na base local' : `${total} documentos na base local`;
  }
  if (event.node === 'grade') {
    if (event.sufficient) return 'Contexto suficiente';
    const aspectos = event.missingAspects ?? [];
    return aspectos.length > 0
      ? `Contexto insuficiente: ${aspectos.join(', ')}`
      : 'Contexto insuficiente';
  }
  if (event.node === 'webSearch') return 'Busca concluída';
  return 'Resposta gerada';
}

export function formatarDuracao(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
}
