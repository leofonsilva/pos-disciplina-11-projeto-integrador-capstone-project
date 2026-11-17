import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { parseCsvCvm } from './parse-csv.js';

const dir = path.dirname(fileURLToPath(import.meta.url));
const fixture = (nome: string) => path.join(dir, '__fixtures__', nome);

describe('parseCsvCvm', () => {
  it('indexa cada linha pelo cabeçalho, mantendo tudo como string', () => {
    const linhas = parseCsvCvm(fixture('exemplo-dre.csv'));

    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toEqual({
      CD_CVM: '004170',
      DT_REFER: '2025-09-30',
      ORDEM_EXERC: 'ÚLTIMO',
      DT_INI_EXERC: '2025-07-01',
      CD_CONTA: '3.01',
      DS_CONTA: 'Receita Líquida',
      VL_CONTA: '56701000',
      ESCALA_MOEDA: 'MIL',
      VERSAO: '1',
      ST_CONTA_FIXA: 'S',
    });
  });

  it('decodifica acento ISO-8859-1 corretamente — os CSVs da CVM não são UTF-8', () => {
    const linhas = parseCsvCvm(fixture('exemplo-dre.csv'));

    expect(linhas[1].DS_CONTA).toBe('Lucro/Prejuízo Consolidado do Período');
    expect(linhas[0].ORDEM_EXERC).toBe('ÚLTIMO');
  });

  it('ignora a linha em branco final, sem gerar um registro vazio', () => {
    const linhas = parseCsvCvm(fixture('exemplo-dre.csv'));

    expect(linhas.every((linha) => linha.CD_CVM.length > 0)).toBe(true);
  });
});
