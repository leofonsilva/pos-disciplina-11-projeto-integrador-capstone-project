import type { documentosWeb } from '../db/schema.js';

type LinhaDocumentoWeb = typeof documentosWeb.$inferInsert;

const MS_POR_DIA = 24 * 60 * 60 * 1000;

export interface DocumentoWebInput {
  query: string;
  title: string;
  content: string;
  sourceUrl: string;
  fetchedAt: Date;
  ttlDias: number;
  embedding: number[];
}

export function paraLinhaWeb(input: DocumentoWebInput): LinhaDocumentoWeb {
  return {
    query: input.query,
    title: input.title,
    content: input.content,
    sourceUrl: input.sourceUrl,
    fetchedAt: input.fetchedAt,
    expiresAt: new Date(input.fetchedAt.getTime() + input.ttlDias * MS_POR_DIA),
    embedding: input.embedding,
  };
}
