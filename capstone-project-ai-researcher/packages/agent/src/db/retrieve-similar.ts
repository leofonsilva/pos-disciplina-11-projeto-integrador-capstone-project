import { cosineDistance, gt, sql } from 'drizzle-orm';

import type { Database } from './client.js';
import { documentos, documentosWeb } from './schema.js';

export interface RetrievedDoc {
  id: string;
  // Presentes só em documento do corpus CVM.
  ticker?: string;
  companyName?: string;
  setor?: string;
  period?: string;
  periodEnd?: string;
  // Presente só em documento vindo da busca web (D.7).
  title?: string;
  paragraph: string;
  sourceUrl: string;
  fetchedAt: Date;
  distance: number;
}

async function buscarNoCorpus(
  db: Database,
  embedding: number[],
  k: number,
): Promise<RetrievedDoc[]> {
  const distance = sql<number>`${cosineDistance(documentos.embedding, embedding)}`;

  return db
    .select({
      id: documentos.id,
      ticker: documentos.ticker,
      companyName: documentos.companyName,
      setor: documentos.setor,
      period: documentos.period,
      periodEnd: documentos.periodEnd,
      paragraph: documentos.paragraph,
      sourceUrl: documentos.sourceUrl,
      fetchedAt: documentos.fetchedAt,
      distance,
    })
    .from(documentos)
    .orderBy(distance)
    .limit(k);
}

async function buscarNaWeb(db: Database, embedding: number[], k: number): Promise<RetrievedDoc[]> {
  const distance = sql<number>`${cosineDistance(documentosWeb.embedding, embedding)}`;

  return (
    db
      .select({
        id: documentosWeb.id,
        title: documentosWeb.title,
        paragraph: documentosWeb.content,
        sourceUrl: documentosWeb.sourceUrl,
        fetchedAt: documentosWeb.fetchedAt,
        distance,
      })
      .from(documentosWeb)
      // Documento expirado não volta na busca — TTL é aplicado na leitura, não por um job de limpeza.
      .where(gt(documentosWeb.expiresAt, new Date()))
      .orderBy(distance)
      .limit(k)
  );
}

// Corpus CVM e enriquecimento web moram em tabelas separadas (schemas incompatíveis — ver
// schema.ts), então a junção acontece aqui: busca as duas, ordena pela distância combinada.
export function combinarResultados(
  corpus: RetrievedDoc[],
  web: RetrievedDoc[],
  k: number,
): RetrievedDoc[] {
  return [...corpus, ...web].sort((a, b) => a.distance - b.distance).slice(0, k);
}

export async function buscarDocumentosSimilares(
  db: Database,
  embedding: number[],
  k: number,
): Promise<RetrievedDoc[]> {
  const [corpus, web] = await Promise.all([
    buscarNoCorpus(db, embedding, k),
    buscarNaWeb(db, embedding, k),
  ]);

  return combinarResultados(corpus, web, k);
}
