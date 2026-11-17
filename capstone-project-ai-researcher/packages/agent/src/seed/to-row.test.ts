import { describe, expect, it } from 'vitest';

import type { Documento } from './documento.js';
import { paraLinha } from './to-row.js';

const documento: Documento = {
  ticker: 'ABEV',
  companyName: 'Ambev S.A.',
  setor: 'Bebidas e Fumo',
  period: '2T25',
  periodEnd: '2025-06-30',
  receitaLiquida: 20090194000,
  lucroBruto: 10044071000,
  lucroLiquido: 2790566000,
  ativoTotal: 142157543000,
  patrimonioLiquido: 93210957000,
  caixaOperacional: 3050040000,
  sourceUrl: 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_2025.zip',
  fetchedAt: '2026-08-08T02:19:40.760Z',
  paragraph: 'No 2T25, a Ambev S.A. reportou receita líquida de R$ 20,1 bilhões.',
};

describe('paraLinha', () => {
  it('converte fetchedAt em Date e mantém os demais campos', () => {
    const linha = paraLinha(documento, [0.1, 0.2]);

    expect(linha.fetchedAt).toEqual(new Date('2026-08-08T02:19:40.760Z'));
    expect(linha.ticker).toBe('ABEV');
    expect(linha.embedding).toEqual([0.1, 0.2]);
  });

  it('usa null quando receitaMesmoTrimestreAnoAnterior está ausente (4º trimestre)', () => {
    const linha = paraLinha(documento, []);

    expect(linha.receitaMesmoTrimestreAnoAnterior).toBeNull();
  });

  it('preserva receitaMesmoTrimestreAnoAnterior quando presente', () => {
    const linha = paraLinha({ ...documento, receitaMesmoTrimestreAnoAnterior: 20044215000 }, []);

    expect(linha.receitaMesmoTrimestreAnoAnterior).toBe(20044215000);
  });
});
