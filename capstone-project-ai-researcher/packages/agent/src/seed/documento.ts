import { z } from 'zod';

// Formato dos JSONs gerados pelo `pnpm collect` (packages/corpus/data/documentos/{TICKER}.json).
// Validado aqui porque é leitura de arquivo — fronteira do domínio, por convenção do projeto.
export const documentoSchema = z.object({
  ticker: z.string(),
  companyName: z.string(),
  setor: z.string(),
  period: z.string(),
  periodEnd: z.string(),
  receitaLiquida: z.number(),
  lucroBruto: z.number(),
  lucroLiquido: z.number(),
  ativoTotal: z.number(),
  patrimonioLiquido: z.number(),
  caixaOperacional: z.number(),
  // Ausente no 4º trimestre — a CVM não oferece o comparativo YoY nesse período.
  receitaMesmoTrimestreAnoAnterior: z.number().optional(),
  sourceUrl: z.string(),
  fetchedAt: z.string(),
  paragraph: z.string(),
});

export const documentosArraySchema = z.array(documentoSchema);

export type Documento = z.infer<typeof documentoSchema>;
