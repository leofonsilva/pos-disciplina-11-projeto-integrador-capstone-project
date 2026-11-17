import type { ChatStreamEvent } from '@hero/contracts';
import type { RetrievedDoc } from '@hero/agent';

interface RetrieveUpdate {
  documents: RetrievedDoc[];
}

interface GradeUpdate {
  sufficient: boolean;
  missingAspects: string[];
  iterations: number;
}

interface AnswerUpdate {
  answerText: string;
}

// O nome do nó (chave do chunk que o LangGraph produz em streamMode 'updates') já garante
// o formato do update — é o próprio grafo (graph.ts) quem emite esse par nome/formato.
export function paraEventoSse(node: string, update: unknown): ChatStreamEvent {
  if (node === 'retrieve') {
    const { documents } = update as RetrieveUpdate;
    return {
      node,
      documents: documents.map((doc) => ({
        id: doc.id,
        ticker: doc.ticker,
        period: doc.period,
        title: doc.title,
        sourceUrl: doc.sourceUrl,
      })),
    };
  }

  if (node === 'grade') {
    const { sufficient, missingAspects, iterations } = update as GradeUpdate;
    return { node, sufficient, missingAspects, iterations };
  }

  if (node === 'answer') {
    const { answerText } = update as AnswerUpdate;
    return { node, answerText };
  }

  // webSearch não devolve campo de estado novo (ver nodes/web-search.ts) — só o nome do nó.
  return { node: 'webSearch' };
}
