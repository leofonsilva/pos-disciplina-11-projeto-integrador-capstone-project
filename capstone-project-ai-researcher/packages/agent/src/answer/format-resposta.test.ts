import { describe, expect, it } from 'vitest';

import type { RetrievedDoc } from '../db/retrieve-similar.js';
import {
  contemLinguagemRecomendatoria,
  formatarCitacoes,
  montarResposta,
} from './format-resposta.js';

const docCorpus: RetrievedDoc = {
  id: '1',
  ticker: 'VALE',
  companyName: 'Vale S.A.',
  setor: 'Mineração',
  period: '3T25',
  periodEnd: '2025-09-30',
  paragraph: 'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
  sourceUrl: 'https://dados.cvm.gov.br/vale',
  fetchedAt: new Date('2026-08-08T00:00:00.000Z'),
  distance: 0.05,
};

const docWeb: RetrievedDoc = {
  id: '2',
  title: 'Vale anuncia novo projeto',
  paragraph: 'A Vale anunciou hoje um novo projeto de expansão em Carajás.',
  sourceUrl: 'https://noticias.example.com/vale-projeto',
  fetchedAt: new Date('2026-08-09T00:00:00.000Z'),
  distance: 0.2,
};

// Guardrail obrigatório (CLAUDE.md, seção de domínio): "devo comprar X?" nunca pode voltar
// com linguagem recomendatória. Este teste não pode ser removido — se quebrar, o problema
// é o comportamento do nó, não o teste.
describe('contemLinguagemRecomendatoria', () => {
  it.each([
    'Recomendo comprar essa ação agora.',
    'Sugiro vender a posição antes do fechamento.',
    'Aconselho manter a posição por enquanto.',
    'Vale a pena comprar VALE3 nesse patamar.',
    'É um bom momento para comprar mais ações.',
  ])('detecta linguagem recomendatória em: "%s"', (texto) => {
    expect(contemLinguagemRecomendatoria(texto)).toBe(true);
  });

  it.each([
    'A receita de vendas cresceu 10% no trimestre.',
    'No 3T25, a Vale S.A. reportou receita líquida de R$ 56,7 bilhões.',
    'A empresa mantém sua política de dividendos inalterada.',
  ])('não dispara em frase legítima do domínio financeiro: "%s"', (texto) => {
    expect(contemLinguagemRecomendatoria(texto)).toBe(false);
  });
});

describe('formatarCitacoes', () => {
  it('cita ticker, período e data-base pra documento do corpus', () => {
    expect(formatarCitacoes([docCorpus])).toBe(
      '- VALE (3T25, data-base 2025-09-30): https://dados.cvm.gov.br/vale',
    );
  });

  it('cita o título pra documento web', () => {
    expect(formatarCitacoes([docWeb])).toBe(
      '- Vale anuncia novo projeto: https://noticias.example.com/vale-projeto',
    );
  });

  it('deduplica documentos com a mesma sourceUrl — vários chunks da mesma página, uma citação', () => {
    const outroChunkDaMesmaPagina = { ...docWeb, id: '3', paragraph: 'outro trecho' };

    expect(formatarCitacoes([docWeb, outroChunkDaMesmaPagina])).toBe(
      '- Vale anuncia novo projeto: https://noticias.example.com/vale-projeto',
    );
  });
});

describe('montarResposta', () => {
  it('substitui a resposta pelo aviso de guardrail quando o LLM recomenda, mas mantém as citações', () => {
    const resposta = montarResposta('Recomendo comprar VALE3 agora.', [docCorpus], true);

    expect(resposta).not.toMatch(/recomendo|compre/i);
    expect(resposta).toMatch(/não recomendamos/i);
    expect(resposta).toContain('https://dados.cvm.gov.br/vale');
  });

  it('mantém a resposta do LLM quando não há linguagem recomendatória', () => {
    const resposta = montarResposta('A receita foi de R$ 56,7 bilhões.', [docCorpus], true);

    expect(resposta).toContain('A receita foi de R$ 56,7 bilhões.');
  });

  it('acrescenta aviso de contexto incompleto quando sufficient é false', () => {
    const resposta = montarResposta('Resposta parcial.', [docCorpus], false);

    expect(resposta).toContain('incompleto');
  });

  it('não acrescenta aviso de contexto incompleto quando sufficient é true', () => {
    const resposta = montarResposta('Resposta completa.', [docCorpus], true);

    expect(resposta).not.toContain('incompleto');
  });
});
