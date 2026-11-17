import { describe, expect, it } from 'vitest';
import { parseAnswer } from './citation';

describe('parseAnswer', () => {
  it('sem bloco de fontes, devolve o texto inteiro como body e nenhuma citação', () => {
    const resultado = parseAnswer('Não encontrei dados suficientes.');
    expect(resultado).toEqual({ body: 'Não encontrei dados suficientes.', citations: [] });
  });

  it('separa o corpo do bloco de fontes e extrai ticker, período e data-base', () => {
    const texto =
      'A receita líquida da Vale no 3T25 foi de R$ 56,7 bilhões.\n\n' +
      'Fontes:\n' +
      '- VALE (3T25, data-base 2025-09-30): https://dados.cvm.gov.br/exemplo\n' +
      '- VALE (4T25, data-base 2025-12-31): https://dados.cvm.gov.br/outro';

    const resultado = parseAnswer(texto);

    expect(resultado.body).toBe('A receita líquida da Vale no 3T25 foi de R$ 56,7 bilhões.');
    expect(resultado.citations).toEqual([
      {
        label: 'VALE (3T25)',
        periodEnd: '2025-09-30',
        origem: 'Base local (CVM)',
        sourceUrl: 'https://dados.cvm.gov.br/exemplo',
      },
      {
        label: 'VALE (4T25)',
        periodEnd: '2025-12-31',
        origem: 'Base local (CVM)',
        sourceUrl: 'https://dados.cvm.gov.br/outro',
      },
    ]);
  });

  it('fonte web (sem período) vira citação com a origem inferida do hostname', () => {
    const texto =
      'A Petrobras anunciou um fato relevante.\n\n' +
      'Fontes:\n' +
      '- Release de resultados do 2T25: https://ri.petrobras.com.br/releases/2t25';

    const resultado = parseAnswer(texto);

    expect(resultado.citations).toEqual([
      {
        label: 'Release de resultados do 2T25',
        origem: 'ri.petrobras.com.br',
        sourceUrl: 'https://ri.petrobras.com.br/releases/2t25',
      },
    ]);
  });

  it('preserva o aviso de contexto incompleto no corpo, antes das fontes', () => {
    const texto =
      'Resposta parcial.\n\n' +
      '_O contexto disponível pode estar incompleto para responder com certeza._\n\n' +
      'Fontes:\n' +
      '- VALE (3T25, data-base 2025-09-30): https://dados.cvm.gov.br/exemplo';

    const resultado = parseAnswer(texto);

    expect(resultado.body).toContain('contexto disponível pode estar incompleto');
    expect(resultado.citations).toHaveLength(1);
  });
});
