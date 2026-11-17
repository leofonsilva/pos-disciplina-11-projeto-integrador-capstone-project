import { describe, expect, it, vi } from 'vitest';

import { CircuitoAbertoError, comResiliencia } from './resilient-search-provider.js';
import type { SearchProvider, SearchResult } from './types.js';

const resultadoOk: SearchResult[] = [{ title: 't', snippet: 's', url: 'https://x.com' }];

function fakeEsperar() {
  const chamadas: number[] = [];
  return { esperar: async (ms: number) => void chamadas.push(ms), chamadas };
}

function fakeRelogio(inicial = 0) {
  let atual = inicial;
  return { agora: () => atual, avancar: (ms: number) => (atual += ms) };
}

describe('comResiliencia', () => {
  it('uma falha isolada não propaga — o retry recupera na tentativa seguinte', async () => {
    const search = vi
      .fn<SearchProvider['search']>()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(resultadoOk);
    const { esperar, chamadas } = fakeEsperar();

    const provider = comResiliencia({ search }, { esperar });
    const resultado = await provider.search('x');

    expect(resultado).toEqual(resultadoOk);
    expect(search).toHaveBeenCalledTimes(2);
    expect(chamadas).toEqual([200]); // um backoff, antes da segunda tentativa
  });

  it('espera em backoff exponencial entre tentativas', async () => {
    const search = vi.fn<SearchProvider['search']>().mockRejectedValue(new Error('fora do ar'));
    const { esperar, chamadas } = fakeEsperar();

    const provider = comResiliencia({ search }, { esperar, maxTentativas: 3 });
    await expect(provider.search('x')).rejects.toThrow('fora do ar');

    expect(chamadas).toEqual([200, 400]); // dobra a cada tentativa, uma espera a menos que tentativas
  });

  it('esgota as tentativas e propaga o último erro quando a falha persiste', async () => {
    const search = vi
      .fn<SearchProvider['search']>()
      .mockRejectedValueOnce(new Error('erro 1'))
      .mockRejectedValueOnce(new Error('erro 2'))
      .mockRejectedValueOnce(new Error('erro final'));
    const { esperar } = fakeEsperar();

    const provider = comResiliencia({ search }, { esperar, maxTentativas: 3 });

    await expect(provider.search('x')).rejects.toThrow('erro final');
    expect(search).toHaveBeenCalledTimes(3);
  });

  it('abre o circuito após falhas consecutivas suficientes — falha rápido, sem chamar o provider', async () => {
    const search = vi.fn<SearchProvider['search']>().mockRejectedValue(new Error('fora do ar'));
    const { esperar } = fakeEsperar();
    const { agora } = fakeRelogio();

    const provider = comResiliencia(
      { search },
      { esperar, agora, maxTentativas: 1, limiarCircuito: 2 },
    );

    await expect(provider.search('x')).rejects.toThrow('fora do ar'); // falha 1
    await expect(provider.search('x')).rejects.toThrow('fora do ar'); // falha 2 — abre o circuito
    expect(search).toHaveBeenCalledTimes(2);

    await expect(provider.search('x')).rejects.toThrow(CircuitoAbertoError); // circuito aberto
    expect(search).toHaveBeenCalledTimes(2); // não chamou o provider de novo
  });

  it('fecha o circuito depois do tempo de resfriamento e volta a tentar', async () => {
    const search = vi
      .fn<SearchProvider['search']>()
      .mockRejectedValueOnce(new Error('falha 1'))
      .mockRejectedValueOnce(new Error('falha 2'))
      .mockResolvedValueOnce(resultadoOk);
    const { esperar } = fakeEsperar();
    const { agora, avancar } = fakeRelogio();

    const provider = comResiliencia(
      { search },
      { esperar, agora, maxTentativas: 1, limiarCircuito: 2, tempoResfriamentoMs: 30_000 },
    );

    await expect(provider.search('x')).rejects.toThrow('falha 1');
    await expect(provider.search('x')).rejects.toThrow('falha 2'); // abre o circuito

    avancar(29_999);
    await expect(provider.search('x')).rejects.toThrow(CircuitoAbertoError); // ainda dentro do resfriamento

    avancar(2); // passa dos 30_000ms
    const resultado = await provider.search('x');
    expect(resultado).toEqual(resultadoOk);
    expect(search).toHaveBeenCalledTimes(3);
  });

  it('sucesso reseta o contador de falhas consecutivas', async () => {
    const search = vi
      .fn<SearchProvider['search']>()
      .mockRejectedValueOnce(new Error('falha 1'))
      .mockResolvedValueOnce(resultadoOk)
      .mockRejectedValueOnce(new Error('falha 2'))
      .mockRejectedValueOnce(new Error('falha 3'));
    const { esperar } = fakeEsperar();
    const { agora } = fakeRelogio();

    const provider = comResiliencia(
      { search },
      { esperar, agora, maxTentativas: 1, limiarCircuito: 2 },
    );

    await expect(provider.search('x')).rejects.toThrow('falha 1'); // 1 falha consecutiva
    await expect(provider.search('x')).resolves.toEqual(resultadoOk); // reseta pra 0

    // as próximas duas falhas partem do zero — só a segunda abre o circuito
    await expect(provider.search('x')).rejects.toThrow('falha 2'); // 1 falha consecutiva
    await expect(provider.search('x')).rejects.toThrow('falha 3'); // 2 falhas — abre o circuito
    await expect(provider.search('x')).rejects.toThrow(CircuitoAbertoError);
  });

  it('usa defaults sensatos quando nenhuma opção é passada', async () => {
    const search = vi.fn<SearchProvider['search']>().mockResolvedValue(resultadoOk);
    const provider = comResiliencia({ search });

    await expect(provider.search('x')).resolves.toEqual(resultadoOk);
  });
});
