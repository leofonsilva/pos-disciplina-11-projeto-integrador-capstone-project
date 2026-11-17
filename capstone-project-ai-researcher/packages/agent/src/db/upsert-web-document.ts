import type { Database } from './client.js';
import { documentosWeb } from './schema.js';

type LinhaDocumentoWeb = typeof documentosWeb.$inferInsert;

export async function inserirDocumentoWeb(db: Database, linha: LinhaDocumentoWeb): Promise<void> {
  await db.insert(documentosWeb).values(linha);
}
