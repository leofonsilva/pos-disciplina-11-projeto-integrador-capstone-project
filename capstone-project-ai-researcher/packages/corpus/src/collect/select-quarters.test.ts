import { describe, expect, it } from 'vitest';

import type { LinhaCvm } from '../types.js';
import {
  agruparPorEmpresa,
  buscarConta,
  buscarContaPorDescricao,
  candidatosTrimestres,
  demonstrativosDaEmpresa,
  escolherMaiorVersao,
  filtroBase,
  inicioTrimestreIso,
  periodEndIso,
  periodoLabel,
  subtrairValorConta,
  valorConta,
} from './select-quarters.js';

function linha(overrides: Partial<LinhaCvm> = {}): LinhaCvm {
  return {
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
    ...overrides,
  };
}

describe('periodoLabel', () => {
  it('formata trimestre e ano curto', () => {
    expect(periodoLabel(3, 2025)).toBe('1T25');
    expect(periodoLabel(6, 2025)).toBe('2T25');
    expect(periodoLabel(9, 2025)).toBe('3T25');
    expect(periodoLabel(12, 2025)).toBe('4T25');
  });
});

describe('periodEndIso', () => {
  it('devolve o último dia de meses com 30 e 31 dias', () => {
    expect(periodEndIso(2025, 9)).toBe('2025-09-30');
    expect(periodEndIso(2025, 12)).toBe('2025-12-31');
  });

  it('acerta fevereiro em ano bissexto e não bissexto', () => {
    expect(periodEndIso(2024, 2)).toBe('2024-02-29');
    expect(periodEndIso(2025, 2)).toBe('2025-02-28');
  });
});

describe('inicioTrimestreIso', () => {
  it('volta dois meses a partir do mês de fechamento', () => {
    expect(inicioTrimestreIso(2025, 9)).toBe('2025-07-01');
    expect(inicioTrimestreIso(2025, 3)).toBe('2025-01-01');
    expect(inicioTrimestreIso(2025, 12)).toBe('2025-10-01');
  });
});

describe('candidatosTrimestres', () => {
  it('parte do trimestre corrente e anda pra trás dentro do mesmo ano', () => {
    const hoje = new Date(Date.UTC(2026, 7, 9)); // 9 de agosto de 2026
    expect(candidatosTrimestres(hoje, 3)).toEqual([
      { ano: 2026, mes: 9 },
      { ano: 2026, mes: 6 },
      { ano: 2026, mes: 3 },
    ]);
  });

  it('vira o ano ao passar do 1T', () => {
    const hoje = new Date(Date.UTC(2026, 0, 15)); // 15 de janeiro de 2026
    expect(candidatosTrimestres(hoje, 2)).toEqual([
      { ano: 2026, mes: 3 },
      { ano: 2025, mes: 12 },
    ]);
  });
});

describe('valorConta', () => {
  it('lê VL_CONTA como número e ESCALA_MOEDA MIL por padrão', () => {
    expect(valorConta(linha({ VL_CONTA: '56701000', ESCALA_MOEDA: 'MIL' }))).toEqual({
      valor: 56701000,
      escalaMoeda: 'MIL',
    });
  });

  it('reconhece UNIDADE explicitamente', () => {
    expect(valorConta(linha({ VL_CONTA: '100', ESCALA_MOEDA: 'UNIDADE' }))).toEqual({
      valor: 100,
      escalaMoeda: 'UNIDADE',
    });
  });

  it('trata qualquer valor diferente de UNIDADE como MIL', () => {
    expect(valorConta(linha({ ESCALA_MOEDA: '' })).escalaMoeda).toBe('MIL');
  });
});

describe('subtrairValorConta', () => {
  it('subtrai dois valores da mesma escala', () => {
    expect(
      subtrairValorConta({ valor: 100, escalaMoeda: 'MIL' }, { valor: 30, escalaMoeda: 'MIL' }),
    ).toEqual({ valor: 70, escalaMoeda: 'MIL' });
  });

  it('lança erro se as escalas divergirem — dado anômalo, não dá pra subtrair', () => {
    expect(() =>
      subtrairValorConta({ valor: 100, escalaMoeda: 'MIL' }, { valor: 30, escalaMoeda: 'UNIDADE' }),
    ).toThrow(/ESCALA_MOEDA divergente/);
  });
});

describe('escolherMaiorVersao', () => {
  it('fica com a linha de VERSAO mais alta', () => {
    const v1 = linha({ VERSAO: '1', VL_CONTA: '100' });
    const v2 = linha({ VERSAO: '2', VL_CONTA: '200' });
    expect(escolherMaiorVersao([v1, v2])).toBe(v2);
  });

  it('devolve undefined pra lista vazia', () => {
    expect(escolherMaiorVersao([])).toBeUndefined();
  });
});

describe('filtroBase', () => {
  it('exige DT_REFER e ORDEM_EXERC iguais', () => {
    const l = linha({ DT_REFER: '2025-09-30', ORDEM_EXERC: 'ÚLTIMO' });
    expect(filtroBase(l, '2025-09-30', 'ÚLTIMO', undefined)).toBe(true);
    expect(filtroBase(l, '2025-06-30', 'ÚLTIMO', undefined)).toBe(false);
    expect(filtroBase(l, '2025-09-30', 'PENÚLTIMO', undefined)).toBe(false);
  });

  it('só compara DT_INI_EXERC quando informado', () => {
    const l = linha({ DT_INI_EXERC: '2025-07-01' });
    expect(filtroBase(l, '2025-09-30', 'ÚLTIMO', undefined)).toBe(true);
    expect(filtroBase(l, '2025-09-30', 'ÚLTIMO', '2025-07-01')).toBe(true);
    expect(filtroBase(l, '2025-09-30', 'ÚLTIMO', '2025-01-01')).toBe(false);
  });
});

