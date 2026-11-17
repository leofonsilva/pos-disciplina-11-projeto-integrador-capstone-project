export { criarEmbeddings } from './embeddings.js';
export { db, pool } from './db/client.js';
export type { Database } from './db/client.js';
export { buscarDocumentosSimilares } from './db/retrieve-similar.js';
export type { RetrievedDoc } from './db/retrieve-similar.js';
export { makeRetrieveNode } from './nodes/retrieve.js';
export type { Buscar, EmbeddingsClient, RetrieveState } from './nodes/retrieve.js';
export { makeGradeNode } from './nodes/grade.js';
export type { GradeLlmClient, GradeState } from './nodes/grade.js';
export { makeWebSearchNode } from './nodes/web-search.js';
export type { BuscarPagina, InserirDocumentoWeb, WebSearchState } from './nodes/web-search.js';
export { inserirDocumentoWeb } from './db/upsert-web-document.js';
export { makeAnswerNode } from './nodes/answer.js';
export type { AnswerLlmClient, AnswerState } from './nodes/answer.js';
export { CircuitoAbertoError, comResiliencia, criarSearchProvider } from './search/index.js';
export type { OpcoesResiliencia, SearchProvider, SearchResult } from './search/index.js';
export { buscarPagina } from './web-search/extract.js';
export { criarBuscarPagina, criarSearchProviderFixture } from './web-search/fixtures.js';
export { criarGradeLlm, criarAnswerLlm } from './llm.js';
export { buildGraph, MAX_ITERATIONS, ResearchState } from './graph.js';
export type { GraphDeps } from './graph.js';
export { criarGraphDepsPadrao } from './graph-deps.js';
export { registrarLangfuseTracing, criarLangfuseCallbacks } from './observability/langfuse.js';
export { registry as metricsRegistry, criarMetricsCallback } from './observability/metrics.js';
export {
  OrcamentoDiarioExcedidoError,
  tokensConsumidosHoje,
  verificarOrcamento,
} from './observability/budget.js';
