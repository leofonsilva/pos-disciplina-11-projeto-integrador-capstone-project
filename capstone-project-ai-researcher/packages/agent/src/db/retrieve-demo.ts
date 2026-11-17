import type { Buscar } from '../nodes/retrieve.js';
import type { RetrievedDoc } from './retrieve-similar.js';

// Documento real do corpus (packages/corpus/data/documentos/VALE.json, 3T25) — congelado aqui
// pra DEMO=true não depender de Postgres/pgvector. O embedding recebido é ignorado de
// propósito: sem Vertex AI de verdade (ver embeddings.ts), ele não teria significado semântico
// mesmo, então não faz sentido fingir uma busca por similaridade.
const DOCUMENTO_DEMO: RetrievedDoc = {
  id: 'demo-vale-3t25',
  ticker: 'VALE',
  companyName: 'Vale S.A.',
  setor: 'Extração Mineral',
  period: '3T25',
  periodEnd: '2025-09-30',
  paragraph:
    'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões, alta de 7,0% frente ao 3T24 e alta de 13,8% frente ao 2T25. O lucro líquido foi de R$ 14,7 bilhões, com margem líquida de 25,9%. O caixa gerado nas operações somou R$ 13,7 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_2025.zip',
  fetchedAt: new Date('2026-08-08T02:19:40.760Z'),
  distance: 0.05,
};

export function criarBuscarDemo(): Buscar {
  return async () => [DOCUMENTO_DEMO];
}
