import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import type { RetrievedDoc } from './db/retrieve-similar.js';
import type { AnswerLlmClient } from './nodes/answer.js';
import { makeAnswerNode } from './nodes/answer.js';
import type { GradeLlmClient } from './nodes/grade.js';
import { makeGradeNode } from './nodes/grade.js';
import type { Buscar, EmbeddingsClient } from './nodes/retrieve.js';
import { makeRetrieveNode } from './nodes/retrieve.js';
import type { BuscarPagina, InserirDocumentoWeb } from './nodes/web-search.js';
import { makeWebSearchNode } from './nodes/web-search.js';
import type { SearchProvider } from './search/types.js';

// Acima disso, iterations >= MAX_ITERATIONS força a saída do loop mesmo com sufficient: false —
// é o guard contra laço infinito. Nos dois casos (contexto suficiente ou guard cortou) a rota é
// `answer`; o próprio nó decide, pelo sufficient recebido, se avisa que o contexto é parcial.
export const MAX_ITERATIONS = 2;

export const ResearchState = Annotation.Root({
  question: Annotation<string>,
  documents: Annotation<RetrievedDoc[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  sufficient: Annotation<boolean>({
    reducer: (_prev, next) => next,
    default: () => false,
  }),
  missingAspects: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
  iterations: Annotation<number>({
    reducer: (prev, next) => prev + next,
    default: () => 0,
  }),
  // Não pode se chamar "answer" — colide com o nome do nó (LangGraph não deixa nó e canal de
  // estado compartilharem nome).
  answerText: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
});

export interface GraphDeps {
  embeddings: EmbeddingsClient;
  buscar: Buscar;
  gradeLlm: GradeLlmClient;
  searchProvider: SearchProvider;
  buscarPagina: BuscarPagina;
  inserirDocumentoWeb: InserirDocumentoWeb;
  answerLlm: AnswerLlmClient;
}

// A aresta condicional só decide a rota — quem produz sufficient/iterations é o nó grade.
function proximoNo(state: typeof ResearchState.State): 'webSearch' | 'answer' {
  if (state.sufficient) return 'answer';
  if (state.iterations >= MAX_ITERATIONS) return 'answer';
  return 'webSearch';
}

export function buildGraph(deps: GraphDeps) {
  const retrieve = makeRetrieveNode(deps.embeddings, deps.buscar);
  const grade = makeGradeNode(deps.gradeLlm);
  const webSearch = makeWebSearchNode(
    deps.searchProvider,
    deps.embeddings,
    deps.buscarPagina,
    deps.inserirDocumentoWeb,
  );
  const answer = makeAnswerNode(deps.answerLlm);

  return new StateGraph(ResearchState)
    .addNode('retrieve', retrieve)
    .addNode('grade', grade)
    .addNode('webSearch', webSearch)
    .addNode('answer', answer)
    .addEdge(START, 'retrieve')
    .addEdge('retrieve', 'grade')
    .addConditionalEdges('grade', proximoNo)
    .addEdge('webSearch', 'retrieve')
    .addEdge('answer', END)
    .compile();
}
