import { VertexAIEmbeddings } from '@langchain/google-vertexai';
import { afterEach, describe, expect, it } from 'vitest';
import { EMBEDDING_DIMENSIONS } from './db/schema.js';
import { criarEmbeddings } from './embeddings.js';

describe('criarEmbeddings', () => {
  afterEach(() => {
    delete process.env.DEMO;
    delete process.env.GOOGLE_CLOUD_PROJECT_ID;
  });

  it('com DEMO=true, devolve um vetor de zeros do tamanho certo, sem chamar a Vertex AI', async () => {
    process.env.DEMO = 'true';

    const embeddings = criarEmbeddings();
    const vetor = await embeddings.embedQuery('qualquer pergunta');

    expect(vetor).toHaveLength(EMBEDDING_DIMENSIONS);
    expect(vetor.every((v) => v === 0)).toBe(true);
    expect(embeddings).not.toBeInstanceOf(VertexAIEmbeddings);
  });

  it('sem DEMO, devolve o cliente real da Vertex AI', () => {
    delete process.env.DEMO;
    process.env.GOOGLE_CLOUD_PROJECT_ID = 'projeto-de-teste';

    expect(criarEmbeddings()).toBeInstanceOf(VertexAIEmbeddings);
  });

  it('sem GOOGLE_CLOUD_PROJECT_ID, recusa criar o cliente real em vez de deixar a Vertex AI falhar com erro obscuro', () => {
    delete process.env.DEMO;
    delete process.env.GOOGLE_CLOUD_PROJECT_ID;

    expect(() => criarEmbeddings()).toThrow('GOOGLE_CLOUD_PROJECT_ID');
  });
});