describe('buscarConta', () => {
  it('encontra a linha pelo código de conta e critérios de período', () => {
    const alvo = linha({ CD_CONTA: '3.01', VL_CONTA: '56701000' });
    const outraConta = linha({ CD_CONTA: '3.03', VL_CONTA: '20624000' });

    const encontrada = buscarConta(
      [alvo, outraConta],
      '3.01',
      '2025-09-30',
      'ÚLTIMO',
      '2025-07-01',
    );
    expect(encontrada?.VL_CONTA).toBe('56701000');
  });

  it('entre versões retificadas da mesma conta, fica com a mais recente', () => {
    const v1 = linha({ CD_CONTA: '3.01', VERSAO: '1', VL_CONTA: '100' });
    const v2 = linha({ CD_CONTA: '3.01', VERSAO: '3', VL_CONTA: '999' });

    expect(buscarConta([v1, v2], '3.01', '2025-09-30', 'ÚLTIMO', '2025-07-01')?.VL_CONTA).toBe(
      '999',
    );
  });

  it('devolve undefined quando não há linha compatível', () => {
    expect(buscarConta([linha()], '9.99', '2025-09-30', 'ÚLTIMO', '2025-07-01')).toBeUndefined();
  });
});

describe('buscarContaPorDescricao', () => {
  const descricoes = ['Lucro/Prejuízo Consolidado do Período', 'Lucro/Prejuízo do Período'];

  it('exige ST_CONTA_FIXA=S — ignora sub-linha de mesmo nome sem a marca', () => {
    const fixa = linha({
      CD_CONTA: '3.11',
      DS_CONTA: 'Lucro/Prejuízo Consolidado do Período',
      ST_CONTA_FIXA: 'S',
      VL_CONTA: '14671000',
    });
    const naoFixa = linha({
      CD_CONTA: '3.11.01',
      DS_CONTA: 'Lucro/Prejuízo Consolidado do Período',
      ST_CONTA_FIXA: 'N',
      VL_CONTA: '999',
    });

    const encontrada = buscarContaPorDescricao(
      [naoFixa, fixa],
      descricoes,
      '2025-09-30',
      'ÚLTIMO',
      '2025-07-01',
    );
    expect(encontrada?.VL_CONTA).toBe('14671000');
  });

  it('entre candidatos de profundidade diferente, fica com a linha-resumo (código mais raso)', () => {
    const resumo = linha({
      CD_CONTA: '3.11',
      DS_CONTA: 'Lucro/Prejuízo Consolidado do Período',
      ST_CONTA_FIXA: 'S',
      VL_CONTA: '14671000',
    });
    const subLinha = linha({
      CD_CONTA: '3.11.01',
      DS_CONTA: 'Lucro/Prejuízo Consolidado do Período',
      ST_CONTA_FIXA: 'S',
      VL_CONTA: '999',
    });

    const encontrada = buscarContaPorDescricao(
      [subLinha, resumo],
      descricoes,
      '2025-09-30',
      'ÚLTIMO',
      '2025-07-01',
    );
    expect(encontrada?.VL_CONTA).toBe('14671000');
  });

  it('aceita qualquer descrição da lista — bancos e industriais usam textos diferentes', () => {
    const bancoStyle = linha({
      CD_CONTA: '3.09',
      DS_CONTA: 'Lucro/Prejuízo do Período',
      ST_CONTA_FIXA: 'S',
      VL_CONTA: '500',
    });
    expect(
      buscarContaPorDescricao([bancoStyle], descricoes, '2025-09-30', 'ÚLTIMO', '2025-07-01')
        ?.VL_CONTA,
    ).toBe('500');
  });
});

describe('agruparPorEmpresa', () => {
  it('agrupa as linhas pelo CD_CVM', () => {
    const vale1 = linha({ CD_CVM: '004170', CD_CONTA: '3.01' });
    const vale2 = linha({ CD_CVM: '004170', CD_CONTA: '3.03' });
    const outra = linha({ CD_CVM: '019348', CD_CONTA: '3.01' });

    const agrupado = agruparPorEmpresa([vale1, vale2, outra]);

    expect(agrupado.get('004170')).toEqual([vale1, vale2]);
    expect(agrupado.get('019348')).toEqual([outra]);
  });
});

describe('demonstrativosDaEmpresa', () => {
  function anoVazio() {
    return {
      bpaCon: new Map<string, LinhaCvm[]>(),
      bpaInd: new Map<string, LinhaCvm[]>(),
      bppCon: new Map<string, LinhaCvm[]>(),
      bppInd: new Map<string, LinhaCvm[]>(),
      dreCon: new Map<string, LinhaCvm[]>(),
      dreInd: new Map<string, LinhaCvm[]>(),
      dfcCon: new Map<string, LinhaCvm[]>(),
      dfcInd: new Map<string, LinhaCvm[]>(),
    };
  }

  it('usa o demonstrativo consolidado quando existe', () => {
    const ano = anoVazio();
    ano.dreCon.set('004170', [linha({ CD_CVM: '004170' })]);

    const resultado = demonstrativosDaEmpresa(ano, '004170');
    expect(resultado?.dre).toHaveLength(1);
  });

  it('cai pro individual quando não há consolidado — caso Sendas/Assaí', () => {
    const ano = anoVazio();
    ano.dreInd.set('019348', [linha({ CD_CVM: '019348' })]);

    const resultado = demonstrativosDaEmpresa(ano, '019348');
    expect(resultado?.dre).toHaveLength(1);
  });

  it('devolve undefined quando a empresa não tem nenhum dos dois', () => {
    expect(demonstrativosDaEmpresa(anoVazio(), '000000')).toBeUndefined();
  });
});
