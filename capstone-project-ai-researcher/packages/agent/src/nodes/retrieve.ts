import type { RetrievedDoc } from '../db/retrieve-similar.js';

const TOP_K_PADRAO = 5;

export interface RetrieveState {
  question: string;
  topK?: number;
}

// Estruturalmente compatível com VertexAIEmbeddings — o nó nunca importa o cliente
// concreto, só a operação de que precisa. Permite fake sem rede em teste.
export interface EmbeddingsClient {
  embedQuery(text: string): Promise<number[]>;
}

export type Buscar = (embedding: number[], k: number) => Promise<RetrievedDoc[]>;

export function makeRetrieveNode(embeddings: EmbeddingsClient, buscar: Buscar) {
  return async (state: RetrieveState): Promise<{ documents: RetrievedDoc[] }> => {
    const embedding = await embeddings.embedQuery(state.question);
    const documents = await buscar(embedding, state.topK ?? TOP_K_PADRAO);

    return { documents };
  };
}
