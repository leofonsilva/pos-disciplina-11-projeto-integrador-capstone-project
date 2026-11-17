import type { documentos } from '../db/schema.js';
import type { Documento } from './documento.js';

type LinhaDocumento = typeof documentos.$inferInsert;

export function paraLinha(documento: Documento, embedding: number[]): LinhaDocumento {
  return {
    ticker: documento.ticker,
    companyName: documento.companyName,
    setor: documento.setor,
    period: documento.period,
    periodEnd: documento.periodEnd,
    receitaLiquida: documento.receitaLiquida,
    lucroBruto: documento.lucroBruto,
    lucroLiquido: documento.lucroLiquido,
    ativoTotal: documento.ativoTotal,
    patrimonioLiquido: documento.patrimonioLiquido,
    caixaOperacional: documento.caixaOperacional,
    receitaMesmoTrimestreAnoAnterior: documento.receitaMesmoTrimestreAnoAnterior ?? null,
    sourceUrl: documento.sourceUrl,
    fetchedAt: new Date(documento.fetchedAt),
    paragraph: documento.paragraph,
    embedding,
  };
}
