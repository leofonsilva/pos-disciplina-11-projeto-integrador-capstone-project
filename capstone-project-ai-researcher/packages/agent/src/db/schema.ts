import {
  bigint,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

// gemini-embedding-001 gera 3072 dimensões por padrão; truncado para 768 via
// `output_dimensionality` na chamada de embedding porque o índice HNSW do pgvector
// não indexa vetores acima de 2000 dimensões.
export const EMBEDDING_DIMENSIONS = 768;

export const documentos = pgTable(
  'documentos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ticker: text('ticker').notNull(),
    companyName: text('company_name').notNull(),
    setor: text('setor').notNull(),
    period: text('period').notNull(),
    periodEnd: date('period_end').notNull(),
    receitaLiquida: bigint('receita_liquida', { mode: 'number' }).notNull(),
    lucroBruto: bigint('lucro_bruto', { mode: 'number' }).notNull(),
    lucroLiquido: bigint('lucro_liquido', { mode: 'number' }).notNull(),
    ativoTotal: bigint('ativo_total', { mode: 'number' }).notNull(),
    patrimonioLiquido: bigint('patrimonio_liquido', { mode: 'number' }).notNull(),
    caixaOperacional: bigint('caixa_operacional', { mode: 'number' }).notNull(),
    // Ausente no 4º trimestre — a CVM não oferece o comparativo YoY nesse período.
    receitaMesmoTrimestreAnoAnterior: bigint('receita_mesmo_trimestre_ano_anterior', {
      mode: 'number',
    }),
    sourceUrl: text('source_url').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    paragraph: text('paragraph').notNull(),
    // Nulo até o `pnpm seed` (D.2) rodar.
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (table) => [
    uniqueIndex('documentos_ticker_period_idx').on(table.ticker, table.period),
    index('documentos_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

// Enriquecimento via busca web (D.7) — schema separado de `documentos` porque não tem os
// indicadores financeiros do corpus CVM, e carrega TTL: o dado envelhece, o do corpus não.
export const documentosWeb = pgTable(
  'documentos_web',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    query: text('query').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    sourceUrl: text('source_url').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),
  },
  (table) => [
    index('documentos_web_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);
