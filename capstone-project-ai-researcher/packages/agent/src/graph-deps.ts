import { db } from './db/client.js';
import { criarBuscarDemo } from './db/retrieve-demo.js';
import { buscarDocumentosSimilares } from './db/retrieve-similar.js';
import { inserirDocumentoWeb as inserirDocumentoWebNoBanco } from './db/upsert-web-document.js';
import { criarEmbeddings } from './embeddings.js';
import type { GraphDeps } from './graph.js';
import { criarAnswerLlm, criarGradeLlm } from './llm.js';
import { criarSearchProvider } from './search/index.js';
import { criarBuscarPagina } from './web-search/fixtures.js';

// Wiring de produção do grafo — usado tanto por apps/api (POST /chat) quanto por
// packages/mcp-server (tool perguntar). Dois usos reais é o que justifica extrair isso do
// apps/api pra cá, em vez de cada consumidor repetir a mesma lista de sete dependências.
export function criarGraphDepsPadrao(): GraphDeps {
  return {
    embeddings: criarEmbeddings(),
    // DEMO=true não toca o Postgres — sem isso, o grafo em modo demo continuaria exigindo
    // DATABASE_URL só pra devolver um documento fixo (ver db/retrieve-demo.ts). Usado no F.7
    // (Playwright no CI, sem banco nem Vertex AI disponíveis no runner).
    buscar:
      process.env.DEMO === 'true'
        ? criarBuscarDemo()
        : (embedding, k) => buscarDocumentosSimilares(db, embedding, k),
    gradeLlm: criarGradeLlm(),
    searchProvider: criarSearchProvider(),
    buscarPagina: criarBuscarPagina(),
    inserirDocumentoWeb: (linha) => inserirDocumentoWebNoBanco(db, linha),
    answerLlm: criarAnswerLlm(),
  };
}
